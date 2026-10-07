import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";
import { AppError } from "../errors/AppError";
import { prisma } from "../utils/prisma";
import { hasSession } from "../utils/session";

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & { userId: string; role: Role; sessionId: string };
    }
  }
}

const auth = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bearer = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
      const token = req.cookies?.accessToken || bearer;
      if (!token) throw new AppError(401, "Authentication required");
      const decoded = jwt.verify(token, config.jwt_access_secret, { algorithms: ["HS256"] }) as JwtPayload;
      if (typeof decoded.userId !== "string" || typeof decoded.sessionId !== "string") {
        throw new AppError(401, "Invalid session");
      }
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || user.isDeleted || user.status !== "ACTIVE") throw new AppError(403, "User account is not accessible");
      if (decoded.tokenVersion !== user.tokenVersion || !(await hasSession(decoded.sessionId))) throw new AppError(401, "Session expired");
      if (!user.emailVerified) throw new AppError(403, "Email verification required");
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) throw new AppError(403, "You do not have permission for this action");
      req.user = { ...decoded, sessionId: decoded.sessionId, userId: user.id, email: user.email, name: user.name, role: user.role };
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
