import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiatePayment(req.body.shipmentId, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment initiated successfully",
    data: result,
  });
});

const bkashCallback = catchAsync(async (req: Request, res: Response) => {
  const { paymentID, status } = req.query;
  
  const result = await PaymentService.executePayment(paymentID as string, status as string);
  
  res.redirect(result.redirectUrl);
});

const initiateStripePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiateStripePayment(req.body.shipmentId, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stripe payment initiated successfully",
    data: result,
  });
});

const stripeCallback = catchAsync(async (req: Request, res: Response) => {
  const { session_id } = req.query;

  if (!session_id) {
    res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
    return;
  }

  const result = await PaymentService.executeStripePayment(session_id as string);
  
  res.redirect(result.redirectUrl);
});


const reconcilePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.reconcilePayment(req.body.shipmentId, req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payment status checked with provider", data: result });
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPayments(req.query, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getSinglePayment(req.params.id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment details retrieved successfully",
    data: result,
  });
});

export const PaymentController = {
  reconcilePayment,
  initiatePayment,
  bkashCallback,
  initiateStripePayment,
  stripeCallback,
  getPayments,
  getSinglePayment,
};
