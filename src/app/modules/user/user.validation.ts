import { z } from "zod";

const UpdateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    contactNumber: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/).optional(),
    address: z.string().min(5).optional(),
    imageUrl: z.string().url().optional(),
  }),
});

export const UserValidation = {
  UpdateProfileSchema,
};