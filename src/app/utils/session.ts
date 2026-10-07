import type { User } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import config from "../config";
import { AppError } from "../errors/AppError";
import { redisClient } from "./redis";

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const sessionKey = (sessionId: string) => `session:${sessionId}`;

export function buildSessionTokens(user: User, sessionId: string = randomUUID()) {
  const payload = { userId: user.id, name: user.name, email: user.email, role: user.role, tokenVersion: user.tokenVersion, sessionId };
  const accessToken = jwt.sign(payload, config.jwt_access_secret, {
    algorithm: "HS256", expiresIn: config.jwt_access_expires_in as SignOptions["expiresIn"], jwtid: randomUUID(),
  });
  const refreshToken = jwt.sign(payload, config.jwt_refresh_secret, {
    algorithm: "HS256", expiresIn: config.jwt_refresh_expires_in as SignOptions["expiresIn"], jwtid: randomUUID(),
  });
  const expiresAt = (jwt.decode(refreshToken) as JwtPayload).exp;
  if (!expiresAt) throw new Error("Session token expiry is missing");
  return { accessToken, refreshToken, sessionId, ttl: Math.max(1, expiresAt - Math.floor(Date.now() / 1000)) };
}

export async function createSession(user: User) {
  const tokens = buildSessionTokens(user);
  await redisClient.setEx(sessionKey(tokens.sessionId), tokens.ttl, digest(tokens.refreshToken));
  return tokens;
}

export async function rotateSession(user: User, oldToken: string, sessionId: string) {
  const tokens = buildSessionTokens(user, sessionId);
  const changed = await redisClient.eval(
    "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1 end; return 0",
    { keys: [sessionKey(sessionId)], arguments: [digest(oldToken), digest(tokens.refreshToken), String(tokens.ttl)] },
  );
  if (changed !== 1) throw new AppError(401, "Session expired or refresh token already used");
  return tokens;
}

export const revokeSession = (sessionId: string) => redisClient.del(sessionKey(sessionId));
export const hasSession = async (sessionId: string) => Boolean(await redisClient.exists(sessionKey(sessionId)));

export function safeUser(user: User) {
  const { password, googleId, imagePublicId, tokenVersion, ...publicUser } = user;
  return publicUser;
}
