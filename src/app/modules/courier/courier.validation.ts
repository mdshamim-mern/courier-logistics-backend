import { z } from "zod";

const createCourierZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }),
    email: z.string({ required_error: "Email is required" }).email(),
    password: z.string().min(8).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    contactNumber: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/),
    vehicleType: z.string().optional(),
    vehicleNumber: z.string().optional(),
    currentHubId: z.string().uuid().optional(),
  }).strict(),
});

const updateCourierZodSchema = z.object({
  body: z.object({
    vehicleType: z.string().optional(),
    vehicleNumber: z.string().optional(),
    isAvailable: z.boolean().optional(),
    currentHubId: z.string().uuid().optional(),
  }).strict(),
});

export const CourierValidation = {
  createCourierZodSchema,
  updateCourierZodSchema,
};
