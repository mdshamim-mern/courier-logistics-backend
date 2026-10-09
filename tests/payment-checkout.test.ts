import "./environment";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import Stripe from "stripe";
import { prisma } from "../src/app/utils/prisma";
import {
	PaymentService,
	getStripe,
} from "../src/app/modules/payment/payment.service";

afterEach(() => mock.restoreAll());

function fixture() {
	const attempts: { id: string; status: string }[] = [];
	const tx = {
		$queryRaw: async () => [],
		shipment: {
			findUnique: async () => ({
				id: "shipment",
				senderId: "owner",
				status: "PENDING",
				price: { mul: () => ({ toNumber: () => 6000 }) },
				sender: { email: "test@example.invalid" },
			}),
		},
		payment: {
			upsert: async () => ({ id: "payment", status: "UNPAID" }),
			updateMany: async () => ({ count: 1 }),
		},
		paymentAttempt: {
			findFirst: async () =>
				attempts.find((value) => value.status === "UNPAID"),
			create: async () => {
				const value = {
					id: "attempt-" + attempts.length,
					status: "UNPAID",
					amount: { mul: () => ({ toNumber: () => 6000 }) },
					createdAt: new Date(),
				};
				attempts.push(value);
				return value;
			},
			findUnique: async ({ where }: any) => ({
				...attempts.find((value) => value.id === where.id),
				payment: { shipmentId: "shipment" },
			}),
			updateMany: async ({ where, data }: any) => {
				const value = attempts.find((value) => value.id === where.id);
				if (value) value.status = data.status;
				return { count: value ? 1 : 0 };
			},
		},
	};
	mock.method(prisma, "$transaction", async (callback: any) => callback(tx));
	return attempts;
}

test("Stripe minimum amount rejection fails the attempt and permits another attempt", async () => {
	const attempts = fixture();
	mock.method(getStripe().checkout.sessions, "create", async () => {
		throw new Stripe.errors.StripeInvalidRequestError({
			message: "private provider diagnostic",
			code: "amount_too_small",
		});
	});
	for (let index = 0; index < 2; index++)
		await assert.rejects(
			() => PaymentService.initiateStripePayment("shipment", "owner"),
			(error: any) =>
				error.statusCode === 400 &&
				error.message.includes("below Stripe minimum") &&
				!error.message.includes("private"),
		);
	assert.equal(attempts.length, 2);
	assert(attempts.every((value) => value.status === "FAILED"));
});

test("other definitive Stripe request rejections expose a generic retryable error", async () => {
	const attempts = fixture();
	mock.method(getStripe().checkout.sessions, "create", async () => {
		throw new Stripe.errors.StripeInvalidRequestError({
			message: "private configuration",
			code: "parameter_invalid",
		});
	});
	await assert.rejects(
		() => PaymentService.initiateStripePayment("shipment", "owner"),
		(error: any) =>
			error.statusCode === 502 &&
			error.message === "Stripe could not create checkout; please try again",
	);
	assert.equal(attempts[0].status, "FAILED");
});

test("ambiguous Stripe transport failures retain the pending attempt and block duplicates", async () => {
	const attempts = fixture();
	mock.method(getStripe().checkout.sessions, "create", async () => {
		throw new Stripe.errors.StripeConnectionError({
			message: "private connection diagnostic",
		});
	});
	await assert.rejects(
		() => PaymentService.initiateStripePayment("shipment", "owner"),
		(error: any) =>
			error.statusCode === 502 &&
			error.message.includes("awaiting provider verification"),
	);
	assert.equal(attempts[0].status, "UNPAID");
	await assert.rejects(
		() => PaymentService.initiateStripePayment("shipment", "owner"),
		(error: any) => error.statusCode === 409,
	);
	assert.equal(attempts.length, 1);
});
