import { z } from "zod";

const UpdateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(255).optional(),
    contactNumber: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/).optional(),
    address: z.string().trim().max(500).refine(value => value.length === 0 || value.length >= 5).optional(),
  }).strict().refine(value => Object.keys(value).length > 0, "At least one profile field is required"),
});

export const UserValidation = {
  UpdateProfileSchema,
};
