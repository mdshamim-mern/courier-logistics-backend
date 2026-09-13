import { z } from "zod";

const createCourierZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }),
    email: z.string({ required_error: "Email is required" }).email(),
    password: z.string({ required_error: "Password is required" }),
    contactNumber: z.string({ required_error: "Contact number is required" }),
    vehicleType: z.string().optional(),
    vehicleNumber: z.string().optional(),
    currentHubId: z.string().optional(),
  }),
});

const updateCourierZodSchema = z.object({
  body: z.object({
    vehicleType: z.string().optional(),
    vehicleNumber: z.string().optional(),
    isAvailable: z.boolean().optional(),
    currentHubId: z.string().optional(),
  }),
});

export const CourierValidation = {
  createCourierZodSchema,
  updateCourierZodSchema,
};