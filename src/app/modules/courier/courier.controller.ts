import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CourierService } from "./courier.service";

const createCourier = catchAsync(async (req: Request, res: Response) => {
  const result = await CourierService.createCourier(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Courier created successfully",
    data: result,
  });
});

const getAllCouriers = catchAsync(async (req: Request, res: Response) => {
  const result = await CourierService.getAllCouriers(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Couriers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCourierDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CourierService.getCourierDetails(id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier details retrieved successfully",
    data: result,
  });
});

const updateCourierProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CourierService.updateCourierProfile(id, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier profile updated successfully",
    data: result,
  });
});

const getCourierHistoryAndEarnings = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CourierService.getCourierHistoryAndEarnings(id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier history and earnings retrieved successfully",
    data: result,
  });
});

export const CourierController = {
  createCourier,
  getAllCouriers,
  getCourierDetails,
  updateCourierProfile,
  getCourierHistoryAndEarnings,
};