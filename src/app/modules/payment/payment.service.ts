import { PrismaClient, PaymentStatus } from "@prisma/client";
import httpStatus from "http-status";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { redisClient } from "../../utils/redis";

const prisma = new PrismaClient();

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
          userId: "SYSTEM",
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

  return {
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    data: result,
  };
};

export const PaymentService = {
  initiatePayment,
  executePayment,
  getPayments,
};