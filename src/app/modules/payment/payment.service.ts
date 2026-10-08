import { PaymentGateway, PaymentStatus, type Prisma } from "@prisma/client";
import Stripe from "stripe";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../utils/prisma";
import { lockShipment } from "../../utils/rowLocks";
import { listQuerySchema } from "../../utils/query";
import { redisClient } from "../../utils/redis";
import { assertBkashPayment, assertStripePayment } from "./payment.gateway";

let stripe: Stripe | undefined;
export const getStripe = () => {
  if (!config.stripe_secret_key) throw new AppError(503, "Stripe is not configured");
  if (!stripe) stripe = new Stripe(config.stripe_secret_key);
  return stripe;
};
const paymentSelect = {
  id: true, shipmentId: true, amount: true, currency: true, paymentGateway: true, transactionId: true,
  status: true, paidAt: true, createdAt: true, updatedAt: true,
} as const;
type Actor = { userId: string; role: string };
const redirect = (outcome: "success" | "failure" | "cancel", shipmentId: string) => ({
  redirectUrl: `${config.frontend_url}/payment/${outcome}?shipmentId=${encodeURIComponent(shipmentId)}`,
});

async function bkashRequest(path: string, body: Record<string, unknown>, grant = false): Promise<Record<string, unknown>> {
  if (!config.bkash_base_url || !config.bkash_app_key || !config.bkash_app_secret || !config.bkash_username || !config.bkash_password) {
    throw new AppError(503, "bKash is not configured");
  }
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (grant) {
    headers.username = config.bkash_username;
    headers.password = config.bkash_password;
  } else {
    headers.Authorization = await getBkashToken();
    headers["X-App-Key"] = config.bkash_app_key;
  }
  const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/${path}`, {
    method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new AppError(502, "bKash is temporarily unavailable");
  return await response.json() as Record<string, unknown>;
}

const getBkashToken = async (): Promise<string> => {
  const key = "bkash:token";
  const cached = await redisClient.get(key);
  if (cached) return cached;
  const result = await bkashRequest("token/grant", { app_key: config.bkash_app_key, app_secret: config.bkash_app_secret }, true);
  if (result.statusCode !== "0000" || typeof result.id_token !== "string") throw new AppError(502, "Unable to authenticate with bKash");
  const ttl = Math.max(1, Math.min(Number(result.expires_in) || 3600, 3600) - 60);
  await redisClient.setEx(key, ttl, result.id_token);
  return result.id_token;
};

const prepareAttempt = async (shipmentId: string, userId: string, gateway: PaymentGateway) => prisma.$transaction(async tx => {
  await lockShipment(tx, shipmentId);
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, include: { sender: { select: { email: true } } } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.senderId !== userId) throw new AppError(403, "Unauthorized shipment");
  if (["CANCELLED", "RETURNED"].includes(shipment.status)) throw new AppError(409, "This shipment cannot accept payment");
  const payment = await tx.payment.upsert({
    where: { shipmentId },
    create: { shipmentId, amount: shipment.price, currency: "BDT", paymentGateway: gateway },
    update: {},
  });
  if (["PAID", "REFUNDED"].includes(payment.status)) throw new AppError(409, "Shipment payment is already settled");
  const pending = await tx.paymentAttempt.findFirst({ where: { paymentId: payment.id, status: PaymentStatus.UNPAID }, orderBy: { createdAt: "desc" } });
  if (pending) {
    if (pending.paymentGateway === gateway && pending.checkoutUrl && Date.now() - pending.createdAt.getTime() < 30 * 60 * 1000) {
      return { shipment, payment, attempt: pending, reused: true };
    }
    throw new AppError(409, "A payment attempt is pending verification. Check payment status before trying again");
  }
  const attempt = await tx.paymentAttempt.create({ data: { paymentId: payment.id, amount: shipment.price, currency: "BDT", paymentGateway: gateway } });
  return { shipment, payment, attempt, reused: false };
});

const completeAttempt = async (attemptId: string, providerTransactionId: string, summary: Prisma.InputJsonObject) => prisma.$transaction(async tx => {
  const lookup = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { payment: true } });
  if (!lookup) throw new AppError(404, "Payment attempt not found");
  await lockShipment(tx, lookup.payment.shipmentId);
  const attempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { payment: true } });
  if (attempt.status === PaymentStatus.PAID) return attempt.payment;
  const paidAt = new Date();
  const claimed = await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: PaymentStatus.PAID } }, data: { status: PaymentStatus.PAID, providerTransactionId, paidAt, gatewayResponse: summary } });
  if (claimed.count === 0) return tx.payment.findUniqueOrThrow({ where: { id: attempt.paymentId } });
  if (attempt.payment.status === PaymentStatus.PAID || attempt.payment.status === PaymentStatus.REFUNDED) {
    await tx.auditLog.create({ data: { action: "PAYMENT_REQUIRES_REVIEW", entityId: attempt.payment.shipmentId, entityType: "SHIPMENT", details: { attemptId, providerTransactionId, reason: "additional_payment" } } });
    return attempt.payment;
  }
  const payment = await tx.payment.update({ where: { id: attempt.paymentId }, data: {
    status: PaymentStatus.PAID, amount: attempt.amount, currency: attempt.currency,
    paymentGateway: attempt.paymentGateway, transactionId: attempt.transactionId, paidAt, gatewayResponse: summary,
  } });
  const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: payment.shipmentId } });
  await tx.auditLog.create({ data: {
    action: shipment.status === "CANCELLED" ? "PAYMENT_REQUIRES_REVIEW" : "PAYMENT_SUCCESS",
    entityId: payment.shipmentId, entityType: "SHIPMENT", details: { attemptId, providerTransactionId, amount: attempt.amount.toString() },
  } });
  return payment;
});

const failAttempt = async (attemptId: string, status: "FAILED" | "CANCELLED") => prisma.$transaction(async tx => {
  const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { payment: true } });
  if (!attempt) throw new AppError(404, "Payment attempt not found");
  await lockShipment(tx, attempt.payment.shipmentId);
  const changed = await tx.paymentAttempt.updateMany({ where: { id: attemptId, status: { not: PaymentStatus.PAID } }, data: { status } });
  if (changed.count) {
    await tx.payment.updateMany({ where: { id: attempt.paymentId, status: { notIn: [PaymentStatus.PAID, PaymentStatus.REFUNDED] } }, data: { status } });
  }
});

const initiatePayment = async (shipmentId: string, userId: string) => {
  if (!config.bkash_callback_url) throw new AppError(503, "bKash callback URL is not configured");
  const { shipment, attempt, reused } = await prepareAttempt(shipmentId, userId, PaymentGateway.BKASH);
  if (reused) return { paymentUrl: attempt.checkoutUrl, shipmentId };
  const result = await bkashRequest("create", {
    mode: "0011", payerReference: shipment.sender.email, callbackURL: config.bkash_callback_url,
    amount: attempt.amount.toFixed(2), currency: "BDT", intent: "sale", merchantInvoiceNumber: attempt.id,
  });
  if (result.statusCode !== "0000" || typeof result.paymentID !== "string" || typeof result.bkashURL !== "string") {
    if (typeof result.statusCode === "string" && result.statusCode !== "0000") await failAttempt(attempt.id, "FAILED");
    throw new AppError(502, "Unable to initiate bKash payment");
  }
  const checkout = new URL(result.bkashURL);
  if (checkout.protocol !== "https:" || !(checkout.hostname.endsWith(".bka.sh") || checkout.hostname.endsWith(".bkash.com"))) throw new AppError(502, "Unexpected bKash checkout address");
  await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { transactionId: result.paymentID, checkoutUrl: result.bkashURL } });
  return { paymentUrl: result.bkashURL, shipmentId };
};

const executePayment = async (paymentID: string, status: string) => {
  const attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: paymentID }, include: { payment: true } });
  if (!attempt || attempt.paymentGateway !== PaymentGateway.BKASH) throw new AppError(404, "Payment attempt not found");
  if (attempt.status === PaymentStatus.PAID) return redirect("success", attempt.payment.shipmentId);
  let result: Record<string, unknown>;
  if (status === "success") {
    try { result = await bkashRequest("execute", { paymentID }); }
    catch { result = await bkashRequest("payment/status", { paymentID }); }
    if (result.statusCode !== "0000" || result.transactionStatus !== "Completed") result = await bkashRequest("payment/status", { paymentID });
  } else {
    result = await bkashRequest("payment/status", { paymentID });
  }
  if (result.transactionStatus === "Completed") {
    assertBkashPayment(result, attempt);
    await completeAttempt(attempt.id, result.trxID as string, { paymentID, transactionId: result.trxID as string, amount: String(result.amount), currency: "BDT" });
    return redirect("success", attempt.payment.shipmentId);
  }
  if (result.statusCode === "0000" && result.paymentID === paymentID && ["Cancelled", "Failed"].includes(String(result.transactionStatus))) {
    const failedStatus = result.transactionStatus === "Cancelled" ? "CANCELLED" : "FAILED";
    await failAttempt(attempt.id, failedStatus);
    return redirect(failedStatus === "CANCELLED" ? "cancel" : "failure", attempt.payment.shipmentId);
  }
  throw new AppError(409, "Payment is awaiting provider verification");
};

const initiateStripePayment = async (shipmentId: string, userId: string) => {
  const client = getStripe();
  if (!config.stripe_webhook_secret) throw new AppError(503, "Stripe webhook is not configured");
  const { shipment, attempt, reused } = await prepareAttempt(shipmentId, userId, PaymentGateway.STRIPE);
  if (reused) return { paymentUrl: attempt.checkoutUrl, shipmentId };
  const session = await client.checkout.sessions.create({
    line_items: [{ price_data: {
      currency: "bdt", product_data: { name: `Shipment ${shipment.trackingId}` },
      unit_amount: attempt.amount.mul(100).toNumber(),
    }, quantity: 1 }],
    mode: "payment", expires_at: Math.floor(attempt.createdAt.getTime() / 1000) + 30 * 60,
    success_url: `${config.frontend_url}/payment/success?shipmentId=${shipmentId}`,
    cancel_url: `${config.frontend_url}/payment/cancel?shipmentId=${shipmentId}`,
    customer_email: shipment.sender.email, metadata: { shipmentId, attemptId: attempt.id },
  }, { idempotencyKey: attempt.id });
  if (!session.url) throw new AppError(502, "Stripe checkout URL is missing");
  await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { transactionId: session.id, checkoutUrl: session.url } });
  return { paymentUrl: session.url, shipmentId };
};

const confirmStripeSession = async (session: Stripe.Checkout.Session) => {
  let attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: session.id }, include: { payment: true } });
  if (!attempt && session.metadata?.attemptId) {
    const pending = await prisma.paymentAttempt.findUnique({ where: { id: session.metadata.attemptId }, include: { payment: true } });
    if (pending && pending.paymentGateway === PaymentGateway.STRIPE && !pending.transactionId) {
      assertStripePayment(session, { ...pending, transactionId: session.id }, pending.payment.shipmentId, pending.id);
      await prisma.paymentAttempt.updateMany({ where: { id: pending.id, transactionId: null }, data: { transactionId: session.id } });
      attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: session.id }, include: { payment: true } });
    }
  }
  if (!attempt || attempt.paymentGateway !== PaymentGateway.STRIPE) throw new AppError(404, "Payment attempt not found");
  assertStripePayment(session, attempt, attempt.payment.shipmentId, attempt.id);
  const providerId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!providerId) throw new AppError(400, "Stripe transaction identifier is missing");
  return completeAttempt(attempt.id, providerId, { sessionId: session.id, transactionId: providerId, amount: String(session.amount_total), currency: session.currency ?? "" });
};

const executeStripePayment = async (sessionId: string) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const payment = await confirmStripeSession(session);
  return redirect("success", payment.shipmentId);
};

const handleStripeEvent = async (event: Stripe.Event) => {
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") await confirmStripeSession(session);
  } else if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: session.id } });
    if (!attempt) throw new AppError(404, "Payment attempt not found");
    await failAttempt(attempt.id, "FAILED");
  }
};

const reconcilePayment = async (shipmentId: string, userId: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, select: { senderId: true } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.senderId !== userId) throw new AppError(403, "Unauthorized shipment");
  const payment = await prisma.payment.findUnique({ where: { shipmentId }, include: { attempts: { where: { status: PaymentStatus.UNPAID } } } });
  if (!payment || ["PAID", "REFUNDED"].includes(payment.status)) return { shipmentId, status: payment?.status ?? "UNPAID" };
  for (const attempt of payment.attempts) {
    if (!attempt.transactionId) throw new AppError(409, "Payment reference is missing. Contact support for provider reconciliation");
    if (attempt.paymentGateway === PaymentGateway.STRIPE) {
      const session = await getStripe().checkout.sessions.retrieve(attempt.transactionId);
      if (session.payment_status === "paid") await confirmStripeSession(session);
      else if (session.status === "expired") {
        if (session.id !== attempt.transactionId || session.metadata?.attemptId !== attempt.id || session.metadata?.shipmentId !== shipmentId) throw new AppError(400, "Payment reference mismatch");
        await failAttempt(attempt.id, "FAILED");
      }
    } else if (attempt.paymentGateway === PaymentGateway.BKASH) {
      try { await executePayment(attempt.transactionId, "query"); }
      catch (error) { if (!(error instanceof AppError && error.statusCode === 409)) throw error; }
    }
  }
  const refreshed = await prisma.payment.findUniqueOrThrow({ where: { shipmentId } });
  return { shipmentId, status: refreshed.status };
};

const getPayments = async (query: unknown, user: Actor) => {
  const { page, limit } = listQuerySchema.parse(query);
  const where: Prisma.PaymentWhereInput = { isDeleted: false, ...(user.role === "CUSTOMER" ? { shipment: { senderId: user.userId } } : {}) };
  const [data, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
      select: { ...paymentSelect, shipment: { select: { trackingId: true, sender: { select: { name: true, email: true } } } } } }),
    prisma.payment.count({ where }),
  ]);
  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data };
};

const getSinglePayment = async (id: string, user: Actor) => {
  const payment = await prisma.payment.findUnique({ where: { id, isDeleted: false }, select: {
    ...paymentSelect, shipment: { select: { trackingId: true, senderId: true } },
    attempts: { orderBy: { createdAt: "desc" }, select: { id: true, paymentGateway: true, status: true, createdAt: true, paidAt: true } },
  } });
  if (!payment) throw new AppError(404, "Payment not found");
  if (user.role === "CUSTOMER" && payment.shipment.senderId !== user.userId) throw new AppError(403, "Unauthorized payment");
  return payment;
};

export const PaymentService = { initiatePayment, executePayment, initiateStripePayment, executeStripePayment, handleStripeEvent, reconcilePayment, getPayments, getSinglePayment };
