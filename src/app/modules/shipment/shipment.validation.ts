import { z } from "zod";

const CreateShipmentSchema = z.object({
  body: z.object({
    receiverName: z.string().min(1),
    receiverPhone: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/),
    receiverAddress: z.string().min(1),
    weight: z.number().positive().max(100),
    originHubId: z.string().uuid().optional(),
    destinationHubId: z.string().uuid().optional(),
  }).refine((data) => {
    if (data.originHubId && data.destinationHubId) {
      return data.originHubId !== data.destinationHubId;
    }
    return true;
  }, {
    message: "Origin Hub and Destination Hub cannot be the same",
    path: ["destinationHubId"],
  }),
});

const UpdateShipmentStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "PENDING",
      "ASSIGNED",
      "PICKED_UP",
      "AT_ORIGIN_HUB",
      "IN_TRANSIT",
      "AT_DESTINATION_HUB",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELIVERY_FAILED",
      "RETURNED",
      "CANCELLED",
    ]),
    hubId: z.string().uuid().optional(),
    note: z.string().optional(),
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