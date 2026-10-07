import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from "jsonwebtoken";
import multer from "multer";
import { ZodError } from "zod";
import config from "../config";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let statusCode = 500;
  let message = "An unexpected error occurred";
  let errors: { path: string; message: string }[] = [];
  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    errors = error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }));
  } else if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
    statusCode = 401;
    message = "Invalid or expired session";
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof multer.MulterError) {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = error.code === "LIMIT_FILE_SIZE" ? "Image exceeds the 5 MB limit" : "Invalid upload";
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") { statusCode = 409; message = "Record already exists"; }
    if (error.code === "P2025") { statusCode = 404; message = "Record not found"; }
    if (error.code === "P2003") { statusCode = 400; message = "Related record is invalid"; }
    if (error.code === "P2034") { statusCode = 409; message = "Record changed, please try again"; }
  } else if (error?.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON request";
  } else if (error?.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }
  if (statusCode >= 500) logger.error("request_failed", { requestId: res.getHeader("X-Request-ID"), path: req.path, code: error?.code, name: error?.name });
  if (!errors.length) errors = [{ path: "", message }];
  res.status(statusCode).json({ success: false, message, errors, requestId: res.getHeader("X-Request-ID"), ...(config.env === "development" ? { stack: error?.stack } : {}) });
};
export default globalErrorHandler;
