import { z } from "zod";
import { quoteSchema, proofSchema } from "../operations/operations.validation";

const CreateShipmentSchema = z.object({
	body: quoteSchema
		.extend({
			requestId: z.string().uuid(),
			quotedServiceType: z
				.enum(["STANDARD", "EXPRESS", "SAME_DAY", "NEXT_DAY"])
				.optional(),
			quoteVersion: z.string().datetime(),
			quotedDeliveryCharge: z.number().min(0).max(1000000).multipleOf(0.01),
			quotedCodFee: z.number().min(0).max(1000000).multipleOf(0.01),
			receiverName: z.string().trim().min(1).max(255),
			receiverPhone: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/),
			receiverAddress: z.string().trim().min(5).max(500),
			senderPhone: z.string().regex(/^(?:\+88|88)?01[3-9]\d{8}$/),
			pickupAddress: z.string().trim().min(5).max(500),
			productType: z.enum(["DOCUMENT", "PARCEL", "FRAGILE"]),
			declaredValue: z.number().min(0).max(1000000).multipleOf(0.01),
			requestedPickupAt: z
				.string()
				.datetime({ offset: true })
				.refine(
					(value) =>
						Date.parse(value) > Date.now() &&
						Date.parse(value) < Date.now() + 30 * 86400000,
					"Pickup time must be within the next 30 days",
				),
			deliveryInstructions: z.string().trim().max(500).default(""),
		})
		.strict()
		.refine((value) => value.codAmount <= value.declaredValue, {
			message: "COD cannot exceed declared value",
			path: ["codAmount"],
		}),
});

const UpdateShipmentStatusSchema = z.object({
	body: z
		.object({
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
			note: z.string().trim().max(500).optional(),
			proof: proofSchema.optional(),
			collectedAmount: z
				.number()
				.min(0)
				.max(1000000)
				.multipleOf(0.01)
				.optional(),
		})
		.strict(),
});

const AssignCourierSchema = z.object({
	body: z
		.object({
			courierId: z.string().uuid(),
		})
		.strict(),
});

export const ShipmentValidation = {
	CreateShipmentSchema,
	UpdateShipmentStatusSchema,
	AssignCourierSchema,
};
