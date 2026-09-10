import { z } from "zod";

const RegisterCustomerZodSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(255),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
    contactNumber: z.string().optional(),
  }),
});

const VerifyEmailZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
});

const LoginZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const GoogleLoginZodSchema = z.object({
  body: z.object({
    idToken: z.string(),
  }),
});

const ForgotPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const ResetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z
      .string()
      .min(8)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
  }),
});

export const AuthValidation = {
  RegisterCustomerZodSchema,
  VerifyEmailZodSchema,
  LoginZodSchema,
  GoogleLoginZodSchema,
  ForgotPasswordZodSchema,
  ResetPasswordZodSchema,
};