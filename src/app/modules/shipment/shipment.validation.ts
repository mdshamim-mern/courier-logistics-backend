import { z } from "zod";

const CreateShipmentSchema = z.object({
  body: z.object({
    receiverName: z.string().min(1),
    receiverPhone: z.string().min(1),
    receiverAddress: z.string().min(1),
    weight: z.number().positive(),
    originHubId: z.string().uuid().optional(),
    destinationHubId: z.string().uuid().optional(),
  }),
});

const UpdateShipmentStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "PENDING",
      "ASSIGNED",
      "PICKED_UP",
      "IN_TRANSIT",
      "DELIVERED",
      "RETURNED",
      "CANCELLED",
    ]),
  }),
});

const AssignCourierSchema = z.object({
  body: z.object({
    courierId: z.string().uuid(),
  }),
});

export const ShipmentValidation = {
  CreateShipmentSchema,
  UpdateShipmentStatusSchema,
  AssignCourierSchema,
};