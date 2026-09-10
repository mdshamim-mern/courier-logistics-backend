import { AuthProvider, PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import httpStatus from "http-status";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { emailSender } from "../../utils/emailSender";
import { redisClient } from "../../utils/redis";
import {
  IForgotPasswordPayload,
  IGoogleLoginPayload,
  ILoginPayload,
  IRegisterCustomerPayload,
  IResetPasswordPayload,
  IVerifyEmailPayload,
} from "./auth.interface";

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(config.google_client_id);

const createToken = (payload: any, secret: string, expiresIn: string) => {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

const registerCustomer = async (payload: IRegisterCustomerPayload) => {
  const { email, password } = payload;
  const formattedEmail = email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (isUserExists) {
    throw new AppError(httpStatus.CONFLICT, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password as string, Number(config.bcrypt_salt_rounds));
  const otpValue = crypto.randomInt(100000, 1000000).toString();
  const expirationSeconds = 5 * 60;
  
  const otpKey = `registration-otp:${formattedEmail}`;
  const dataKey = `registration-data:${formattedEmail}`;

  await redisClient.setEx(otpKey, expirationSeconds, otpValue);
  await redisClient.setEx(
    dataKey,
    expirationSeconds,
    JSON.stringify({ ...payload, email: formattedEmail, password: hashedPassword })
  );

  await emailSender(
    formattedEmail,
    "Email Verification OTP",
    `<p>Your OTP for registration is <strong>${otpValue}</strong>. It expires in 5 minutes.</p>`
  );

  return null;
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
  const formattedEmail = payload.email.trim().toLowerCase();
  
  const isUserExists = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (isUserExists) {
    throw new AppError(httpStatus.CONFLICT, "Email already verified and user exists");
  }

  const otpKey = `registration-otp:${formattedEmail}`;
  const dataKey = `registration-data:${formattedEmail}`;

  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp || redisOtp !== payload.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  const redisData = await redisClient.get(dataKey);
  if (!redisData) {
    throw new AppError(httpStatus.BAD_REQUEST, "Registration data expired");
  }

  const parsedData = JSON.parse(redisData);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsedData.name,
        email: parsedData.email,
        password: parsedData.password,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    const customer = await tx.customer.create({
      data: {
        userId: user.id,
        contactNumber: parsedData.contactNumber,
      },
    });

    return { user, customer };
  });

  await redisClient.del([otpKey, dataKey]);

  const jwtPayload = {
    userId: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
  };

  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

  const { password, ...userWithoutPassword } = result.user;

  return {
    user: userWithoutPassword,
    customer: result.customer,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginPayload) => {
  const formattedEmail = payload.email.trim().toLowerCase();
  
  const user = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED || user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "User account is blocked or deleted");
  }

  if (user.authProvider === AuthProvider.GOOGLE && !user.password) {
    throw new AppError(httpStatus.BAD_REQUEST, "Please login with Google");
  }

  const isPasswordMatched = await bcrypt.compare(payload.password as string, user.password as string);

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

  return { accessToken, refreshToken, needPasswordChange: user.needPasswordChange };
};

const refreshToken = async (token: string) => {
  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(token, config.jwt_refresh_secret as string) as JwtPayload;
  } catch (error) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { email: decoded.email },
  });

  if (!user || user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED || user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "User account is not accessible");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const newRefreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

  return { accessToken, refreshToken: newRefreshToken };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  const ticket = await googleClient.verifyIdToken({
    idToken: payload.idToken,
    audience: config.google_client_id,
  });

  const payloadData = ticket.getPayload();
  if (!payloadData || !payloadData.email) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Google Token");
  }

  const formattedEmail = payloadData.email.trim().toLowerCase();

  let user = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (user) {
    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED || user.isDeleted) {
      throw new AppError(httpStatus.FORBIDDEN, "User account is blocked or deleted");
    }
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payloadData.sub, emailVerified: true },
      });
    }
  } else {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: payloadData.name as string,
          email: formattedEmail,
          googleId: payloadData.sub,
          authProvider: AuthProvider.GOOGLE,
          role: Role.CUSTOMER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });

      await tx.customer.create({
        data: { userId: newUser.id },
      });

      return newUser;
    });
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

  return { accessToken, refreshToken };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const formattedEmail = payload.email.trim().toLowerCase();
  
  const user = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (!user || user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Active user not found");
  }

  if (user.authProvider === AuthProvider.GOOGLE && !user.password) {
    throw new AppError(httpStatus.BAD_REQUEST, "Google linked account cannot reset password this way");
  }

  const otpValue = crypto.randomInt(100000, 1000000).toString();
  const expirationSeconds = 5 * 60;
  const otpKey = `reset-otp:${formattedEmail}`;

  await redisClient.setEx(otpKey, expirationSeconds, otpValue);

  await emailSender(
    formattedEmail,
    "Password Reset OTP",
    `<p>Your OTP for password reset is <strong>${otpValue}</strong>. It expires in 5 minutes.</p>`
  );

  return null;
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const formattedEmail = payload.email.trim().toLowerCase();
  
  const user = await prisma.user.findUnique({
    where: { email: formattedEmail },
  });

  if (!user || user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Active user not found");
  }

  const otpKey = `reset-otp:${formattedEmail}`;
  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp || redisOtp !== payload.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds));

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, needPasswordChange: false },
  });

  await redisClient.del(otpKey);

  return null;
};

export const AuthService = {
  registerCustomer,
  verifyEmail,
  loginUser,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword,
};