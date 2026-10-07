import "./environment";
import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { mock } from "node:test";
import jwt from "jsonwebtoken";
import { Prisma, Role, ShipmentStatus } from "@prisma/client";
import type { Request, Response } from "express";
import auth from "../src/app/middlewares/auth";
import validateRequest from "../src/app/middlewares/validateRequest";
import { csrfProtection } from "../src/app/middlewares/csrf";
import { prisma } from "../src/app/utils/prisma";
import { redisClient } from "../src/app/utils/redis";
import { listQuerySchema } from "../src/app/utils/query";
import { buildSessionTokens, rotateSession, safeUser } from "../src/app/utils/session";
import { UserValidation } from "../src/app/modules/user/user.validation";
import { ShipmentValidation } from "../src/app/modules/shipment/shipment.validation";
import { ALLOWED_TRANSITIONS, ACTIVE_SHIPMENT_STATUSES, nextShipmentStatuses } from "../src/app/modules/shipment/shipment.rules";
import { assertBkashPayment, assertStripePayment } from "../src/app/modules/payment/payment.gateway";
import { AuthService } from "../src/app/modules/auth/auth.service";
import { stripeWebhook } from "../src/app/modules/payment/payment.webhook";

const originalFindUser = prisma.user.findUnique;
afterEach(() => { mock.restoreAll(); prisma.user.findUnique = originalFindUser; });
const user = {
  id: "11111111-1111-4111-8111-111111111111", email: "customer@example.test", name: "Customer", role: Role.CUSTOMER,
  status: "ACTIVE", emailVerified: true, isDeleted: false, tokenVersion: 0, password: "secret-hash",
  googleId: "private-google-id", imagePublicId: "private-image-id",
} as any;

test("profile validation rejects role escalation", () => {
  assert.throws(() => UserValidation.UpdateProfileSchema.parse({ body: { name: "Customer", role: "ADMIN" } }));
});

test("shipment input cannot inject sender, price, status or nested writes", () => {
  assert.throws(() => ShipmentValidation.CreateShipmentSchema.parse({ body: {
    receiverName: "Receiver", receiverPhone: "01712345678", receiverAddress: "Dhaka address", weight: 1,
    senderId: "someone-else", price: 0, status: "DELIVERED", payment: { create: { status: "PAID" } },
  } }));
});

test("request validation replaces untrusted input with parsed output", async () => {
  const { z } = await import("zod");
  const req = { body: { name: "Customer", role: "ADMIN" } } as Request;
  let error: unknown;
  await validateRequest(z.object({ body: z.object({ name: z.string() }) }))(req, {} as Response, value => { error = value; });
  assert.equal(error, undefined);
  assert.deepEqual(req.body, { name: "Customer" });
});

