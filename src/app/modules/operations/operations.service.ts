import { Prisma, type ServiceArea, type RatePlan } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../errors/AppError";
import {
	calculateQuote,
	collectionAvailable,
	deliveryServiceAtCutoff,
} from "./operations.rules";
import {
	areaSchema,
	rateSchema,
	quoteSchema,
	businessSchema,
	applicationSchema,
} from "./operations.validation";
type Actor = { userId: string; role: string };
export async function operationsActor(
	tx: Prisma.TransactionClient,
	actor: Actor,
	requiredRole?: string,
) {
	const user = await tx.user.findUnique({ where: { id: actor.userId } });
	if (
		!user ||
		user.role !== actor.role ||
		(requiredRole && user.role !== requiredRole) ||
		user.status !== "ACTIVE" ||
		user.isDeleted ||
		!user.emailVerified
	)
		throw new AppError(403, "Account access changed");
	return user;
}
export const operationsLock = (tx: Prisma.TransactionClient) =>
	tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(704529)`;
export async function quoteInTransaction(
	tx: Prisma.TransactionClient,
	input: z.infer<typeof quoteSchema>,
) {
	const data = quoteSchema.parse(input);
	const areas = await tx.serviceArea.findMany({
		where: { id: { in: [data.pickupAreaId, data.receiverAreaId] } },
	});
	const from = areas.find((area) => area.id === data.pickupAreaId);
	const to = areas.find((area) => area.id === data.receiverAreaId);
	if (
		!from ||
		!to?.deliveryEnabled ||
		!collectionAvailable(from, data.pickupMode)
	)
		throw new AppError(409, "Delivery area is not available");
	const hubs = await tx.hub.findMany({
		where: {
			id: { in: [...new Set([from.hubId, to.hubId])] },
			isDeleted: false,
		},
		select: { id: true, name: true, address: true },
	});
	if (hubs.length !== new Set([from.hubId, to.hubId]).size)
		throw new AppError(409, "Active route hubs are required");
	let rate = await tx.ratePlan.findUnique({
		where: {
			pickupAreaId_receiverAreaId_serviceType: {
				pickupAreaId: from.id,
				receiverAreaId: to.id,
				serviceType: data.serviceType,
			},
		},
	});
	if (!rate?.active)
		throw new AppError(409, "Approved pricing is not available");
	const effectiveService = deliveryServiceAtCutoff(
		data.serviceType,
		rate.cutoffMinutes,
		new Date(),
		data.requestedPickupAt,
	);
	if (effectiveService !== data.serviceType) {
		rate = await tx.ratePlan.findUnique({
			where: {
				pickupAreaId_receiverAreaId_serviceType: {
					pickupAreaId: from.id,
					receiverAreaId: to.id,
					serviceType: effectiveService,
				},
			},
		});
		if (!rate?.active)
			throw new AppError(
				409,
				"Approved next-day pricing is required after cutoff",
			);
	}
	const price = calculateQuote(
		rate,
		data.weight,
		data.codAmount,
		data.pickupMode,
	);
	if (new Prisma.Decimal(price.deliveryCharge).gt(1000000))
		throw new AppError(
			409,
			"Calculated delivery charge exceeds supported limit",
		);
	return {
		...price,
		serviceType: effectiveService,
		requestedServiceType: data.serviceType,
		originHubId: from.hubId,
		destinationHubId: to.hubId,
		originHub: hubs.find((hub) => hub.id === from.hubId),
		deliveryDays: rate.deliveryDays,
		ratePlanId: rate.id,
		rateUpdatedAt: rate.updatedAt,
	};
}
const coverage = () =>
	prisma.serviceArea.findMany({
		select: {
			id: true,
			name: true,
			district: true,
			upazila: true,
			pickupEnabled: true,
			dropoffEnabled: true,
			deliveryEnabled: true,
		},
		orderBy: { name: "asc" },
		take: 2000,
	});
const quote = (input: unknown) =>
	prisma.$transaction((tx) => quoteInTransaction(tx, quoteSchema.parse(input)));
const quotes = (input: unknown) =>
	prisma.$transaction(async (tx) => {
		const rows = z.array(quoteSchema).min(1).max(100).parse(input);
		const cache = new Map<
			string,
			Awaited<ReturnType<typeof quoteInTransaction>>
		>();
		const results = [];
		for (const row of rows) {
			const key = JSON.stringify(row);
			const value = cache.get(key) ?? (await quoteInTransaction(tx, row));
			cache.set(key, value);
			results.push(value);
		}
		return results;
	});
const configure = (kind: string, input: unknown, actor: Actor, id?: string) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "ADMIN");
		let result: ServiceArea | RatePlan;
		if (kind === "area") {
			const data = areaSchema.parse(input);
			if (
				!(await tx.hub.findUnique({
					where: { id: data.hubId, isDeleted: false },
				}))
			)
				throw new AppError(400, "Active hub not found");
			result = id
				? await tx.serviceArea.update({ where: { id }, data })
				: await tx.serviceArea.create({ data });
		} else {
			const data = rateSchema.parse(input);
			if (
				(await tx.serviceArea.count({
					where: {
						id: { in: [...new Set([data.pickupAreaId, data.receiverAreaId])] },
					},
				})) !== new Set([data.pickupAreaId, data.receiverAreaId]).size
			)
				throw new AppError(400, "Service area not found");
			result = id
				? await tx.ratePlan.update({ where: { id }, data })
				: await tx.ratePlan.create({ data });
		}
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: "CONFIGURE_OPERATIONS",
				entityId: result.id,
				entityType: kind.toUpperCase(),
				details: { changed: true },
			},
		});
		return result;
	});
const business = (input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "CUSTOMER");
		const data = businessSchema.parse(input);
		const result = await tx.businessAccount.upsert({
			where: { userId: actor.userId },
			create: { userId: actor.userId, ...data },
			update: { ...data, approved: false, reviewNote: null },
		});
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: "SUBMIT_BUSINESS",
				entityId: result.id,
				entityType: "BUSINESS",
			},
		});
		return result;
	});
const apply = (input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "CUSTOMER");
		const existing = await tx.courierApplication.findUnique({
			where: { userId: actor.userId },
		});
		if (existing && existing.status !== "REJECTED")
			throw new AppError(409, "Application already exists");
		return tx.courierApplication.upsert({
			where: { userId: actor.userId },
			create: { userId: actor.userId, ...applicationSchema.parse(input) },
			update: {
				...applicationSchema.parse(input),
				status: "PENDING",
				reviewNote: null,
			},
		});
	});
const review = (kind: string, id: string, input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(702045)`;
		await operationsLock(tx);
		await operationsActor(tx, actor, "ADMIN");
		const data = z
			.object({
				approved: z.boolean(),
				hubId: z.string().uuid().optional(),
				note: z.string().trim().min(2).max(500),
			})
			.strict()
			.parse(input);
		if (kind === "business") {
			const result = await tx.businessAccount.update({
				where: { id },
				data: { approved: data.approved, reviewNote: data.note },
			});
			await tx.auditLog.create({
				data: {
					userId: actor.userId,
					action: "REVIEW_BUSINESS",
					entityId: id,
					entityType: "BUSINESS",
					details: { approved: data.approved },
				},
			});
			return result;
		}
		const application = await tx.courierApplication.findUnique({
			where: { id },
		});
		if (!application || application.status !== "PENDING")
			throw new AppError(409, "Pending application required");
		const user = await tx.user.findUnique({
			where: { id: application.userId },
		});
		if (
			!user ||
			user.role !== "CUSTOMER" ||
			user.isDeleted ||
			user.status !== "ACTIVE" ||
			!user.emailVerified
		)
			throw new AppError(409, "Verified customer account required");
		if (data.approved) {
			if (
				!data.hubId ||
				!(await tx.hub.findUnique({
					where: { id: data.hubId, isDeleted: false },
				}))
			)
				throw new AppError(400, "Active hub is required");
			const active = await tx.shipment.count({
				where: {
					senderId: user.id,
					status: { notIn: ["DELIVERED", "RETURNED", "CANCELLED"] },
					isDeleted: false,
				},
			});
			if (active)
				throw new AppError(409, "Finish existing customer shipments first");
			if (await tx.businessAccount.findUnique({ where: { userId: user.id } }))
				throw new AppError(409, "Business accounts cannot become couriers");
			await tx.courier.upsert({
				where: { userId: user.id },
				create: {
					userId: user.id,
					contactNumber: application.contactNumber,
					vehicleType: application.vehicleType,
					currentHubId: data.hubId,
				},
				update: {
					contactNumber: application.contactNumber,
					currentHubId: data.hubId,
					vehicleType: application.vehicleType,
					isDeleted: false,
				},
			});
			await tx.user.update({
				where: { id: user.id },
				data: { role: "COURIER", tokenVersion: { increment: 1 } },
			});
		}
		const result = await tx.courierApplication.update({
			where: { id },
			data: {
				status: data.approved ? "APPROVED" : "REJECTED",
				reviewNote: data.note,
			},
		});
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: "REVIEW_COURIER_APPLICATION",
				entityId: id,
				entityType: "APPLICATION",
				details: { approved: data.approved },
			},
		});
		return result;
	});

