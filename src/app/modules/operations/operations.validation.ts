import { z } from "zod";
const text = z.string().trim().min(2).max(255);
const phone = z.string().regex(/^(?:\+88|88)?01[3-9]\d{8}$/);
const money = z.number().min(0).max(1000000).multipleOf(0.01);
export const areaSchema = z
	.object({
		name: text,
		district: text,
		upazila: text,
		hubId: z.string().uuid(),
		pickupEnabled: z.boolean(),
		dropoffEnabled: z.boolean().default(false),
		deliveryEnabled: z.boolean(),
	})
	.strict();
export const rateSchema = z
	.object({
		pickupAreaId: z.string().uuid(),
		receiverAreaId: z.string().uuid(),
		serviceType: z.enum(["STANDARD", "EXPRESS", "SAME_DAY", "NEXT_DAY"]),
		baseWeight: z.number().min(0.01).max(100),
		baseCharge: money.refine((value) => value > 0),
		extraPerKg: money,
		pickupFee: money,
		codPercent: z.number().min(0).max(100).multipleOf(0.01),
		deliveryDays: z.number().int().min(0).max(30),
		cutoffMinutes: z.number().int().min(0).max(1439).nullable().optional(),
		active: z.boolean(),
	})
	.strict()
	.refine(
		(value) =>
			value.serviceType === "SAME_DAY"
				? value.deliveryDays === 0 && !!value.cutoffMinutes
				: value.deliveryDays >= 1,
		{ message: "Delivery days and same-day cutoff are required" },
	);
export const quoteSchema = z
	.object({
		pickupAreaId: z.string().uuid(),
		receiverAreaId: z.string().uuid(),
		weight: z.number().min(0.01).max(100).multipleOf(0.01),
		codAmount: money.default(0),
		serviceType: z
			.enum(["STANDARD", "EXPRESS", "SAME_DAY", "NEXT_DAY"])
			.default("STANDARD"),
		pickupMode: z.enum(["HOME", "BRANCH"]).default("HOME"),
		requestedPickupAt: z.string().datetime({ offset: true }).optional(),
	})
	.strict();
export const businessSchema = z
	.object({
		shopName: text,
		pickupAddress: z.string().trim().min(5).max(500),
		contactNumber: phone,
		payoutMethod: z.enum(["BANK", "BKASH"]),
		accountName: text,
		accountNumber: z
			.string()
			.trim()
			.min(8)
			.max(40)
			.regex(/^[0-9+ -]+$/),
	})
	.strict();
export const applicationSchema = z
	.object({
		contactNumber: phone,
		area: text,
		vehicleType: z.enum(["BICYCLE", "MOTORBIKE", "VAN"]),
	})
	.strict();
export const proofSchema = z
	.object({
		receiverName: text,
		signature: z
			.string()
			.max(100000)
			.regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
		acknowledged: z.literal(true),
	})
	.strict()
	.refine(
		(value) => {
			const bytes = Buffer.from(value.signature.split(",")[1], "base64");
			return (
				bytes.length >= 100 &&
				bytes.length <= 65000 &&
				bytes
					.subarray(0, 8)
					.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
			);
		},
		{ message: "Valid recipient signature is required", path: ["signature"] },
	);
