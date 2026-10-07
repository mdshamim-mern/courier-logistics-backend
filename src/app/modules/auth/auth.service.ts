import { AuthProvider, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { emailSender } from "../../utils/emailSender";
import { prisma } from "../../utils/prisma";
import { redisClient } from "../../utils/redis";
import { createSession, revokeSession, rotateSession, safeUser } from "../../utils/session";
import type { IForgotPasswordPayload, IGoogleLoginPayload, ILoginPayload, IRegisterCustomerPayload, IResetPasswordPayload, IVerifyEmailPayload } from "./auth.interface";

const googleClient = new OAuth2Client(config.google_client_id);
const hashOtp = (otp: string) => createHash("sha256").update(otp).digest("hex");
const normalizedEmail = (email: string) => email.trim().toLowerCase();

const consumeOtp = async (key: string, otp: string) => {
  const stored = await redisClient.get(key);
  const supplied = hashOtp(otp);
  if (!stored || stored.length !== supplied.length || !timingSafeEqual(Buffer.from(stored), Buffer.from(supplied))) {
    throw new AppError(400, "Invalid or expired OTP");
  }
  const consumed = await redisClient.eval(
    "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end; return 0",
    { keys: [key], arguments: [supplied] },
  );
  if (consumed !== 1) throw new AppError(400, "Invalid or expired OTP");
};

const registerCustomer = async (payload: IRegisterCustomerPayload) => {
  const email = normalizedEmail(payload.email);
  if (await prisma.user.findUnique({ where: { email } })) throw new AppError(409, "User with this email already exists");
  const password = await bcrypt.hash(payload.password as string, config.bcrypt_salt_rounds);
  const otp = randomInt(100000, 1000000).toString();
  await redisClient.multi()
    .setEx(`registration-otp:${email}`, 300, hashOtp(otp))
    .setEx(`registration-data:${email}`, 300, JSON.stringify({ name: payload.name, email, password, contactNumber: payload.contactNumber }))
    .exec();
  await emailSender(email, "Email Verification OTP", `<p>Your verification code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
  return null;
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
  const email = normalizedEmail(payload.email);
  const data = await redisClient.get(`registration-data:${email}`);
  if (!data) throw new AppError(400, "Registration data expired");
  await consumeOtp(`registration-otp:${email}`, payload.otp);
  const pending = JSON.parse(data) as IRegisterCustomerPayload;
  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: {
      name: pending.name, email, password: pending.password, contactNumber: pending.contactNumber,
      role: Role.CUSTOMER, status: UserStatus.ACTIVE, emailVerified: true, authProvider: AuthProvider.CREDENTIAL,
    } });
    const customer = await tx.customer.create({ data: { userId: user.id, contactNumber: pending.contactNumber } });
    return { user, customer };
  });
  await redisClient.del(`registration-data:${email}`);
  const tokens = await createSession(result.user);
  return { ...tokens, user: safeUser(result.user), customer: result.customer };
};

const loginUser = async (payload: ILoginPayload) => {
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail(payload.email) } });
  if (!user?.password || !payload.password || !(await bcrypt.compare(payload.password, user.password))) throw new AppError(401, "Invalid credentials");
  if (user.isDeleted || user.status !== UserStatus.ACTIVE || !user.emailVerified) throw new AppError(403, "User account is not accessible");
  const tokens = await createSession(user);
  return { ...tokens, user: safeUser(user) };
};

const refreshToken = async (token?: string) => {
  if (!token) throw new AppError(401, "Refresh token required");
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.jwt_refresh_secret, { algorithms: ["HS256"] }) as JwtPayload;
  } catch {
    throw new AppError(401, "Invalid refresh token");
  }
  if (typeof decoded.userId !== "string" || typeof decoded.sessionId !== "string") throw new AppError(401, "Invalid session");
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE || !user.emailVerified) throw new AppError(403, "User account is not accessible");
  if (decoded.tokenVersion !== user.tokenVersion) throw new AppError(401, "Session expired");
  const tokens = await rotateSession(user, token, decoded.sessionId);
  return { ...tokens, user: safeUser(user) };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  if (!config.google_client_id) throw new AppError(503, "Google login is not configured");
  const ticket = await googleClient.verifyIdToken({ idToken: payload.idToken, audience: config.google_client_id });
  const identity = ticket.getPayload();
  if (!identity?.email || !identity.email_verified) throw new AppError(401, "Verified Google identity required");
  const email = normalizedEmail(identity.email);
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    if (user.isDeleted || user.status !== UserStatus.ACTIVE) throw new AppError(403, "User account is not accessible");
    if (user.googleId && user.googleId !== identity.sub) throw new AppError(401, "Google identity does not match");
    if (!user.googleId) user = await prisma.user.update({ where: { id: user.id }, data: { googleId: identity.sub, emailVerified: true } });
  } else {
    user = await prisma.user.create({ data: {
      name: identity.name || email.split("@")[0], email, googleId: identity.sub, authProvider: AuthProvider.GOOGLE,
      role: Role.CUSTOMER, status: UserStatus.ACTIVE, emailVerified: true, customer: { create: {} },
    } });
  }
  const tokens = await createSession(user);
  return { ...tokens, user: safeUser(user) };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const email = normalizedEmail(payload.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password || user.isDeleted || user.status !== UserStatus.ACTIVE) return null;
  const otp = randomInt(100000, 1000000).toString();
  await redisClient.setEx(`reset-otp:${email}`, 300, hashOtp(otp));
  await emailSender(email, "Password Reset OTP", `<p>Your reset code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
  return null;
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const email = normalizedEmail(payload.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password || user.isDeleted || user.status !== UserStatus.ACTIVE) throw new AppError(400, "Invalid reset request");
  await consumeOtp(`reset-otp:${email}`, payload.otp);
  const password = await bcrypt.hash(payload.newPassword, config.bcrypt_salt_rounds);
  await prisma.user.update({ where: { id: user.id }, data: { password, needPasswordChange: false, tokenVersion: { increment: 1 } } });
  return null;
};

const logoutUser = async (token?: string) => {
  if (!token) return null;
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.jwt_refresh_secret, { algorithms: ["HS256"] }) as JwtPayload;
  } catch {
    return null;
  }
  if (typeof decoded.sessionId === "string") await revokeSession(decoded.sessionId);
  return null;
};

export const AuthService = { registerCustomer, verifyEmail, loginUser, refreshToken, googleLogin, forgotPassword, resetPassword, logoutUser };
