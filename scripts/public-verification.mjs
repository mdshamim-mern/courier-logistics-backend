import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env"), quiet: true });
assert(
	process.argv.includes("--apply-owned-fixtures"),
	"Explicit owned-fixture flag required",
);
assert.equal(
	process.env.DATABASE_URL,
	process.env.STAGING_DATABASE_URL,
	"Staging database must match",
);
assert(
	process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
	"Stripe test key required",
);
const frontend = "https://courier-frontend-sigma.vercel.app";
const backend = "https://courier-logistics-backend-lake.vercel.app";
const require = createRequire(
	path.join(root, "../courier-frontend/package.json"),
);
const { chromium, request } = require("@playwright/test");
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	timeout: 15000,
	maxNetworkRetries: 0,
});
const runId = randomUUID();
const userIds = [];
const contexts = [];
const checkoutIds = [];
const results = [];
let browser;
let failure;
function result(test, details = {}) {
	const item = { test, passed: true, ...details };
	results.push(item);
	console.log(JSON.stringify(item));
}
async function context() {
	const value = await request.newContext({
		baseURL: frontend + "/api/backend",
		extraHTTPHeaders: { Origin: frontend, "X-Courier-Client": "1" },
		timeout: 45000,
	});
	contexts.push(value);
	return value;
}
async function api(client, method, route, data, expected = 200) {
	const response = await client.fetch(frontend + "/api/backend" + route, {
		method,
		data,
	});
	const json = await response.json();
	assert.equal(
		response.status(),
		expected,
		method + " " + route + ": " + json.message,
	);
	return json.data;
}
async function fixture(label, role = "CUSTOMER") {
	const password = randomUUID() + "Aa1!";
	const value = await prisma.user.create({
		data: {
			name: "STAGING TEST ONLY " + label,
			email: label + "-" + runId + "@example.invalid",
			password: await bcrypt.hash(password, 12),
			role,
			emailVerified: true,
			...(role === "CUSTOMER" ? { customer: { create: {} } } : {}),
		},
	});
	userIds.push(value.id);
	const client = await context();
	await api(client, "POST", "/auth/login", { email: value.email, password });
	return { ...value, password, client };
}
async function book(client, input, codAmount) {
	const quote = await api(client, "POST", "/operations/quote", {
		...input,
		codAmount,
	});
	const body = {
		...input,
		codAmount,
		requestId: randomUUID(),
		quoteVersion: quote.rateUpdatedAt,
		quotedServiceType: quote.serviceType,
		quotedDeliveryCharge: Number(quote.deliveryCharge),
		quotedCodFee: Number(quote.codFee),
		receiverName: "STAGING RECEIVER",
		receiverPhone: "01712345678",
		receiverAddress: "STAGING TEST ONLY Dhanmondi",
		senderPhone: "01712345678",
		pickupAddress: "STAGING TEST ONLY Mirpur",
		productType: "PARCEL",
		declaredValue: codAmount,
		deliveryInstructions: "STAGING SIMULATION NO PHYSICAL PARCEL",
	};
	const shipment = await api(client, "POST", "/shipments", body, 201);
	const duplicate = await api(client, "POST", "/shipments", body, 201);
	assert.equal(duplicate.id, shipment.id);
	return shipment;
}
async function status(worker, shipment, value, more = {}, expected = 200) {
	return api(
		worker.client,
		"PATCH",
		"/shipments/" + shipment.id + "/status",
		{ status: value, ...more },
		expected,
	);
}
async function routeParcel(admin, north, south, shipment) {
	await api(admin.client, "PATCH", "/shipments/" + shipment.id + "/assign", {
		courierId: north.id,
	});
	for (const value of [
		"PICKED_UP",
		"AT_ORIGIN_HUB",
		"IN_TRANSIT",
		"AT_DESTINATION_HUB",
	])
		await status(north, shipment, value);
	await api(admin.client, "PATCH", "/shipments/" + shipment.id + "/handoff", {
		courierId: south.id,
	});
	await api(north.client, "GET", "/shipments/" + shipment.id, undefined, 403);
	await status(south, shipment, "OUT_FOR_DELIVERY");
}
try {
	const guest = await context();
	for (const route of [
		"/bn",
		"/bn/coverage",
		"/bn/pricing",
		"/bn/merchant-register",
		"/bn/courier-apply",
	]) {
		const response = await guest.get(frontend + route);
		assert.equal(response.status(), 200, route);
	}
	result("public_pages");
	const areas = await api(guest, "GET", "/operations/coverage");
	assert.equal(areas.length, 9);
	const area = (name) => areas.find((value) => value.name === name);
	const input = {
		pickupAreaId: area("মিরপুর").id,
		receiverAreaId: area("ধানমন্ডি").id,
		weight: 1,
		serviceType: "STANDARD",
		pickupMode: "HOME",
		requestedPickupAt: new Date(Date.now() + 86400000).toISOString(),
	};
	const quote = await api(guest, "POST", "/operations/quote", {
		...input,
		codAmount: 100,
	});
	assert.equal(Number(quote.deliveryCharge), 60);
	assert.equal(Number(quote.codFee), 1);
	assert.equal(Number(quote.merchantPayable), 99);
	const outside = await api(guest, "POST", "/operations/quote", {
		...input,
		weight: 2,
		codAmount: 100,
		receiverAreaId: area("বগুড়া সদর").id,
	});
	assert.equal(Number(outside.deliveryCharge), 155);
	assert.equal(Number(outside.codFee), 1.5);
	assert.equal(area("বগুড়া সদর").pickupEnabled, false);
	assert.equal(area("বগুড়া সদর").dropoffEnabled, true);
	await api(
		guest,
		"POST",
		"/operations/quote",
		{ ...input, pickupAreaId: area("বগুড়া সদর").id },
		409,
	);
	await api(
		guest,
		"POST",
		"/operations/quote",
		{ ...input, pickupAreaId: area("বগুড়া সদর").id, pickupMode: "BRANCH" },
		409,
	);
	const tomorrow = await api(guest, "POST", "/operations/quote", {
		...input,
		serviceType: "SAME_DAY",
	});
	assert.equal(tomorrow.serviceType, "NEXT_DAY");
	const today = await api(guest, "POST", "/operations/quote", {
		...input,
		requestedPickupAt: new Date().toISOString(),
		serviceType: "SAME_DAY",
	});
	const local = new Date(Date.now() + 6 * 3600000);
	assert.equal(
		today.serviceType,
		local.getUTCHours() < 12 ? "SAME_DAY" : "NEXT_DAY",
	);
	result("approved_coverage_prices_and_cutoff");
	await api(guest, "GET", "/operations/admin", undefined, 401);
	const unsigned = await guest.post(
		backend + "/api/v1/payments/stripe/webhook",
		{ data: {} },
	);
	assert.equal(unsigned.status(), 400);
	result("unauthenticated_admin_and_unsigned_webhook_rejected");
	const merchant = await fixture("merchant");
	const admin = await fixture("admin", "ADMIN");
	const north = await fixture("north-worker");
	const south = await fixture("south-worker");
	const stranger = await fixture("stranger");
	const business = await api(merchant.client, "PUT", "/operations/business", {
		shopName: "STAGING TEST ONLY STORE",
		pickupAddress: "STAGING TEST ONLY Mirpur",
		contactNumber: "01712345678",
		payoutMethod: "BANK",
		accountName: "STAGING SIMULATION NO PAYMENT",
		accountNumber: "000000000000",
	});
	await api(
		admin.client,
		"PATCH",
		"/operations/business/" + business.id + "/review",
		{ approved: true, note: "STAGING TEST ONLY" },
	);
	for (const [worker, hubId] of [
		[north, quote.originHubId],
		[south, quote.destinationHubId],
	]) {
		const application = await api(
			worker.client,
			"POST",
			"/operations/applications",
			{
				contactNumber: "01712345678",
				area: "STAGING TEST ONLY",
				vehicleType: "BICYCLE",
			},
		);
		await api(
			admin.client,
			"PATCH",
			"/operations/applications/" + application.id + "/review",
			{ approved: true, hubId, note: "STAGING TEST ONLY" },
		);
		await api(worker.client, "GET", "/operations/mine", undefined, 401);
		await api(worker.client, "POST", "/auth/login", {
			email: worker.email,
			password: worker.password,
		});
	}
	result("business_and_courier_approval_and_session_revocation");
	const minimumParcel = await book(merchant.client, input, 0);
	for (let index = 0; index < 2; index++)
		await api(
			merchant.client,
			"POST",
			"/payments/stripe/initiate",
			{ shipmentId: minimumParcel.id },
			400,
		);
	const attempts = await prisma.paymentAttempt.findMany({
		where: { payment: { shipmentId: minimumParcel.id } },
	});
	assert.equal(attempts.length, 2);
	assert(attempts.every((value) => value.status === "FAILED"));
	result("stripe_minimum_fee_clear_error_and_safe_retry");
	const paidParcel = await book(merchant.client, { ...input, weight: 2 }, 100);
	await api(
		stranger.client,
		"GET",
		"/shipments/" + paidParcel.id,
		undefined,
		403,
	);
	const csrf = await merchant.client.post(frontend + "/api/backend/shipments", {
		data: {},
		headers: { "X-Courier-Client": "0" },
	});
	assert.equal(csrf.status(), 403);
	result("real_booking_idempotency_ownership_and_csrf");
	browser = await chromium.launch({ channel: "msedge", headless: true });
	const customerBrowser = await browser.newContext({
		storageState: await merchant.client.storageState(),
	});
	const page = await customerBrowser.newPage();
	await page.goto(frontend + "/bn/dashboard/my-shipments/" + paidParcel.id);
	await page.goto(frontend + "/bn/dashboard/new-shipment");
	await page
		.getByRole("combobox", {
			name: "সংগ্রহের এলাকা (জেলা / উপজেলা / এলাকা)",
			exact: true,
		})
		.selectOption(input.pickupAreaId);
	await page
		.getByRole("combobox", {
			name: "প্রাপকের এলাকা (জেলা / উপজেলা / এলাকা)",
			exact: true,
		})
		.selectOption(input.receiverAreaId);
	for (const [name, value] of [
		["senderPhone", "01712345678"],
		["pickupAddress", "STAGING TEST ONLY Mirpur"],
		["receiverName", "STAGING UI RECEIVER"],
		["receiverPhone", "01712345678"],
		["receiverAddress", "STAGING TEST ONLY Dhanmondi"],
		["weight", "2"],
		["declaredValue", "100"],
		["codAmount", "0"],
		[
			"requestedPickupAt",
			new Date(Date.now() + 86400000).toISOString().slice(0, 16),
		],
	])
		await page.locator('input[name="' + name + '"]').fill(value);
	await page.getByRole("button", { name: "বুকিংয়ের আগে মাশুল দেখুন" }).click();
	await page.getByLabel("ঠিকানা, মাশুল ও পণ্যের তথ্য যাচাই করেছি।").check();
	await page.getByRole("button", { name: "বুকিং নিশ্চিত করুন" }).click();
	await page.waitForURL(/\/bn\/dashboard\/my-shipments\/[a-f0-9-]{36}/, {
		timeout: 45000,
	});
	assert.equal(
		(await page
			.locator("svg[aria-label],img[aria-label],canvas[aria-label]")
			.count()) > 0,
		true,
	);
	result("public_bengali_booking_form_and_receipt");
	const signature = await page.evaluate(() => {
		const canvas = document.createElement("canvas");
		canvas.width = 220;
		canvas.height = 90;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, 220, 90);
		ctx.strokeStyle = "#1747ee";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(20, 70);
		ctx.lineTo(80, 20);
		ctx.lineTo(95, 65);
		ctx.lineTo(180, 35);
		ctx.stroke();
		return canvas.toDataURL("image/png");
	});
	const unpaidParcel = await book(merchant.client, input, 0);
	await routeParcel(admin, north, south, unpaidParcel);
	const proof = {
		receiverName: "STAGING RECEIVER",
		signature,
		acknowledged: true,
	};
	await status(south, unpaidParcel, "DELIVERED", { proof }, 409);
	await status(south, unpaidParcel, "DELIVERY_FAILED", {}, 400);
	await status(south, unpaidParcel, "DELIVERY_FAILED", {
		note: "STAGING recipient unavailable",
	});
	await status(south, unpaidParcel, "OUT_FOR_DELIVERY");
	await status(south, unpaidParcel, "DELIVERY_FAILED", {
		note: "STAGING recipient declined",
	});
	await status(south, unpaidParcel, "RETURNED", {
		note: "STAGING return completed",
	});
	await status(south, unpaidParcel, "OUT_FOR_DELIVERY", {}, 400);
	result("assignment_handoff_unpaid_delivery_rejection_retry_and_return");
	const checkout = await api(
		merchant.client,
		"POST",
		"/payments/stripe/initiate",
		{ shipmentId: paidParcel.id },
	);
	assert.equal(new URL(checkout.paymentUrl).hostname, "checkout.stripe.com");
	const sessionId = checkout.paymentUrl.match(/cs_test_[A-Za-z0-9]+/)?.[0];
	assert(sessionId, "Test checkout session required");
	checkoutIds.push(sessionId);
	const session = await stripe.checkout.sessions.retrieve(sessionId);
	assert.equal(session.livemode, false);
	assert.equal(session.amount_total, 7500);
	assert.equal(
		new URL(session.success_url).hostname,
		new URL(frontend).hostname,
	);
	result("public_stripe_test_checkout", { amountBDT: 75 });
	await page.route(frontend + "/**", (route) => {
		if (new URL(route.request().url()).pathname.includes("/payment/"))
			return route.fulfill({
				status: 200,
				contentType: "text/html",
				body: "<p>STAGING webhook verification: return-page reconciliation disabled</p>",
			});
		return route.continue();
	});
	await page.goto(checkout.paymentUrl);
	await page.waitForTimeout(2500);
	console.log(
		JSON.stringify({
			test: "stripe_checkout_fields",
			fields: await page.locator("input").evaluateAll((nodes) =>
				nodes.map((n) => ({
					name: n.name,
					placeholder: n.placeholder,
					type: n.type,
				})),
			),
		}),
	);
	await page.locator('input[name="cardNumber"]').fill("4242424242424242");
	await page.locator('input[name="cardExpiry"]').fill("12/34");
	await page.locator('input[name="cardCvc"]').fill("123");
	await page.locator('input[name="billingName"]').fill("STAGING TEST ONLY");
	await page.getByRole("button", { name: /^Pay|^পেমেন্ট|^পরিশোধ/ }).click();
	const deadline = Date.now() + 120000;
	let payment;
	while (Date.now() < deadline) {
		payment = await prisma.payment.findUnique({
			where: { shipmentId: paidParcel.id },
		});
		if (payment?.status === "PAID") break;
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}
	assert.equal(
		payment?.status,
		"PAID",
		"Actual checkout webhook must settle payment",
	);
	const confirmed = await stripe.checkout.sessions.retrieve(sessionId);
	assert.equal(confirmed.payment_status, "paid");
	const events = await stripe.events.list({
		type: "checkout.session.completed",
		created: {
			gte: Math.floor(new Date(session.created * 1000).getTime() / 1000),
		},
		limit: 100,
	});
	assert(events.data.some((event) => event.data.object.id === sessionId));
	result("actual_stripe_checkout_and_external_webhook_settlement");
	await routeParcel(admin, north, south, paidParcel);
	await status(
		south,
		paidParcel,
		"DELIVERED",
		{ proof, collectedAmount: 99 },
		400,
	);
	await status(south, paidParcel, "DELIVERED", { proof, collectedAmount: 100 });
	const ledger = await api(merchant.client, "GET", "/operations/mine");
	assert.equal(Number(ledger.totals.collected), 100);
	assert.equal(Number(ledger.totals.payable), 99);
	const collection = ledger.collections.find(
		(value) => value.shipmentId === paidParcel.id,
	);
	assert(collection);
	await api(
		admin.client,
		"PATCH",
		"/operations/collections/" + collection.id,
		{ action: "PAY", reference: "STAGING-SIMULATION-NO-CASH-" + runId },
		409,
	);
	await api(admin.client, "PATCH", "/operations/collections/" + collection.id, {
		action: "RECEIVE",
		reference: "STAGING-SIMULATION-NO-CASH-" + runId,
	});
	await api(admin.client, "PATCH", "/operations/collections/" + collection.id, {
		action: "PAY",
		reference: "STAGING-SIMULATION-NO-CASH-" + runId,
		accountVersion: ledger.business.updatedAt,
	});
	result("delivery_proof_exact_cod_and_manual_payout_record_simulation", {
		physicalCashTransferred: false,
	});
	const tracking = await api(
		guest,
		"GET",
		"/shipments/track/" + paidParcel.trackingId,
	);
	const publicText = JSON.stringify(tracking);
	assert(!publicText.includes("01712345678"));
	assert(!publicText.includes(signature));
	result("public_tracking_privacy");
} catch (error) {
	failure = true;
	console.log(
		JSON.stringify({
			passed: false,
			errorType: error.name,
			message: String(error.message)
				.replace(/cs_test_[A-Za-z0-9]+/g, "[SESSION]")
				.slice(0, 1800),
		}),
	);
} finally {
	if (browser) await browser.close();
	for (const id of checkoutIds) {
		try {
			const session = await stripe.checkout.sessions.retrieve(id);
			if (session.status === "open") await stripe.checkout.sessions.expire(id);
		} catch {
			failure = true;
			console.log(
				JSON.stringify({ test: "owned_checkout_cleanup", passed: false }),
			);
		}
	}
	for (const client of contexts) {
		try {
			await api(client, "POST", "/auth/logout", {});
		} catch {}
		await client.dispose();
	}
	if (userIds.length) {
		await prisma.$transaction(
			async (tx) => {
				const shipments = await tx.shipment.findMany({
					where: { senderId: { in: userIds } },
					select: { id: true },
				});
				const shipmentIds = shipments.map((value) => value.id);
				await tx.auditLog.deleteMany({
					where: {
						OR: [
							{ entityId: { in: shipmentIds } },
							{ userId: { in: userIds } },
						],
					},
				});
				await tx.shipment.deleteMany({
					where: { id: { in: shipmentIds }, senderId: { in: userIds } },
				});
				await tx.user.deleteMany({
					where: {
						id: { in: userIds },
						email: { endsWith: "-" + runId + "@example.invalid" },
					},
				});
			},
			{ timeout: 30000 },
		);
		assert.equal(
			await prisma.user.count({ where: { id: { in: userIds } } }),
			0,
		);
		assert.equal(
			await prisma.shipment.count({ where: { senderId: { in: userIds } } }),
			0,
		);
		result("owned_fixture_cleanup", {
			users: userIds.length,
			approvedHubsAndPricesUntouched: true,
		});
	}
	await prisma.$disconnect();
}
console.log(
	JSON.stringify({
		scope: "public_staging",
		runId,
		passedGroups: results.length,
		successful: !failure,
		bkash: "paused",
		automaticPayout: "not_performed",
	}),
);
if (failure) process.exitCode = 1;
