import { Prisma, ShipmentStatus } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../utils/prisma";
import { lockCourier, lockShipment } from "../../utils/rowLocks";
import { listQuerySchema } from "../../utils/query";
import {
	ACTIVE_SHIPMENT_STATUSES,
	nextShipmentStatuses,
} from "./shipment.rules";
import { ShipmentValidation } from "./shipment.validation";
import {
	operationsLock,
	quoteInTransaction,
	operationsActor,
} from "../operations/operations.service";
import { proofSchema } from "../operations/operations.validation";

type Actor = { userId: string; role: string };
const publicPaymentSelect = {
	id: true,
	status: true,
	amount: true,
	currency: true,
	paymentGateway: true,
	paidAt: true,
} as const;

async function assertActiveHub(
	tx: Prisma.TransactionClient,
	id?: string | null,
) {
	if (id && !(await tx.hub.findUnique({ where: { id, isDeleted: false } })))
		throw new AppError(400, "Active hub not found");
}

async function assertCancellationSafe(
	tx: Prisma.TransactionClient,
	shipmentId: string,
	paymentStatus?: string,
) {
	if (paymentStatus === "PAID")
		throw new AppError(
			409,
			"Paid shipments require a refund before cancellation",
		);
	const pending = await tx.paymentAttempt.count({
		where: { payment: { shipmentId }, status: "UNPAID" },
	});
	if (pending)
		throw new AppError(
			409,
			"Payment must be verified before cancelling this shipment",
		);
}

async function createInTransaction(
	tx: Prisma.TransactionClient,
	userId: string,
	input: z.infer<typeof ShipmentValidation.CreateShipmentSchema>["body"],
) {
	const payload =
		ShipmentValidation.CreateShipmentSchema.shape.body.parse(input);
	await operationsActor(tx, { userId, role: "CUSTOMER" }, "CUSTOMER");
	const fingerprint = createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex");
	const prior = await tx.shipment.findUnique({
		where: { bookingKey: payload.requestId },
	});
	if (prior) {
		if (prior.senderId !== userId || prior.bookingFingerprint !== fingerprint)
			throw new AppError(409, "Booking request key already used");
		return prior;
	}
	const trackingId = `TRK-${randomUUID().replace(/-/g, "").toUpperCase()}`;
	const quote = await quoteInTransaction(tx, {
		pickupAreaId: payload.pickupAreaId,
		receiverAreaId: payload.receiverAreaId,
		weight: payload.weight,
		codAmount: payload.codAmount,
		serviceType: payload.serviceType,
		pickupMode: payload.pickupMode,
		requestedPickupAt: payload.requestedPickupAt,
	});
	if (
		((payload.serviceType === "SAME_DAY" ||
			payload.quotedServiceType !== undefined) &&
			payload.quotedServiceType !== quote.serviceType) ||
		quote.rateUpdatedAt.toISOString() !== payload.quoteVersion ||
		!new Prisma.Decimal(quote.deliveryCharge).equals(
			payload.quotedDeliveryCharge,
		) ||
		!new Prisma.Decimal(quote.codFee).equals(payload.quotedCodFee)
	)
		throw new AppError(409, "Pricing changed; review a new quote");
	const sender = await tx.user.findUnique({ where: { id: userId } });
	if (
		!sender ||
		sender.role !== "CUSTOMER" ||
		sender.isDeleted ||
		sender.status !== "ACTIVE" ||
		!sender.emailVerified
	)
		throw new AppError(403, "Verified customer account required");
	if (
		payload.codAmount > 0 &&
		!(await tx.businessAccount.findUnique({ where: { userId } }))?.approved
	)
		throw new AppError(409, "Approved business account required for COD");
	const shipment = await tx.shipment.create({
		data: {
			bookingKey: payload.requestId,
			bookingFingerprint: fingerprint,
			receiverName: payload.receiverName,
			receiverPhone: payload.receiverPhone,
			receiverAddress: payload.receiverAddress,
			weight: payload.weight,
			originHubId: quote.originHubId,
			destinationHubId: quote.destinationHubId,
			senderId: userId,
			trackingId,
			price: quote.deliveryCharge,
			status: ShipmentStatus.PENDING,
			senderPhone: payload.senderPhone,
			pickupAddress: payload.pickupAddress,
			pickupAreaId: payload.pickupAreaId,
			receiverAreaId: payload.receiverAreaId,
			pickupMode: payload.pickupMode,
			productType: payload.productType,
			declaredValue: payload.declaredValue,
			codAmount: payload.codAmount,
			codFee: quote.codFee,
			priceBreakdown: JSON.parse(JSON.stringify(quote)),
			requestedPickupAt: new Date(payload.requestedPickupAt),
			deliveryInstructions: payload.deliveryInstructions,
			serviceType: quote.serviceType,
			estimatedDelivery: new Date(
				Date.parse(payload.requestedPickupAt) + quote.deliveryDays * 86400000,
			),
		},
	});
	await tx.shipmentTracking.create({
		data: {
			shipmentId: shipment.id,
			status: ShipmentStatus.PENDING,
			updatedById: userId,
			note: "Shipment created",
		},
	});
	await tx.auditLog.create({
		data: {
			userId,
			action: "CREATE_SHIPMENT",
			entityId: shipment.id,
			entityType: "SHIPMENT",
			details: { trackingId, status: shipment.status },
		},
	});
	return shipment;
}
const createShipment = (
	userId: string,
	input: z.infer<typeof ShipmentValidation.CreateShipmentSchema>["body"],
) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		return createInTransaction(tx, userId, input);
	});