test("current database role defeats a stale administrator token", async () => {
  prisma.user.findUnique = (async () => user) as typeof prisma.user.findUnique;
  mock.method(redisClient, "exists", async () => 1);
  const token = jwt.sign({ userId: user.id, role: "ADMIN", sessionId: "session", tokenVersion: 0 }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
  let error: any;
  await auth("ADMIN")({ cookies: { accessToken: token }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 403);
});

test("password reset version rejects old access tokens", async () => {
  prisma.user.findUnique = (async () => ({ ...user, tokenVersion: 1 })) as typeof prisma.user.findUnique;
  const token = buildSessionTokens(user).accessToken;
  let error: any;
  await auth("CUSTOMER")({ cookies: { accessToken: token }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 401);
});

test("an expired token returns an authentication error", async () => {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -1 });
  let error: any;
  await auth("CUSTOMER")({ cookies: { accessToken: token }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.name, "TokenExpiredError");
});

test("refresh tokens rotate atomically and a replay is rejected", async () => {
  let used = false;
  mock.method(redisClient, "eval", async () => { if (used) return 0; used = true; return 1; });
  const tokens = buildSessionTokens(user);
  const result = await rotateSession(user, tokens.refreshToken, tokens.sessionId);
  assert.notEqual(result.refreshToken, tokens.refreshToken);
  await assert.rejects(() => rotateSession(user, tokens.refreshToken, tokens.sessionId), (error: any) => error.statusCode === 401);
});

test("missing refresh cookies cannot create a session", async () => {
  await assert.rejects(() => AuthService.refreshToken(undefined), (error: any) => error.statusCode === 401);
});

test("safe user output removes authentication and storage secrets", () => {
  const output = safeUser(user) as Record<string, unknown>;
  for (const key of ["password", "tokenVersion", "googleId", "imagePublicId"]) assert.equal(key in output, false);
});

test("cookie writes reject cross-origin requests and missing verification headers", () => {
  const req = { method: "PATCH", headers: { origin: "https://attacker.test" }, cookies: { accessToken: "token" }, get: () => undefined } as unknown as Request;
  let error: any;
  csrfProtection(req, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 403);
  req.headers.origin = "http://localhost:3000";
  csrfProtection(req, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 403);
});

test("pagination rejects unbounded and invalid values", () => {
  for (const query of [{ limit: 100000 }, { page: -1 }, { page: "abc" }, { sortOrder: "sideways" }]) assert.throws(() => listQuerySchema.parse(query));
  assert.equal(listQuerySchema.parse({}).limit, 10);
});

test("shipment transitions never skip a hub and terminal states cannot change", () => {
  assert.deepEqual(ALLOWED_TRANSITIONS.PICKED_UP, [ShipmentStatus.AT_ORIGIN_HUB]);
  assert.deepEqual(ALLOWED_TRANSITIONS.IN_TRANSIT, [ShipmentStatus.AT_DESTINATION_HUB]);
  for (const status of ["DELIVERED", "RETURNED", "CANCELLED"] as ShipmentStatus[]) assert.deepEqual(ALLOWED_TRANSITIONS[status], []);
  assert.equal(nextShipmentStatuses(ShipmentStatus.ASSIGNED, "COURIER").includes(ShipmentStatus.CANCELLED), false);
  assert.equal(ACTIVE_SHIPMENT_STATUSES.includes(ShipmentStatus.IN_TRANSIT), true);
});

const expected = { transactionId: "provider-session", amount: new Prisma.Decimal("120.00"), currency: "BDT", paymentId: "payment" };
const bkash = { statusCode: "0000", transactionStatus: "Completed", paymentID: "provider-session", currency: "BDT", trxID: "verified-transaction", amount: "120.00" };

test("bKash rejects incomplete success, wrong amount, currency and transaction", () => {
  assert.doesNotThrow(() => assertBkashPayment(bkash, expected));
  for (const change of [{ statusCode: undefined }, { amount: "1" }, { currency: "USD" }, { paymentID: "other" }, { transactionStatus: "Pending" }, { trxID: "" }]) {
    assert.throws(() => assertBkashPayment({ ...bkash, ...change }, expected));
  }
});

test("Stripe requires paid status, matching metadata, amount and currency", () => {
  const session = { id: "provider-session", metadata: { shipmentId: "shipment", attemptId: "attempt" }, mode: "payment", payment_status: "paid", currency: "bdt", amount_total: 12000 } as any;
  assert.doesNotThrow(() => assertStripePayment(session, expected, "shipment", "attempt"));
  for (const change of [{ payment_status: "unpaid" }, { amount_total: 1 }, { currency: "usd" }, { metadata: { shipmentId: "other", attemptId: "attempt" } }]) {
    assert.throws(() => assertStripePayment({ ...session, ...change }, expected, "shipment", "attempt"));
  }
});

test("unsigned Stripe webhooks never reach payment confirmation", async () => {
  let error: any;
  await stripeWebhook({ get: () => undefined, body: Buffer.from("{}") } as unknown as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 400);
});

test("logout revokes its session and the old access token is rejected", async () => {
  const tokens = buildSessionTokens(user);
  let revokedKey = "";
  mock.method(redisClient, "del", async (key: string) => { revokedKey = key; return 1; });
  await AuthService.logoutUser(tokens.refreshToken);
  assert.equal(revokedKey, "session:" + tokens.sessionId);
  prisma.user.findUnique = (async () => user) as typeof prisma.user.findUnique;
  mock.method(redisClient, "exists", async () => 0);
  let error: any;
  await auth("CUSTOMER")({ cookies: { accessToken: tokens.accessToken }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 401);
});
