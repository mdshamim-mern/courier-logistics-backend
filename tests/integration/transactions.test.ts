import "./environment";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { PaymentGateway, Role } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "../../src/app/utils/prisma";
import { connectRedis, redisClient } from "../../src/app/utils/redis";
import {
	createSession,
	rotateSession,
	revokeSession,
} from "../../src/app/utils/session";
import { ShipmentService } from "../../src/app/modules/shipment/shipment.service";
import { UserService } from "../../src/app/modules/user/user.service";
import { OperationsService } from "../../src/app/modules/operations/operations.service";
import { PaymentService } from "../../src/app/modules/payment/payment.service";

const userIds: string[] = [];
const hubIds: string[] = [];
const shipmentIds: string[] = [];
const areaIds: string[] = [];
const rateIds: string[] = [];
before(async () => {
	await prisma.$connect();
	await connectRedis();
});
after(async () => {
	await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
	await prisma.auditLog.deleteMany({
		where: {
			OR: [{ entityId: { in: shipmentIds } }, { userId: { in: userIds } }],
		},
	});
	await prisma.ratePlan.deleteMany({ where: { id: { in: rateIds } } });
	await prisma.serviceArea.deleteMany({ where: { id: { in: areaIds } } });
	await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	await prisma.hub.deleteMany({ where: { id: { in: hubIds } } });
	await prisma.$disconnect();
	if (redisClient.isOpen) await redisClient.quit();
});

async function fixtures() {
	const suffix = randomUUID();
	const sender = await prisma.user.create({
		data: {
			name: "Integration Customer",
			email: suffix + "@integration.test",
			role: Role.CUSTOMER,
			emailVerified: true,
			customer: { create: {} },
		},
	});
	userIds.push(sender.id);
	const admin = await prisma.user.create({
		data: {
			name: "Integration Admin",
			email: "admin-" + suffix + "@integration.test",
			role: Role.ADMIN,
			emailVerified: true,
		},
	});
	userIds.push(admin.id);
	const hub = await prisma.hub.create({
		data: {
			name: "Integration-" + suffix,
			location: "Dhaka",
			address: "Integration address",
		},
	});
	hubIds.push(hub.id);
	const destination = await prisma.hub.create({
		data: {
			name: "Destination-" + suffix,
			location: "Savar",
			address: "Integration address",
		},
	});
	hubIds.push(destination.id);
	const couriers = [];
	for (const number of [1, 2]) {
		const courier = await prisma.user.create({
			data: {
				name: "Integration Courier",
				email: "courier-" + number + "-" + suffix + "@integration.test",
				role: Role.COURIER,
				emailVerified: true,
				courier: {
					create: { contactNumber: "01712345678", currentHubId: hub.id },
				},
			},
		});
		userIds.push(courier.id);
		couriers.push(courier);
	}

	const pickup = await prisma.serviceArea.create({
		data: {
			name: "Pickup-" + suffix,
			district: "Dhaka",
			upazila: "Mirpur",
			hubId: hub.id,
			pickupEnabled: true,
			deliveryEnabled: true,
		},
	});
	const receiver = await prisma.serviceArea.create({
		data: {
			name: "Receiver-" + suffix,
			district: "Dhaka",
			upazila: "Savar",
			hubId: destination.id,
			pickupEnabled: true,
			deliveryEnabled: true,
		},
	});
	areaIds.push(pickup.id, receiver.id);
	const rate = await prisma.ratePlan.create({
		data: {
			pickupAreaId: pickup.id,
			receiverAreaId: receiver.id,
			baseWeight: 1,
			baseCharge: 120,
			extraPerKg: 20,
			pickupFee: 0,
			codPercent: 1,
			deliveryDays: 2,
			active: true,
		},
	});
	rateIds.push(rate.id);
	const input = {
		requestId: randomUUID(),
		quoteVersion: rate.updatedAt.toISOString(),
		quotedDeliveryCharge: 120,
		quotedCodFee: 0,
		receiverName: "Receiver",
		receiverPhone: "01712345678",
		receiverAddress: "Integration destination",
		weight: 1,
		pickupAreaId: pickup.id,
		receiverAreaId: receiver.id,
		senderPhone: "01712345678",
		pickupAddress: "Integration pickup address",
		pickupMode: "HOME" as const,
		serviceType: "STANDARD" as const,
		productType: "PARCEL" as const,
		declaredValue: 0,
		codAmount: 0,
		requestedPickupAt: new Date(Date.now() + 86400000).toISOString(),
		deliveryInstructions: "",
	};
	const shipment = await ShipmentService.createShipment(sender.id, input);
	shipmentIds.push(shipment.id);
	return {
		sender,
		admin,
		couriers,
		shipment,
		pickup,
		receiver,
		rate,
		input,
		hub,
		destination,
	};
}

