import { PrismaClient, PaymentStatus } from "@prisma/client";
import httpStatus from "http-status";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { redisClient } from "../../utils/redis";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const getBkashToken = async () => {
  const tokenKey = "bkash_token";
  let token = await redisClient.get(tokenKey);

  if (token) return token;

  const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: config.bkash_username as string,
      password: config.bkash_password as string,
    },
    body: JSON.stringify({
      app_key: config.bkash_app_key,
      app_secret: config.bkash_app_secret,
    }),
  });

  if (!response.ok) {
    throw new AppError(httpStatus.BAD_GATEWAY, "Failed to get bKash token");
  }

  const data = await response.json();
  await redisClient.setEx(tokenKey, 3500, data.id_token);
  return data.id_token;
};

const initiatePayment = async (shipmentId: string, userId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId, isDeleted: false },
    include: { sender: true },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.senderId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized access to this shipment");
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { shipmentId },
  });

  if (existingPayment && existingPayment.status === "PAID") {
    throw new AppError(httpStatus.CONFLICT, "Payment already completed for this shipment");
  }

  const token = await getBkashToken();

  const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": config.bkash_app_key as string,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: shipment.sender.email,
      callbackURL: `${config.bkash_callback_url}/payment/bkash/callback`,
      amount: shipment.price.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: shipment.id,
    }),
  });

  if (!response.ok) {
    throw new AppError(httpStatus.BAD_GATEWAY, "Failed to initiate bKash payment");
  }

  const result = await response.json();

  if (existingPayment) {
    await prisma.payment.update({
      where: { shipmentId },
      data: { transactionId: result.paymentID, gatewayResponse: result },
    });
  } else {
    await prisma.payment.create({
      data: {
        shipmentId,
        amount: shipment.price,
        transactionId: result.paymentID,
        payerReference: shipment.sender.email,
        gatewayResponse: result,
      },
    });
  }

  return { paymentUrl: result.bkashURL };
};

const executePayment = async (paymentID: string, status: string) => {
  if (status === "cancel" || status === "failure") {
    await prisma.payment.updateMany({
      where: { transactionId: paymentID },
      data: { status: status === "cancel" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED },
    });
    return { redirectUrl: `${process.env.FRONTEND_URL}/payment/${status}` };
  }

  const token = await getBkashToken();

  const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": config.bkash_app_key as string,
    },
    body: JSON.stringify({ paymentID }),
  });

  const result = await response.json();

  if (result.statusCode && result.statusCode !== "0000") {
    await prisma.payment.updateMany({
      where: { transactionId: paymentID },
      data: { status: PaymentStatus.FAILED, gatewayResponse: result },
    });
    return { redirectUrl: `${process.env.FRONTEND_URL}/payment/failure` };
  }

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.updateMany({
      where: { transactionId: paymentID },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        gatewayResponse: result,
      },
    });

    const paymentRecord = await tx.payment.findFirst({ where: { transactionId: paymentID } });

    if (paymentRecord) {
      await tx.auditLog.create({
        data: {
          action: "PAYMENT_SUCCESS",
          entityId: paymentRecord.shipmentId,
          entityType: "SHIPMENT",
          details: { transactionId: result.trxID, amount: result.amount },
        },
      });
    }
  });

  return { redirectUrl: `${process.env.FRONTEND_URL}/payment/success?trxId=${result.trxID}` };
};

const initiateStripePayment = async (shipmentId: string, userId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId, isDeleted: false },
    include: { sender: true },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.senderId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized access to this shipment");
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { shipmentId },
  });

  if (existingPayment && existingPayment.status === "PAID") {
    throw new AppError(httpStatus.CONFLICT, "Payment already completed for this shipment");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `Shipment ${shipment.trackingId}`,
            description: "Courier & Logistics Service",
          },
          unit_amount: Math.round(Number(shipment.price) * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    customer_email: shipment.sender.email,
    metadata: {
      shipmentId: shipment.id,
    },
  });

  if (existingPayment) {
    await prisma.payment.update({
      where: { shipmentId },
      data: { transactionId: session.id },
    });
  } else {
    await prisma.payment.create({
      data: {
        shipmentId,
        amount: shipment.price,
        transactionId: session.id,
        payerReference: shipment.sender.email,
      },
    });
  }

  return { paymentUrl: session.url };
};

const executeStripePayment = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const shipmentId = session.metadata?.shipmentId;

  if (!shipmentId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid session data");
  }

  if (session.payment_status === "paid") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { transactionId: sessionId },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayResponse: session as any,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_SUCCESS",
          entityId: shipmentId,
          entityType: "SHIPMENT",
          details: { transactionId: session.payment_intent, amount: session.amount_total },
        },
      });
    });

    return { redirectUrl: `${process.env.FRONTEND_URL}/payment/success?trxId=${session.payment_intent}` };
  } else {
    await prisma.payment.updateMany({
      where: { transactionId: sessionId },
      data: { status: PaymentStatus.FAILED },
    });
    return { redirectUrl: `${process.env.FRONTEND_URL}/payment/failure` };
  }
};


const getPayments = async (query: any, user: any) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const andConditions: any[] = [{ isDeleted: false }];

  if (user.role === "CUSTOMER") {
    andConditions.push({ shipment: { senderId: user.userId } });
  }

  const result = await prisma.payment.findMany({
    where: { AND: andConditions },
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
    include: {
      shipment: { select: { trackingId: true, sender: { select: { name: true, email: true } } } },
    },
  });

  const total = await prisma.payment.count({ where: { AND: andConditions } });

  const safeData = result.map(({ gatewayResponse, ...rest }) => rest);

  return {
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    data: safeData,
  };
};

const getSinglePayment = async (id: string, user: any) => {
  const payment = await prisma.payment.findUnique({
    where: { id, isDeleted: false },
    include: {
      shipment: { select: { trackingId: true, senderId: true } },
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  if (user.role === "CUSTOMER" && payment.shipment.senderId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to view this payment");
  }

  const { gatewayResponse, ...safeData } = payment as any;
  return safeData;
};

export const PaymentService = {
  initiatePayment,
  executePayment,
  initiateStripePayment,
  executeStripePayment,
  getPayments,
  getSinglePayment,
};