import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { AppError } from "../errors/AppError";

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

const auth = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

      if (!token) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized!");
      }

      const decoded = jwt.verify(
        token,
        config.jwt_access_secret as string
      ) as JwtPayload;

      const { email, role, iat } = decoded;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, "This user is not found!");
      }

      if (user.isDeleted || user.status === "DELETED") {
        throw new AppError(httpStatus.FORBIDDEN, "This user is deleted!");
      }

      if (user.status === "BLOCKED") {
        throw new AppError(httpStatus.FORBIDDEN, "This user is blocked!");
      }

      if (requiredRoles && !requiredRoles.includes(role)) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not authorized!");
      }

      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;