test("concurrent courier assignment succeeds once and records one tracking event", async () => {
	const { admin, couriers, shipment } = await fixtures();
	const results = await Promise.allSettled(
		couriers.map((courier) =>
			ShipmentService.assignCourier(shipment.id, courier.id, admin.id),
		),
	);
	assert.equal(
		results.filter((result) => result.status === "fulfilled").length,
		1,
	);
	assert.equal(
		await prisma.shipmentTracking.count({
			where: { shipmentId: shipment.id, status: "ASSIGNED" },
		}),
		1,
	);
});

test("concurrent status changes cannot append duplicate tracking events", async () => {
	const { admin, couriers, shipment } = await fixtures();
	await ShipmentService.assignCourier(shipment.id, couriers[0].id, admin.id);
	const results = await Promise.allSettled(
		[1, 2].map(() =>
			ShipmentService.updateShipmentStatus(
				shipment.id,
				"PICKED_UP",
				couriers[0].id,
				"COURIER",
			),
		),
	);
	assert.equal(
		results.filter((result) => result.status === "fulfilled").length,
		1,
	);
	assert.equal(
		await prisma.shipmentTracking.count({
			where: { shipmentId: shipment.id, status: "PICKED_UP" },
		}),
		1,
	);
});

test("profile address and phone update together without changing role", async () => {
	const { sender } = await fixtures();
	const result = await UserService.updateMyProfile(sender.id, {
		name: "Updated Customer",
		address: "Updated integration address",
		contactNumber: "01812345678",
	});
	assert.equal(result.role, "CUSTOMER");
	assert.equal(result.customer?.address, "Updated integration address");
	assert.equal(result.customer?.contactNumber, result.contactNumber);
});

test("verified repeated Stripe events record money and audit once", async () => {
	const { shipment } = await fixtures();
	const payment = await prisma.payment.create({
		data: {
			shipmentId: shipment.id,
			amount: shipment.price,
			paymentGateway: PaymentGateway.STRIPE,
		},
	});
	const reference = "cs_test_" + randomUUID();
	const attempt = await prisma.paymentAttempt.create({
		data: {
			paymentId: payment.id,
			paymentGateway: PaymentGateway.STRIPE,
			amount: payment.amount,
			transactionId: reference,
		},
	});
	const event = {
		id: "evt_" + randomUUID(),
		type: "checkout.session.completed",
		data: {
			object: {
				id: reference,
				mode: "payment",
				payment_status: "paid",
				currency: "bdt",
				amount_total: 12000,
				payment_intent: "pi_" + randomUUID(),
				metadata: { shipmentId: shipment.id, attemptId: attempt.id },
			},
		},
	} as unknown as Stripe.Event;
	await Promise.all([
		PaymentService.handleStripeEvent(event),
		PaymentService.handleStripeEvent(event),
	]);
	assert.equal(
		(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }))
			.status,
		"PAID",
	);
	assert.equal(
		await prisma.auditLog.count({
			where: { entityId: shipment.id, action: "PAYMENT_SUCCESS" },
		}),
		1,
	);
	const expired = {
		...event,
		type: "checkout.session.expired",
	} as Stripe.Event;
	await PaymentService.handleStripeEvent(expired);
	assert.equal(
		(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }))
			.status,
		"PAID",
	);
});

test("Redis refresh rotation allows exactly one concurrent use", async () => {
	const { sender } = await fixtures();
	const tokens = await createSession(sender);
	try {
		const results = await Promise.allSettled(
			[1, 2].map(() =>
				rotateSession(sender, tokens.refreshToken, tokens.sessionId),
			),
		);
		assert.equal(
			results.filter((result) => result.status === "fulfilled").length,
			1,
		);
	} finally {
		await revokeSession(tokens.sessionId);
	}
});

test("pending payment attempts prevent cancellation", async () => {
	const { sender, shipment } = await fixtures();
	const payment = await prisma.payment.create({
		data: { shipmentId: shipment.id, amount: shipment.price },
	});
	await prisma.paymentAttempt.create({
		data: {
			paymentId: payment.id,
			amount: shipment.price,
			paymentGateway: PaymentGateway.BKASH,
		},
	});
	await assert.rejects(
		() => ShipmentService.cancelShipment(shipment.id, sender.id),
		(error: any) => error.statusCode === 409,
	);
	assert.equal(
		(await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } }))
			.status,
		"PENDING",
	);
});

