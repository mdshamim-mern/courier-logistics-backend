import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuditLogService } from "./auditLog.service";

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditLogService.getAuditLogs(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const AuditLogController = {
  getAuditLogs,
};