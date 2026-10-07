import { z } from "zod";

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().max(40).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  searchTerm: z.string().trim().max(200).optional(),
  role: z.enum(["ADMIN", "COURIER", "CUSTOMER"]).optional(),
  status: z.string().max(40).optional(),
  isAvailable: z.enum(["true", "false"]).optional(),
  action: z.string().max(80).optional(),
  entityType: z.string().max(80).optional(),
});

export const idParamsSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