test("payment reconciliation rejects a different customer", async () => {
	const { admin, shipment } = await fixtures();
	await assert.rejects(
		() => PaymentService.reconcilePayment(shipment.id, admin.id),
		(error: any) => error.statusCode === 403,
	);
});

test("shipment summary counts every matching shipment without a page limit", async () => {
	const { sender, shipment } = await fixtures();
	const extra = Array.from({ length: 104 }, () => ({
		id: randomUUID(),
		trackingId: "TRK-" + randomUUID(),
		senderId: sender.id,
		receiverName: "Receiver",
		receiverPhone: "01712345678",
		receiverAddress: "Integration address",
		weight: 1,
		price: 120,
	}));
	shipmentIds.push(...extra.map((item) => item.id));
	await prisma.shipment.createMany({ data: extra });
	await prisma.shipment.update({
		where: { id: shipment.id },
		data: { status: "DELIVERED" },
	});
	const summary = await ShipmentService.getShipmentSummary({
		userId: sender.id,
		role: "CUSTOMER",
	});
	assert.deepEqual(summary, {
		totalShipments: 105,
		activeShipments: 104,
		deliveredShipments: 1,
	});
});

const phone = "01712345678";
const actor = (user: { id: string; role: string }) => ({
	userId: user.id,
	role: user.role,
});
const businessInput = {
	shopName: "Integration shop",
	pickupAddress: "Integration pickup address",
	contactNumber: phone,
	payoutMethod: "BANK",
	accountName: "Integration merchant",
	accountNumber: "1234567890",
};
async function approveBusiness(f: Awaited<ReturnType<typeof fixtures>>) {
	const record = await OperationsService.business(
		businessInput,
		actor(f.sender),
	);
	await OperationsService.review(
		"business",
		record.id,
		{ approved: true, note: "Integration verified account" },
		actor(f.admin),
	);
	return record;
}
async function prepareDelivery(
	f: Awaited<ReturnType<typeof fixtures>>,
	id = f.shipment.id,
) {
	await prisma.payment.create({
		data: {
			shipmentId: id,
			amount: 120,
			status: "PAID",
			paymentGateway: "STRIPE",
		},
	});
	await ShipmentService.assignCourier(id, f.couriers[0].id, f.admin.id);
	for (const status of [
		"PICKED_UP",
		"AT_ORIGIN_HUB",
		"IN_TRANSIT",
		"AT_DESTINATION_HUB",
		"OUT_FOR_DELIVERY",
	] as const)
		await ShipmentService.updateShipmentStatus(
			id,
			status,
			f.couriers[0].id,
			"COURIER",
		);
}
const signature =
	"data:image/png;base64," +
	Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		Buffer.alloc(120, 1),
	]).toString("base64");
const evidence = {
	receiverName: "Integration Receiver",
	signature,
	acknowledged: true as const,
};

test("approved pricing uses exact decimals and unavailable areas fail closed", async () => {
	const f = await fixtures();
	const quote = await OperationsService.quote({
		pickupAreaId: f.pickup.id,
		receiverAreaId: f.receiver.id,
		weight: 1.01,
		codAmount: 100,
	});
	assert.equal(quote.deliveryCharge, "140");
	assert.equal(quote.codFee, "1");
	assert.equal(quote.merchantPayable, "99");
	await prisma.serviceArea.update({
		where: { id: f.receiver.id },
		data: { deliveryEnabled: false },
	});
	await assert.rejects(() =>
		OperationsService.quote({
			pickupAreaId: f.pickup.id,
			receiverAreaId: f.receiver.id,
			weight: 1,
		}),
	);
	await assert.rejects(
		() =>
			OperationsService.configure(
				"area",
				{
					name: "Unauthorized area",
					district: "Dhaka",
					upazila: "Savar",
					hubId: f.hub.id,
					pickupEnabled: true,
					deliveryEnabled: true,
				},
				actor(f.sender),
			),
		(e: any) => e.statusCode === 403,
	);
});