const bulkCreate = (userId: string, input: unknown) => {
	const payload = z
		.array(ShipmentValidation.CreateShipmentSchema.shape.body)
		.min(1)
		.max(100)
		.parse(input);
	return prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		const results = [];
		for (const row of payload)
			results.push(await createInTransaction(tx, userId, row));
		return results;
	});
};

const getAllShipments = async (query: unknown, user: Actor) => {
	const { searchTerm, status, task, page, limit, sortBy, sortOrder } =
		listQuerySchema.parse(query);
	const conditions: Prisma.ShipmentWhereInput[] = [{ isDeleted: false }];
	if (user.role === "CUSTOMER") conditions.push({ senderId: user.userId });
	if (user.role === "COURIER") conditions.push({ courierId: user.userId });
	if (status)
		conditions.push({ status: z.nativeEnum(ShipmentStatus).parse(status) });
	if (task === "UNASSIGNED")
		conditions.push({ status: "PENDING", courierId: null });
	if (task === "TODAY") {
		const now = new Date(Date.now() + 6 * 3600000);
		const start = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
				6 * 3600000,
		);
		const end = new Date(start.getTime() + 86400000);
		conditions.push({
			OR: [
				{ status: "ASSIGNED", requestedPickupAt: { gte: start, lt: end } },
				{
					status: "OUT_FOR_DELIVERY",
					estimatedDelivery: { gte: start, lt: end },
				},
			],
		});
	}
	if (task === "PICKUP") conditions.push({ status: "ASSIGNED" });
	if (task === "DELIVERY") conditions.push({ status: "OUT_FOR_DELIVERY" });
	if (task === "FAILED") conditions.push({ status: "DELIVERY_FAILED" });
	if (task === "URGENT")
		conditions.push({
			serviceType: { in: ["EXPRESS", "SAME_DAY"] },
			status: { notIn: ["DELIVERED", "RETURNED", "CANCELLED"] },
		});
	if (task === "LATE")
		conditions.push({
			estimatedDelivery: { lt: new Date() },
			status: { notIn: ["DELIVERED", "RETURNED", "CANCELLED"] },
		});
	if (searchTerm)
		conditions.push({
			OR: [
				{ trackingId: { contains: searchTerm, mode: "insensitive" } },
				{ receiverName: { contains: searchTerm, mode: "insensitive" } },
				{ receiverPhone: { contains: searchTerm, mode: "insensitive" } },
			],
		});
	const validSortBy = ["createdAt", "price", "weight", "status"].includes(
		sortBy,
	)
		? sortBy
		: "createdAt";
	const [shipments, total] = await prisma.$transaction([
		prisma.shipment.findMany({
			where: { AND: conditions },
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { [validSortBy]: sortOrder },
			include: {
				sender: { select: { name: true } },
				originHub: { select: { name: true, location: true } },
				destinationHub: { select: { name: true, location: true } },
				courier: { select: { name: true, email: true } },
				payment: { select: publicPaymentSelect },
			},
		}),
		prisma.shipment.count({ where: { AND: conditions } }),
	]);
	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data: shipments.map((shipment) => ({
			...shipment,
			paymentStatus: shipment.payment?.status ?? "UNPAID",
			allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role),
		})),
	};
};

