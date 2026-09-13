import { z } from "zod";

const CreateHubSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    location: z.string().min(1),
    address: z.string().min(1),
  }),
});

const UpdateHubSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
  }),
});

export const HubValidation = {
  CreateHubSchema,
  UpdateHubSchema,
};