test("booking retries return one shipment and changed payload keys are rejected", async () => {
	const f = await fixtures();
	const body = { ...f.input, requestId: randomUUID() };
	const results = await Promise.all([
		ShipmentService.createShipment(f.sender.id, body),
		ShipmentService.createShipment(f.sender.id, body),
	]);
	shipmentIds.push(results[0].id);
	assert.equal(results[0].id, results[1].id);
	assert.equal(
		await prisma.shipmentTracking.count({
			where: { shipmentId: results[0].id, status: "PENDING" },
		}),
		1,
	);
	await assert.rejects(
		() => ShipmentService.createShipment(f.sender.id, { ...body, weight: 2 }),
		(e: any) => e.statusCode === 409,
	);
	await assert.rejects(
		() =>
			ShipmentService.createShipment(f.sender.id, {
				...f.input,
				requestId: randomUUID(),
				quotedDeliveryCharge: 1,
			}),
		(e: any) => e.statusCode === 409,
	);
});

test("changed rate versions and inactive pricing cannot be booked", async () => {
	const f = await fixtures();
	await prisma.ratePlan.update({
		where: { id: f.rate.id },
		data: { baseCharge: 140 },
	});
	await assert.rejects(
		() =>
			ShipmentService.createShipment(f.sender.id, {
				...f.input,
				requestId: randomUUID(),
			}),
		(e: any) => e.statusCode === 409,
	);
	await prisma.ratePlan.update({
		where: { id: f.rate.id },
		data: { active: false },
	});
	await assert.rejects(
		() =>
			OperationsService.quote({
				pickupAreaId: f.pickup.id,
				receiverAreaId: f.receiver.id,
				weight: 1,
			}),
		(e: any) => e.statusCode === 409,
	);
});

test("bulk booking is atomic and safely retryable", async () => {
	const f = await fixtures();
	const good = { ...f.input, requestId: randomUUID() };
	const unauthorizedCod = {
		...f.input,
		requestId: randomUUID(),
		codAmount: 100,
		declaredValue: 100,
		quotedCodFee: 1,
	};
	await assert.rejects(() =>
		ShipmentService.bulkCreate(f.sender.id, [good, unauthorizedCod]),
	);
	assert.equal(
		await prisma.shipment.count({ where: { senderId: f.sender.id } }),
		1,
	);
	const rows = [good, { ...f.input, requestId: randomUUID() }];
	const result = await ShipmentService.bulkCreate(f.sender.id, rows);
	shipmentIds.push(...result.map((row) => row.id));
	const retry = await ShipmentService.bulkCreate(f.sender.id, rows);
	assert.deepEqual(
		result.map((row) => row.id),
		retry.map((row) => row.id),
	);
	assert.equal(
		await prisma.shipment.count({ where: { senderId: f.sender.id } }),
		3,
	);
});

test("courier application cannot self-approve and approval revokes customer token version", async () => {
	const f = await fixtures(),
		a = actor(f.sender);
	const application = await OperationsService.apply(
		{ contactNumber: phone, area: "Integration area", vehicleType: "BICYCLE" },
		a,
	);
	assert.equal(
		(await prisma.user.findUniqueOrThrow({ where: { id: f.sender.id } })).role,
		"CUSTOMER",
	);
	await assert.rejects(
		() =>
			OperationsService.review(
				"application",
				application.id,
				{ approved: true, hubId: f.hub.id, note: "Self approve" },
				a,
			),
		(e: any) => e.statusCode === 403,
	);
	await assert.rejects(
		() =>
			OperationsService.review(
				"application",
				application.id,
				{ approved: true, hubId: f.hub.id, note: "Verified applicant" },
				actor(f.admin),
			),
		(e: any) => e.statusCode === 409,
	);
	await ShipmentService.cancelShipment(f.shipment.id, f.sender.id);
	await OperationsService.review(
		"application",
		application.id,
		{ approved: true, hubId: f.hub.id, note: "Verified applicant" },
		actor(f.admin),
	);
	const changed = await prisma.user.findUniqueOrThrow({
		where: { id: f.sender.id },
	});
	assert.equal(changed.role, "COURIER");
	assert.equal(changed.tokenVersion, 1);
});