const getShipmentSummary = async (user: Actor) => {
	const where: Prisma.ShipmentWhereInput = {
		isDeleted: false,
		...(user.role === "CUSTOMER"
			? { senderId: user.userId }
			: user.role === "COURIER"
				? { courierId: user.userId }
				: {}),
	};
	const groups = await prisma.shipment.groupBy({
		by: ["status"],
		where,
		_count: { _all: true },
	});
	return groups.reduce(
		(summary, group) => {
			summary.totalShipments += group._count._all;
			if (
				group.status === "PENDING" ||
				ACTIVE_SHIPMENT_STATUSES.includes(group.status)
			)
				summary.activeShipments += group._count._all;
			if (group.status === "DELIVERED")
				summary.deliveredShipments += group._count._all;
			return summary;
		},
		{ totalShipments: 0, activeShipments: 0, deliveredShipments: 0 },
	);
};

const getSingleShipment = async (id: string, user: Actor) => {
	const shipment = await prisma.shipment.findUnique({
		where: { id, isDeleted: false },
		include: {
			sender: { select: { name: true, email: true, contactNumber: true } },
			courier: { select: { name: true, email: true, contactNumber: true } },
			originHub: true,
			destinationHub: true,
			payment: { select: publicPaymentSelect },
			trackings: { orderBy: { createdAt: "desc" } },
			deliveryProof: {
				select: {
					receiverName: true,
					signature: true,
					createdAt: true,
					acknowledged: true,
				},
			},
			collection: true,
		},
	});
	if (!shipment) throw new AppError(404, "Shipment not found");
	if (
		(user.role === "CUSTOMER" && shipment.senderId !== user.userId) ||
		(user.role === "COURIER" && shipment.courierId !== user.userId)
	) {
		throw new AppError(403, "You do not have permission to view this shipment");
	}
	return {
		...shipment,
		paymentStatus: shipment.payment?.status ?? "UNPAID",
		allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role),
	};
};

const trackShipment = async (trackingId: string) => {
	const shipment = await prisma.shipment.findUnique({
		where: { trackingId, isDeleted: false },
		select: {
			trackingId: true,
			status: true,
			estimatedDelivery: true,
			trackings: {
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					status: true,
					createdAt: true,
					hub: { select: { name: true, location: true } },
				},
			},
		},
	});
	if (!shipment) throw new AppError(404, "Tracking information not found");
	return shipment;
};