const mine = async (actor: Actor) => {
	const owner =
		actor.role === "COURIER"
			? { courierId: actor.userId }
			: { merchantId: actor.userId };
	const parcelOwner =
		actor.role === "COURIER"
			? { courierId: actor.userId }
			: { senderId: actor.userId };
	const [business, application, collections, expected, collected, paid, held] =
		await prisma.$transaction(
			[
				actor.role === "CUSTOMER"
					? prisma.businessAccount.findUnique({
							where: { userId: actor.userId },
						})
					: prisma.businessAccount.findFirst({ where: { id: "never-match" } }),
				prisma.courierApplication.findUnique({
					where: { userId: actor.userId },
				}),
				prisma.cashCollection.findMany({
					where: owner,
					orderBy: { createdAt: "desc" },
					take: 200,
				}),
				prisma.shipment.aggregate({
					where: {
						...parcelOwner,
						isDeleted: false,
						status: { notIn: ["RETURNED", "CANCELLED"] },
					},
					_sum: { codAmount: true },
				}),
				prisma.cashCollection.aggregate({
					where: owner,
					_sum: { amount: true, payable: true },
				}),
				prisma.cashCollection.aggregate({
					where: { ...owner, status: "PAID" },
					_sum: { payable: true },
				}),
				prisma.cashCollection.aggregate({
					where: { ...owner, status: "COLLECTED" },
					_sum: { amount: true },
				}),
			],
			{ isolationLevel: "RepeatableRead" },
		);
	const zero = new Prisma.Decimal(0);
	const amount = collected._sum.amount ?? zero;
	const payable = collected._sum.payable ?? zero;
	const paidAmount = paid._sum.payable ?? zero;
	const expectedAmount = expected._sum.codAmount ?? zero;
	return {
		business,
		application,
		collections,
		totals: {
			expected: expectedAmount.toString(),
			collected: amount.toString(),
			payable: payable.toString(),
			paid: paidAmount.toString(),
			pending: payable.minus(paidAmount).toString(),
			awaitingCollection: Prisma.Decimal.max(
				expectedAmount.minus(amount),
				0,
			).toString(),
			heldByWorker: (held._sum.amount ?? zero).toString(),
		},
	};
};
const admin = async () => ({
	payoutAccounts: await prisma.businessAccount.findMany({
		where: { approved: true, user: { status: "ACTIVE", isDeleted: false } },
		take: 2000,
	}),
	couriers: await prisma.courier.findMany({
		where: {
			isDeleted: false,
			user: { role: "COURIER", status: "ACTIVE", isDeleted: false },
		},
		select: {
			userId: true,
			currentHubId: true,
			isAvailable: true,
			user: {
				select: {
					name: true,
					_count: {
						select: {
							deliveries: {
								where: {
									isDeleted: false,
									status: {
										notIn: ["PENDING", "DELIVERED", "RETURNED", "CANCELLED"],
									},
								},
							},
						},
					},
				},
			},
		},
		take: 2000,
	}),
	areas: await prisma.serviceArea.findMany({
		orderBy: { name: "asc" },
		take: 2000,
	}),
	rates: await prisma.ratePlan.findMany({ take: 2000 }),
	applications: await prisma.courierApplication.findMany({
		where: { status: "PENDING" },
		include: { user: { select: { name: true, email: true } } },
		take: 200,
	}),
	businesses: await prisma.businessAccount.findMany({
		where: { approved: false },
		include: { user: { select: { name: true, email: true } } },
		take: 200,
	}),
	collections: await prisma.cashCollection.findMany({
		where: { status: { not: "PAID" } },
		orderBy: { createdAt: "asc" },
		take: 200,
	}),
});
const settle = (id: string, input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "ADMIN");
		const data = z
			.object({
				action: z.enum(["RECEIVE", "PAY"]),
				reference: z.string().trim().min(6).max(100),
				accountVersion: z.string().datetime().optional(),
			})
			.strict()
			.parse(input);
		const record = await tx.cashCollection.findUnique({ where: { id } });
		if (
			!record ||
			record.status !== (data.action === "RECEIVE" ? "COLLECTED" : "RECEIVED")
		)
			throw new AppError(409, "Collection state changed");
		let payoutAccount: Record<string, string> | undefined;
		if (data.action === "PAY") {
			const business = await tx.businessAccount.findUnique({
				where: {
					userId: record.merchantId,
					user: { status: "ACTIVE", isDeleted: false },
				},
			});
			if (
				!business?.approved ||
				data.accountVersion !== business.updatedAt.toISOString()
			)
				throw new AppError(409, "Approved payout account required");
			payoutAccount = {
				id: business.id,
				version: business.updatedAt.toISOString(),
				method: business.payoutMethod,
				accountName: business.accountName,
				accountLast4: business.accountNumber.slice(-4),
			};
		}
		const result = await tx.cashCollection.update({
			where: { id },
			data:
				data.action === "RECEIVE"
					? {
							status: "RECEIVED",
							receiptReference: data.reference,
							receivedAt: new Date(),
						}
					: {
							status: "PAID",
							payoutReference: data.reference,
							paidAt: new Date(),
						},
		});
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action:
					data.action === "RECEIVE"
						? "RECEIVE_COD_CASH"
						: "RECORD_MANUAL_COD_PAYOUT",
				entityId: id,
				entityType: "COLLECTION",
				details: {
					reference: data.reference,
					...(payoutAccount ? { payoutAccount } : {}),
					amount:
						data.action === "PAY"
							? record.payable.toString()
							: record.amount.toString(),
				},
			},
		});
		return result;
	});
export const OperationsService = {
	coverage,
	quote,
	quotes,
	configure,
	business,
	apply,
	review,
	mine,
	admin,
	settle,
};
