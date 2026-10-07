import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { AppError } from "../../errors/AppError";

export type ExpectedPayment = { transactionId: string | null; amount: Prisma.Decimal; currency: string; paymentId: string };

export function assertStripePayment(session: Stripe.Checkout.Session, expected: ExpectedPayment, shipmentId: string, attemptId: string) {
  if (session.id !== expected.transactionId || session.metadata?.shipmentId !== shipmentId || session.metadata?.attemptId !== attemptId ||
      session.mode !== "payment" || session.payment_status !== "paid" ||
      session.currency?.toUpperCase() !== expected.currency ||
      session.amount_total !== expected.amount.mul(100).toNumber()) {
    throw new AppError(400, "Stripe payment verification failed");
  }
}

export function assertBkashPayment(result: Record<string, unknown>, expected: ExpectedPayment) {
  if (result.statusCode !== "0000" || result.transactionStatus !== "Completed" ||
      result.paymentID !== expected.transactionId || result.currency !== expected.currency ||
      typeof result.trxID !== "string" || !result.trxID ||
      (typeof result.amount !== "string" && typeof result.amount !== "number")) {
    throw new AppError(400, "bKash payment verification failed");
  }
  let amount: Prisma.Decimal;
  try { amount = new Prisma.Decimal(result.amount as string); } catch { throw new AppError(400, "Invalid payment amount"); }
  if (!amount.equals(expected.amount)) throw new AppError(400, "Payment amount does not match");
}
