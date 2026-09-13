import { z } from "zod";

const UpdateUserStatusSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]),
  }),
});

const UpdateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(["ADMIN", "COURIER", "CUSTOMER"]),
  }),
});

export const AdminValidation = {
  UpdateUserStatusSchema,
  UpdateUserRoleSchema,
};