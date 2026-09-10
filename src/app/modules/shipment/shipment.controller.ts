import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ShipmentService } from "./shipment.service";

const createShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.createShipment(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Shipment created successfully",
    data: result,
  });
});

const getAllShipments = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.getAllShipments(req.query, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.getSingleShipment(req.params.id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment retrieved successfully",
    data: result,
  });
});

const assignCourier = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.assignCourier(req.params.id, req.body.courierId, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier assigned successfully",
    data: result,
  });
});

const updateShipmentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.updateShipmentStatus(req.params.id, req.body.status, req.user.userId, req.user.role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment status updated successfully",
    data: result,
  });
});

export const ShipmentController = {
  createShipment,
  getAllShipments,
  getSingleShipment,
  assignCourier,
  updateShipmentStatus,
};