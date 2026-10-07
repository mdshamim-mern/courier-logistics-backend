import "./environment";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { PaymentGateway, Role } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "../../src/app/utils/prisma";
import { connectRedis, redisClient } from "../../src/app/utils/redis";
import { createSession, rotateSession, revokeSession } from "../../src/app/utils/session";
import { ShipmentService } from "../../src/app/modules/shipment/shipment.service";
import { UserService } from "../../src/app/modules/user/user.service";
import { PaymentService } from "../../src/app/modules/payment/payment.service";

const userIds: string[] = [];
const hubIds: string[] = [];
const shipmentIds: string[] = [];
before(async () => { await prisma.$connect(); await connectRedis(); });
after(async () => {
  await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ entityId: { in: shipmentIds } }, { userId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.hub.deleteMany({ where: { id: { in: hubIds } } });
  await prisma.$disconnect();
  if (redisClient.isOpen) await redisClient.quit();
});

async function fixtures() {
  const suffix = randomUUID();
  const sender = await prisma.user.create({ data: { name: "Integration Customer", email: suffix + "@integration.test", role: Role.CUSTOMER, emailVerified: true, customer: { create: {} } } });
  userIds.push(sender.id);
  const admin = await prisma.user.create({ data: { name: "Integration Admin", email: "admin-" + suffix + "@integration.test", role: Role.ADMIN, emailVerified: true } });
  userIds.push(admin.id);
  const hub = await prisma.hub.create({ data: { name: "Integration-" + suffix, location: "Dhaka", address: "Integration address" } });
  hubIds.push(hub.id);
  const destination = await prisma.hub.create({ data: { name: "Destination-" + suffix, location: "Savar", address: "Integration address" } });
  hubIds.push(destination.id);
  const couriers = [];
  for (const number of [1, 2]) {
    const courier = await prisma.user.create({ data: { name: "Integration Courier", email: "courier-" + number + "-" + suffix + "@integration.test", role: Role.COURIER, emailVerified: true, courier: { create: { contactNumber: "01712345678", currentHubId: hub.id } } } });
    userIds.push(courier.id);
    couriers.push(courier);
  }
  const shipment = await ShipmentService.createShipment(sender.id, {
    receiverName: "Receiver", receiverPhone: "01712345678", receiverAddress: "Integration destination",
    weight: 1, originHubId: hub.id, destinationHubId: destination.id,
  });
  shipmentIds.push(shipment.id);
  return { sender, admin, couriers, shipment };
}

test("concurrent courier assignment succeeds once and records one tracking event", async () => {
  const { admin, couriers, shipment } = await fixtures();
  const results = await Promise.allSettled(couriers.map(courier => ShipmentService.assignCourier(shipment.id, courier.id, admin.id)));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(await prisma.shipmentTracking.count({ where: { shipmentId: shipment.id, status: "ASSIGNED" } }), 1);
});

test("concurrent status changes cannot append duplicate tracking events", async () => {
  const { admin, couriers, shipment } = await fixtures();
  await ShipmentService.assignCourier(shipment.id, couriers[0].id, admin.id);
  const results = await Promise.allSettled([1, 2].map(() => ShipmentService.updateShipmentStatus(shipment.id, "PICKED_UP", couriers[0].id, "COURIER")));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(await prisma.shipmentTracking.count({ where: { shipmentId: shipment.id, status: "PICKED_UP" } }), 1);
});

test("profile address and phone update together without changing role", async () => {
  const { sender } = await fixtures();
  const result = await UserService.updateMyProfile(sender.id, { name: "Updated Customer", address: "Updated integration address", contactNumber: "01812345678" });
  assert.equal(result.role, "CUSTOMER");
  assert.equal(result.customer?.address, "Updated integration address");
  assert.equal(result.customer?.contactNumber, result.contactNumber);
});

test("verified repeated Stripe events record money and audit once", async () => {
  const { shipment } = await fixtures();
  const payment = await prisma.payment.create({ data: { shipmentId: shipment.id, amount: shipment.price, paymentGateway: PaymentGateway.STRIPE } });
  const reference = "cs_test_" + randomUUID();
  const attempt = await prisma.paymentAttempt.create({ data: { paymentId: payment.id, paymentGateway: PaymentGateway.STRIPE, amount: payment.amount, transactionId: reference } });
  const event = {
    id: "evt_" + randomUUID(), type: "checkout.session.completed",
    data: { object: { id: reference, mode: "payment", payment_status: "paid", currency: "bdt", amount_total: 12000,
      payment_intent: "pi_" + randomUUID(), metadata: { shipmentId: shipment.id, attemptId: attempt.id } } },
  } as unknown as Stripe.Event;
  await Promise.all([PaymentService.handleStripeEvent(event), PaymentService.handleStripeEvent(event)]);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "PAID");
  assert.equal(await prisma.auditLog.count({ where: { entityId: shipment.id, action: "PAYMENT_SUCCESS" } }), 1);
  const expired = { ...event, type: "checkout.session.expired" } as Stripe.Event;
  await PaymentService.handleStripeEvent(expired);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "PAID");
});

test("Redis refresh rotation allows exactly one concurrent use", async () => {
  const { sender } = await fixtures();
  const tokens = await createSession(sender);
  try {
    const results = await Promise.allSettled([1, 2].map(() => rotateSession(sender, tokens.refreshToken, tokens.sessionId)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  } finally {
    await revokeSession(tokens.sessionId);
  }
});

test("pending payment attempts prevent cancellation", async () => {
  const { sender, shipment } = await fixtures();
  const payment = await prisma.payment.create({ data: { shipmentId: shipment.id, amount: shipment.price } });
  await prisma.paymentAttempt.create({ data: { paymentId: payment.id, amount: shipment.price, paymentGateway: PaymentGateway.BKASH } });
  await assert.rejects(() => ShipmentService.cancelShipment(shipment.id, sender.id), (error: any) => error.statusCode === 409);
  assert.equal((await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status, "PENDING");
});

test("payment reconciliation rejects a different customer", async () => {
  const { admin, shipment } = await fixtures();
  await assert.rejects(() => PaymentService.reconcilePayment(shipment.id, admin.id), (error: any) => error.statusCode === 403);
});

test("shipment summary counts every matching shipment without a page limit", async () => {
  const { sender, shipment } = await fixtures();
  const extra = Array.from({ length: 104 }, () => ({ id: randomUUID(), trackingId: "TRK-" + randomUUID(), senderId: sender.id,
    receiverName: "Receiver", receiverPhone: "01712345678", receiverAddress: "Integration address", weight: 1, price: 120 }));
  shipmentIds.push(...extra.map(item => item.id));
  await prisma.shipment.createMany({ data: extra });
  await prisma.shipment.update({ where: { id: shipment.id }, data: { status: "DELIVERED" } });
  const summary = await ShipmentService.getShipmentSummary({ userId: sender.id, role: "CUSTOMER" });
  assert.deepEqual(summary, { totalShipments: 105, activeShipments: 104, deliveredShipments: 1 });
});