test("delivery proof and exact COD are required and concurrent completion records money once", async () => {
	const f = await fixtures();
	await approveBusiness(f);
	const shipment = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		codAmount: 100,
		declaredValue: 100,
		quotedCodFee: 1,
	});
	shipmentIds.push(shipment.id);
	await prepareDelivery(f, shipment.id);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			shipment.id,
			"DELIVERED",
			f.couriers[0].id,
			"COURIER",
		),
	);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			shipment.id,
			"DELIVERED",
			f.couriers[0].id,
			"COURIER",
			undefined,
			undefined,
			evidence,
			99,
		),
	);
	assert.equal(
		await prisma.cashCollection.count({ where: { shipmentId: shipment.id } }),
		0,
	);
	const completed = await Promise.allSettled(
		[1, 2].map(() =>
			ShipmentService.updateShipmentStatus(
				shipment.id,
				"DELIVERED",
				f.couriers[0].id,
				"COURIER",
				undefined,
				undefined,
				evidence,
				100,
			),
		),
	);
	assert.equal(completed.filter((row) => row.status === "fulfilled").length, 1);
	assert.equal(
		await prisma.deliveryProof.count({ where: { shipmentId: shipment.id } }),
		1,
	);
	const collection = await prisma.cashCollection.findUniqueOrThrow({
		where: { shipmentId: shipment.id },
	});
	assert.equal(collection.amount.toString(), "100");
	assert.equal(collection.fee.toString(), "1");
	assert.equal(collection.payable.toString(), "99");
	const tracking = await ShipmentService.trackShipment(shipment.trackingId);
	for (const key of [
		"receiverPhone",
		"receiverAddress",
		"deliveryProof",
		"collection",
		"pickupAddress",
	])
		assert.equal(key in tracking, false);
});

test("COD receipt and manual payout have ordered transitions and no duplicate cash action", async () => {
	const f = await fixtures();
	const business = await approveBusiness(f);
	const shipment = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		codAmount: 100,
		declaredValue: 100,
		quotedCodFee: 1,
	});
	shipmentIds.push(shipment.id);
	await prepareDelivery(f, shipment.id);
	await ShipmentService.updateShipmentStatus(
		shipment.id,
		"DELIVERED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		undefined,
		evidence,
		100,
	);
	const collection = await prisma.cashCollection.findUniqueOrThrow({
		where: { shipmentId: shipment.id },
	});
	await assert.rejects(() =>
		OperationsService.settle(
			collection.id,
			{ action: "PAY", reference: "OUTSIDE-TRANSFER-" + randomUUID() },
			actor(f.admin),
		),
	);
	await OperationsService.settle(
		collection.id,
		{ action: "RECEIVE", reference: "CASH-RECEIPT-" + randomUUID() },
		actor(f.admin),
	);
	await OperationsService.business(businessInput, actor(f.sender));
	await assert.rejects(() =>
		OperationsService.settle(
			collection.id,
			{ action: "PAY", reference: "OUTSIDE-TRANSFER-" + randomUUID() },
			actor(f.admin),
		),
	);
	await OperationsService.review(
		"business",
		business.id,
		{ approved: true, note: "Verified account again" },
		actor(f.admin),
	);
	const reference = "OUTSIDE-TRANSFER-" + randomUUID();
	const accountVersion = (
		await prisma.businessAccount.findUniqueOrThrow({
			where: { id: business.id },
		})
	).updatedAt.toISOString();
	const result = await Promise.allSettled(
		[1, 2].map(() =>
			OperationsService.settle(
				collection.id,
				{ action: "PAY", reference, accountVersion },
				actor(f.admin),
			),
		),
	);
	assert.equal(result.filter((row) => row.status === "fulfilled").length, 1);
	const mine = await OperationsService.mine(actor(f.sender));
	assert.equal(mine.collections[0].status, "PAID");
	assert.equal(mine.totals.pending, "0");
	assert.equal(mine.totals.paid, "99");
});

test("failed deliveries require a reason, can retry, and return is terminal", async () => {
	const f = await fixtures();
	await prepareDelivery(f);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			f.shipment.id,
			"DELIVERY_FAILED",
			f.couriers[0].id,
			"COURIER",
		),
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"DELIVERY_FAILED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		"Receiver unavailable",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"OUT_FOR_DELIVERY",
		f.couriers[0].id,
		"COURIER",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"DELIVERY_FAILED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		"Receiver declined parcel",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"RETURNED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		"Returned to sender",
	);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			f.shipment.id,
			"OUT_FOR_DELIVERY",
			f.couriers[0].id,
			"COURIER",
		),
	);
});