const assignCourier = async (
	shipmentId: string,
	courierId: string,
	adminId: string,
) =>
	prisma.$transaction(async (tx) => {
		await operationsActor(tx, { userId: adminId, role: "ADMIN" }, "ADMIN");
		await lockCourier(tx, courierId);
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
		});
		if (!shipment) throw new AppError(404, "Shipment not found");
		if (shipment.status !== ShipmentStatus.PENDING || shipment.courierId)
			throw new AppError(409, "Shipment is no longer available for assignment");
		const courier = await tx.courier.findUnique({
			where: { userId: courierId, isDeleted: false },
			include: { user: true },
		});
		if (
			!courier ||
			courier.user.isDeleted ||
			courier.user.status !== "ACTIVE" ||
			courier.user.role !== "COURIER"
		)
			throw new AppError(404, "Active courier not found");
		if (!courier.isAvailable)
			throw new AppError(400, "Courier is currently unavailable");
		if (!shipment.originHubId || shipment.originHubId !== courier.currentHubId)
			throw new AppError(400, "Courier must belong to the shipment origin hub");
		await assertActiveHub(tx, shipment.originHubId);
		const active = await tx.shipment.count({
			where: {
				courierId,
				isDeleted: false,
				status: { in: ACTIVE_SHIPMENT_STATUSES },
			},
		});
		if (active >= 5)
			throw new AppError(409, "Courier has reached the active delivery limit");
		const changed = await tx.shipment.updateMany({
			where: {
				id: shipmentId,
				status: ShipmentStatus.PENDING,
				courierId: null,
				isDeleted: false,
			},
			data: { courierId, status: ShipmentStatus.ASSIGNED },
		});
		if (changed.count !== 1)
			throw new AppError(409, "Shipment changed, please reload");
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status: ShipmentStatus.ASSIGNED,
				updatedById: adminId,
				note: "Courier assigned",
			},
		});
		await tx.auditLog.create({
			data: {
				userId: adminId,
				action: "ASSIGN_COURIER",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: {
					courierId,
					previousStatus: shipment.status,
					newStatus: ShipmentStatus.ASSIGNED,
				},
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});

const updateShipmentStatus = async (
	shipmentId: string,
	status: ShipmentStatus,
	userId: string,
	role: string,
	hubId?: string,
	note?: string,
	proof?: z.infer<typeof proofSchema>,
	collectedAmount?: number,
) =>
	prisma.$transaction(async (tx) => {
		await operationsActor(tx, { userId, role });
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
			include: { payment: { select: { status: true } } },
		});
		if (!shipment) throw new AppError(404, "Shipment not found");
		if (role === "COURIER" && shipment.courierId !== userId)
			throw new AppError(403, "You can only update assigned shipments");
		if (
			!["ADMIN", "COURIER"].includes(role) ||
			!nextShipmentStatuses(shipment.status, role).includes(status)
		)
			throw new AppError(400, "Invalid shipment status transition");
		if (
			["DELIVERY_FAILED", "RETURNED"].includes(status) &&
			(!note || note.trim().length < 5)
		)
			throw new AppError(400, "Delivery failure or return reason is required");
		if (status === "DELIVERED") {
			const evidence = proofSchema.parse(proof);
			if (shipment.pickupAreaId && shipment.payment?.status !== "PAID")
				throw new AppError(409, "Delivery fee must be paid before delivery");
			if (
				shipment.codAmount.gt(0) &&
				(collectedAmount === undefined ||
					!shipment.codAmount.equals(collectedAmount))
			)
				throw new AppError(400, "Exact COD collection is required");
			await tx.deliveryProof.create({
				data: { shipmentId, ...evidence, recordedById: userId },
			});
			if (shipment.codAmount.gt(0)) {
				await tx.cashCollection.create({
					data: {
						shipmentId,
						merchantId: shipment.senderId,
						courierId: shipment.courierId || userId,
						amount: shipment.codAmount,
						fee: shipment.codFee,
						payable: shipment.codAmount.minus(shipment.codFee),
					},
				});
			}
		}
		if (status === ShipmentStatus.CANCELLED)
			await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
		const effectiveHub =
			status === ShipmentStatus.AT_ORIGIN_HUB
				? shipment.originHubId
				: status === ShipmentStatus.AT_DESTINATION_HUB
					? shipment.destinationHubId
					: hubId;
		if (hubId && effectiveHub && hubId !== effectiveHub)
			throw new AppError(400, "Hub does not match the shipment route");
		if (
			[
				ShipmentStatus.AT_ORIGIN_HUB,
				ShipmentStatus.AT_DESTINATION_HUB,
			].includes(status as "AT_ORIGIN_HUB" | "AT_DESTINATION_HUB") &&
			!effectiveHub
		)
			throw new AppError(400, "Shipment hub is required");
		await assertActiveHub(tx, effectiveHub);
		const earning =
			status === ShipmentStatus.DELIVERED &&
			config.courier_commission_rate !== undefined
				? shipment.price.mul(config.courier_commission_rate).toDecimalPlaces(2)
				: undefined;
		const changed = await tx.shipment.updateMany({
			where: {
				id: shipmentId,
				status: shipment.status,
				courierId: shipment.courierId,
				isDeleted: false,
			},
			data: { status, courierEarning: earning },
		});
		if (changed.count !== 1)
			throw new AppError(409, "Shipment changed, please reload");
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status,
				updatedById: userId,
				hubId: effectiveHub,
				note,
			},
		});
		if (
			status === ShipmentStatus.IN_TRANSIT &&
			shipment.originHubId &&
			shipment.destinationHubId
		) {
			await tx.shipmentTransfer.create({
				data: {
					shipmentId,
					fromHubId: shipment.originHubId,
					toHubId: shipment.destinationHubId,
					transferredById: userId,
					departureAt: new Date(),
				},
			});
		}
		if (status === ShipmentStatus.AT_DESTINATION_HUB) {
			await tx.shipmentTransfer.updateMany({
				where: { shipmentId, arrivalAt: null },
				data: { arrivalAt: new Date(), status },
			});
		}
		await tx.auditLog.create({
			data: {
				userId,
				action: "UPDATE_STATUS",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: { previousStatus: shipment.status, newStatus: status },
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});

const cancelShipment = async (shipmentId: string, userId: string) =>
	prisma.$transaction(async (tx) => {
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
			include: { payment: { select: { status: true } } },
		});
		if (!shipment) throw new AppError(404, "Shipment not found");
		if (shipment.senderId !== userId)
			throw new AppError(403, "You cannot cancel this shipment");
		if (shipment.status !== ShipmentStatus.PENDING)
			throw new AppError(409, "Only pending shipments can be cancelled");
		await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
		const changed = await tx.shipment.updateMany({
			where: {
				id: shipmentId,
				senderId: userId,
				status: ShipmentStatus.PENDING,
				isDeleted: false,
			},
			data: { status: ShipmentStatus.CANCELLED },
		});
		if (changed.count !== 1)
			throw new AppError(409, "Shipment changed, please reload");
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status: ShipmentStatus.CANCELLED,
				updatedById: userId,
				note: "Cancelled by customer",
			},
		});
		await tx.auditLog.create({
			data: {
				userId,
				action: "CANCEL_SHIPMENT",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: {
					previousStatus: shipment.status,
					newStatus: ShipmentStatus.CANCELLED,
				},
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});

const handoffCourier = (
	shipmentId: string,
	courierId: string,
	adminId: string,
) =>
	prisma.$transaction(async (tx) => {
		await operationsActor(tx, { userId: adminId, role: "ADMIN" }, "ADMIN");
		await lockCourier(tx, courierId);
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
		});
		if (
			!shipment ||
			!["AT_ORIGIN_HUB", "AT_DESTINATION_HUB"].includes(shipment.status)
		)
			throw new AppError(409, "Handover requires a parcel at a hub");
		const hubId =
			shipment.status === "AT_ORIGIN_HUB"
				? shipment.originHubId
				: shipment.destinationHubId;
		await assertActiveHub(tx, hubId);
		const courier = await tx.courier.findUnique({
			where: { userId: courierId },
			include: { user: true },
		});
		if (
			!courier ||
			!courier.isAvailable ||
			courier.isDeleted ||
			courier.user.isDeleted ||
			!courier.user.emailVerified ||
			courier.user.role !== "COURIER" ||
			courier.user.status !== "ACTIVE" ||
			courier.currentHubId !== hubId ||
			shipment.courierId === courierId
		)
			throw new AppError(
				400,
				"Available worker at the matching hub is required",
			);
		if (
			(await tx.shipment.count({
				where: {
					courierId,
					isDeleted: false,
					status: { in: ACTIVE_SHIPMENT_STATUSES },
				},
			})) >= 5
		)
			throw new AppError(409, "Worker capacity exceeded");
		await tx.shipment.update({
			where: { id: shipmentId },
			data: { courierId },
		});
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status: shipment.status,
				hubId,
				updatedById: adminId,
				note: "Hub worker handover",
			},
		});
		await tx.auditLog.create({
			data: {
				userId: adminId,
				action: "HANDOFF_COURIER",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: {
					fromCourierId: shipment.courierId,
					toCourierId: courierId,
					hubId,
				},
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});
export const ShipmentService = {
	createShipment,
	bulkCreate,
	getAllShipments,
	getShipmentSummary,
	getSingleShipment,
	trackShipment,
	assignCourier,
	handoffCourier,
	updateShipmentStatus,
	cancelShipment,
};
