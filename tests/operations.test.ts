import "./environment";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
	calculateQuote,
	collectionAvailable,
	deliveryServiceAtCutoff,
} from "../src/app/modules/operations/operations.rules";
import {
	areaSchema,
	rateSchema,
	quoteSchema,
	businessSchema,
	applicationSchema,
	proofSchema,
} from "../src/app/modules/operations/operations.validation";
import { ShipmentValidation } from "../src/app/modules/shipment/shipment.validation";
const rate = {
	baseWeight: 1,
	baseCharge: 80.25,
	extraPerKg: 20.15,
	pickupFee: 10.1,
	codPercent: 1.25,
};
const booking = {
	requestId: randomUUID(),
	quoteVersion: new Date().toISOString(),
	quotedDeliveryCharge: 90.35,
	quotedCodFee: 0,
	pickupAreaId: randomUUID(),
	receiverAreaId: randomUUID(),
	senderPhone: "01712345678",
	pickupAddress: "Sender test address",
	receiverName: "Receiver",
	receiverPhone: "01812345678",
	receiverAddress: "Receiver test address",
	weight: 1,
	productType: "PARCEL",
	declaredValue: 0,
	codAmount: 0,
	requestedPickupAt: new Date(Date.now() + 86400000).toISOString(),
};
test("approved tariff calculation uses exact decimals and rounds extra weight upwards", () => {
	const q = calculateQuote(rate, 1.01, 1000, "HOME");
	assert.deepEqual(q, {
		baseCharge: "80.25",
		extraWeightCharge: "20.15",
		pickupFee: "10.1",
		deliveryCharge: "110.5",
		codFee: "12.5",
		merchantPayable: "987.5",
	});
	assert.equal(
		calculateQuote(rate, 3.01, 0, "HOME").extraWeightCharge,
		"60.45",
	);
});
test("branch dropoff removes only the approved pickup fee", () => {
	const q = calculateQuote(rate, 1, 0, "BRANCH");
	assert.equal(q.pickupFee, "0");
	assert.equal(q.deliveryCharge, "80.25");
	assert.equal(q.codFee, "0");
});
test("operation inputs reject privilege, money and hub injection", () => {
	assert.throws(() =>
		quoteSchema.parse({
			pickupAreaId: randomUUID(),
			receiverAreaId: randomUUID(),
			weight: 1,
			price: 0,
		}),
	);
	assert.throws(() =>
		applicationSchema.parse({
			contactNumber: "01712345678",
			area: "Dhaka",
			vehicleType: "VAN",
			status: "APPROVED",
		}),
	);
	assert.throws(() =>
		businessSchema.parse({
			shopName: "Shop",
			pickupAddress: "Test address",
			contactNumber: "01712345678",
			payoutMethod: "BANK",
			accountName: "Test Name",
			accountNumber: "1234567890",
			approved: true,
		}),
	);
	assert.throws(() =>
		areaSchema.parse({
			name: "Area",
			district: "Dhaka",
			upazila: "Mirpur",
			hubId: "invalid",
			pickupEnabled: true,
			deliveryEnabled: true,
		}),
	);
});
test("bookings require future pickup, supported precision and valid declared COD", () => {
	assert.doesNotThrow(() =>
		ShipmentValidation.CreateShipmentSchema.parse({ body: booking }),
	);
	for (const change of [
		{ requestedPickupAt: new Date(0).toISOString() },
		{ requestedPickupAt: new Date(Date.now() + 31 * 86400000).toISOString() },
		{ weight: 0 },
		{ weight: 1.001 },
		{ codAmount: 1 },
		{ senderPhone: "123" },
	])
		assert.throws(() =>
			ShipmentValidation.CreateShipmentSchema.parse({
				body: { ...booking, ...change },
			}),
		);
});
test("customer bookings cannot select hubs or override sender and state", () => {
	for (const change of [
		{ originHubId: randomUUID() },
		{ senderId: randomUUID() },
		{ price: 1 },
		{ status: "DELIVERED" },
		{ payment: { create: { status: "PAID" } } },
	])
		assert.throws(() =>
			ShipmentValidation.CreateShipmentSchema.parse({
				body: { ...booking, ...change },
			}),
		);
});
test("approval tariffs reject impossible rates and unsupported service classes", () => {
	const input = {
		pickupAreaId: randomUUID(),
		receiverAreaId: randomUUID(),
		serviceType: "STANDARD",
		...rate,
		deliveryDays: 2,
		active: true,
	};
	assert.doesNotThrow(() => rateSchema.parse(input));
	for (const change of [
		{ codPercent: 101 },
		{ baseCharge: -1 },
		{ deliveryDays: 0 },
		{ serviceType: "WAREHOUSE" },
	])
		assert.throws(() => rateSchema.parse({ ...input, ...change }));
});
test("delivery acknowledgment rejects missing, oversized and non-PNG evidence", () => {
	for (const proof of [
		undefined,
		{
			receiverName: "Receiver",
			signature: "data:image/svg+xml;base64,AAAA",
			acknowledged: true,
		},
		{
			receiverName: "Receiver",
			signature: "data:image/png;base64,AAAA",
			acknowledged: true,
		},
		{
			receiverName: "Receiver",
			signature: "data:image/png;base64," + "A".repeat(100001),
			acknowledged: true,
		},
	])
		assert.throws(() => proofSchema.parse(proof));
});

test("branch availability never grants doorstep collection", () => {
	assert.equal(
		collectionAvailable(
			{ pickupEnabled: false, dropoffEnabled: true },
			"BRANCH",
		),
		true,
	);
	assert.equal(
		collectionAvailable({ pickupEnabled: false, dropoffEnabled: true }, "HOME"),
		false,
	);
});
test("Dhaka noon cutoff converts same-day requests to next-day and rejects an unset cutoff", () => {
	assert.equal(
		deliveryServiceAtCutoff("SAME_DAY", 720, new Date("2026-10-09T05:59:59Z")),
		"SAME_DAY",
	);
	assert.equal(
		deliveryServiceAtCutoff("SAME_DAY", 720, new Date("2026-10-09T06:00:00Z")),
		"NEXT_DAY",
	);
	assert.equal(
		deliveryServiceAtCutoff(
			"SAME_DAY",
			720,
			new Date("2026-10-09T04:00:00Z"),
			"2026-10-10T04:00:00Z",
		),
		"NEXT_DAY",
	);
	assert.throws(() => deliveryServiceAtCutoff("SAME_DAY", null, new Date()));
});
