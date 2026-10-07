import type { RequestHandler } from "express";
import config from "../config";
import { AppError } from "../errors/AppError";

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin !== new URL(config.frontend_url).origin) return next(new AppError(403, "Request origin is not allowed"));
  if ((req.cookies?.accessToken || req.cookies?.refreshToken) && req.get("X-Courier-Client") !== "1") {
    return next(new AppError(403, "Missing request verification header"));
  }
  next();
};