test("hub handover checks hub, worker load, and removes former worker access", async () => {
	const f = await fixtures();
	await ShipmentService.assignCourier(
		f.shipment.id,
		f.couriers[0].id,
		f.admin.id,
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"PICKED_UP",
		f.couriers[0].id,
		"COURIER",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"AT_ORIGIN_HUB",
		f.couriers[0].id,
		"COURIER",
	);
	await prisma.courier.update({
		where: { userId: f.couriers[1].id },
		data: { currentHubId: f.destination.id },
	});
	await assert.rejects(() =>
		ShipmentService.handoffCourier(f.shipment.id, f.couriers[1].id, f.admin.id),
	);
	await prisma.courier.update({
		where: { userId: f.couriers[1].id },
		data: { currentHubId: f.hub.id },
	});
	await ShipmentService.handoffCourier(
		f.shipment.id,
		f.couriers[1].id,
		f.admin.id,
	);
	await assert.rejects(
		() =>
			ShipmentService.getSingleShipment(f.shipment.id, actor(f.couriers[0])),
		(e: any) => e.statusCode === 403,
	);
	assert.equal(
		(
			await ShipmentService.getSingleShipment(
				f.shipment.id,
				actor(f.couriers[1]),
			)
		).courierId,
		f.couriers[1].id,
	);
	assert.equal(
		(
			await ShipmentService.getAllShipments(
				{ task: "PICKUP" },
				actor(f.couriers[0]),
			)
		).data.length,
		0,
	);
});

test("branch-only coverage rejects home pickup and permits an approved dropoff booking", async () => {
	const f = await fixtures();
	await prisma.serviceArea.update({
		where: { id: f.pickup.id },
		data: { pickupEnabled: false, dropoffEnabled: true },
	});
	const input = {
		pickupAreaId: f.pickup.id,
		receiverAreaId: f.receiver.id,
		weight: 1,
		codAmount: 0,
		serviceType: "STANDARD",
		pickupMode: "HOME",
	};
	await assert.rejects(() => OperationsService.quote(input));
	const quote = await OperationsService.quote({
		...input,
		pickupMode: "BRANCH",
	});
	assert.equal(quote.deliveryCharge, "120");
	const saved = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		pickupMode: "BRANCH",
		quoteVersion: quote.rateUpdatedAt.toISOString(),
	});
	shipmentIds.push(saved.id);
	assert.equal(saved.pickupMode, "BRANCH");
});
test("same-day fallback is shown before booking and cannot silently change the accepted service", async () => {
	const f = await fixtures();
	for (const serviceType of ["SAME_DAY", "NEXT_DAY"]) {
		const rate = await prisma.ratePlan.create({
			data: {
				pickupAreaId: f.pickup.id,
				receiverAreaId: f.receiver.id,
				serviceType,
				baseWeight: 1,
				baseCharge: 120,
				extraPerKg: 20,
				pickupFee: 0,
				codPercent: 1,
				deliveryDays: serviceType === "SAME_DAY" ? 0 : 1,
				cutoffMinutes: serviceType === "SAME_DAY" ? 720 : null,
				active: true,
			},
		});
		rateIds.push(rate.id);
	}
	const quote = await OperationsService.quote({
		pickupAreaId: f.pickup.id,
		receiverAreaId: f.receiver.id,
		weight: 1,
		codAmount: 0,
		serviceType: "SAME_DAY",
		pickupMode: "HOME",
		requestedPickupAt: f.input.requestedPickupAt,
	});
	assert.equal(quote.serviceType, "NEXT_DAY");
	assert.equal(quote.deliveryDays, 1);
	await assert.rejects(() =>
		ShipmentService.createShipment(f.sender.id, {
			...f.input,
			requestId: randomUUID(),
			serviceType: "SAME_DAY",
			quotedServiceType: "SAME_DAY",
			quoteVersion: quote.rateUpdatedAt.toISOString(),
		}),
	);
	const saved = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		serviceType: "SAME_DAY",
		quotedServiceType: "NEXT_DAY",
		quoteVersion: quote.rateUpdatedAt.toISOString(),
	});
	shipmentIds.push(saved.id);
	assert.equal(saved.serviceType, "NEXT_DAY");
});

test("task filters separate urgent, late, failed and pickup work", async () => {
	const f = await fixtures();
	await ShipmentService.assignCourier(
		f.shipment.id,
		f.couriers[0].id,
		f.admin.id,
	);
	await prisma.shipment.update({
		where: { id: f.shipment.id },
		data: {
			serviceType: "EXPRESS",
			estimatedDelivery: new Date(Date.now() - 86400000),
		},
	});
	for (const task of ["URGENT", "LATE", "PICKUP"])
		assert.equal(
			(await ShipmentService.getAllShipments({ task }, actor(f.couriers[0])))
				.data.length,
			1,
		);
	assert.equal(
		(
			await ShipmentService.getAllShipments(
				{ task: "FAILED" },
				actor(f.couriers[0]),
			)
		).data.length,
		0,
	);
});
