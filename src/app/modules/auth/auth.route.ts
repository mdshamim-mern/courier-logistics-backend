import express from "express";
import { authRateLimiter, otpRateLimiter } from "../../middlewares/rateLimiter";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = express.Router();
router.use(authRateLimiter);

router.post(
  "/register",
  otpRateLimiter,
  validateRequest(AuthValidation.RegisterCustomerZodSchema),
  AuthController.registerCustomer
);

router.post(
  "/verify-email",
  otpRateLimiter,
  validateRequest(AuthValidation.VerifyEmailZodSchema),
  AuthController.verifyEmail
);

router.post(
  "/login",
  validateRequest(AuthValidation.LoginZodSchema),
  AuthController.loginUser
);

router.post(
  "/refresh-token",
  AuthController.refreshToken
);

router.post(
  "/google",
  validateRequest(AuthValidation.GoogleLoginZodSchema),
  AuthController.googleLogin
);

router.post(
  "/forgot-password",
  otpRateLimiter,
  validateRequest(AuthValidation.ForgotPasswordZodSchema),
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  otpRateLimiter,
  validateRequest(AuthValidation.ResetPasswordZodSchema),
  AuthController.resetPassword
);

router.post(
  "/logout",
  AuthController.logout
);

export const AuthRoutes = router;
