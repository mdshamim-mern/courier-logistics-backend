import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { clearSessionCookies, setSessionCookies } from "../../utils/cookies";
import { AuthService } from "./auth.service";

const registerCustomer = catchAsync(async (req: Request, res: Response) => {
  await AuthService.registerCustomer(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "OTP sent to email for verification", data: null });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyEmail(req.body);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "User registered successfully", data: { user: result.user, customer: result.customer, role: result.user.role } });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Logged in successfully", data: { user: result.user, role: result.user.role, needPasswordChange: result.user.needPasswordChange } });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.refreshToken(req.cookies?.refreshToken);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Session refreshed successfully", data: { user: result.user, role: result.user.role } });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.googleLogin(req.body);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Google login successful", data: { user: result.user, role: result.user.role } });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.forgotPassword(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "If the account is eligible, a reset code has been sent", data: null });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resetPassword(req.body);
  clearSessionCookies(res);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Password reset successfully", data: null });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logoutUser(req.cookies?.refreshToken);
  clearSessionCookies(res);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Logged out successfully", data: null });
});

export const AuthController = { registerCustomer, verifyEmail, loginUser, refreshToken, googleLogin, forgotPassword, resetPassword, logout };
