import { z } from "zod";

const CreateHubSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    location: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(500),
  }).strict(),
});

const UpdateHubSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().min(1).max(500).optional(),
  }).strict().refine(body => Object.keys(body).length > 0, "At least one hub field is required"),
});

export const HubValidation = {
  CreateHubSchema,
  UpdateHubSchema,
};
