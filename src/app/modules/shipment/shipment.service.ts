import { Prisma, ShipmentStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../utils/prisma";
import { listQuerySchema } from "../../utils/query";
import { ACTIVE_SHIPMENT_STATUSES, nextShipmentStatuses } from "./shipment.rules";
import { ShipmentValidation } from "./shipment.validation";

type Actor = { userId: string; role: string };
const publicPaymentSelect = { id: true, status: true, amount: true, currency: true, paymentGateway: true, paidAt: true } as const;

async function assertActiveHub(tx: Prisma.TransactionClient, id?: string | null) {
  if (id && !(await tx.hub.findUnique({ where: { id, isDeleted: false } }))) throw new AppError(400, "Active hub not found");
}

async function assertCancellationSafe(tx: Prisma.TransactionClient, shipmentId: string, paymentStatus?: string) {
  if (paymentStatus === "PAID") throw new AppError(409, "Paid shipments require a refund before cancellation");
  const pending = await tx.paymentAttempt.count({ where: { payment: { shipmentId }, status: "UNPAID" } });
  if (pending) throw new AppError(409, "Payment must be verified before cancelling this shipment");
}

const createShipment = async (userId: string, input: z.infer<typeof ShipmentValidation.CreateShipmentSchema>["body"]) => {
  const payload = ShipmentValidation.CreateShipmentSchema.shape.body.parse(input);
  const trackingId = `TRK-${randomUUID().replace(/-/g, "").toUpperCase()}`;
  const price = new Prisma.Decimal(payload.weight).mul(120).toDecimalPlaces(2);
  return prisma.$transaction(async tx => {
    await assertActiveHub(tx, payload.originHubId);
    await assertActiveHub(tx, payload.destinationHubId);
    const shipment = await tx.shipment.create({ data: {
      receiverName: payload.receiverName, receiverPhone: payload.receiverPhone, receiverAddress: payload.receiverAddress,
      weight: payload.weight, originHubId: payload.originHubId, destinationHubId: payload.destinationHubId,
      senderId: userId, trackingId, price, status: ShipmentStatus.PENDING,
    } });
    await tx.shipmentTracking.create({ data: { shipmentId: shipment.id, status: ShipmentStatus.PENDING, updatedById: userId, note: "Shipment created" } });
    await tx.auditLog.create({ data: { userId, action: "CREATE_SHIPMENT", entityId: shipment.id, entityType: "SHIPMENT", details: { trackingId, status: shipment.status } } });
    return shipment;
  });
};

const getAllShipments = async (query: unknown, user: Actor) => {
  const { searchTerm, status, page, limit, sortBy, sortOrder } = listQuerySchema.parse(query);
  const conditions: Prisma.ShipmentWhereInput[] = [{ isDeleted: false }];
  if (user.role === "CUSTOMER") conditions.push({ senderId: user.userId });
  if (user.role === "COURIER") conditions.push({ courierId: user.userId });
  if (status) conditions.push({ status: z.nativeEnum(ShipmentStatus).parse(status) });
  if (searchTerm) conditions.push({ OR: [
    { trackingId: { contains: searchTerm, mode: "insensitive" } },
    { receiverName: { contains: searchTerm, mode: "insensitive" } },
    { receiverPhone: { contains: searchTerm, mode: "insensitive" } },
  ] });
  const validSortBy = ["createdAt", "price", "weight", "status"].includes(sortBy) ? sortBy : "createdAt";
  const [shipments, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where: { AND: conditions }, skip: (page - 1) * limit, take: limit, orderBy: { [validSortBy]: sortOrder },
      include: {
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
    data: shipments.map(shipment => ({
      ...shipment, paymentStatus: shipment.payment?.status ?? "UNPAID",
      allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role),
    })),
  };
};

const getShipmentSummary = async (user: Actor) => {
  const where: Prisma.ShipmentWhereInput = { isDeleted: false, ...(user.role === "CUSTOMER" ? { senderId: user.userId } : user.role === "COURIER" ? { courierId: user.userId } : {}) };
  const groups = await prisma.shipment.groupBy({ by: ["status"], where, _count: { _all: true } });
  return groups.reduce((summary, group) => {
    summary.totalShipments += group._count._all;
    if (group.status === "PENDING" || ACTIVE_SHIPMENT_STATUSES.includes(group.status)) summary.activeShipments += group._count._all;
    if (group.status === "DELIVERED") summary.deliveredShipments += group._count._all;
    return summary;
  }, { totalShipments: 0, activeShipments: 0, deliveredShipments: 0 });
};

const getSingleShipment = async (id: string, user: Actor) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id, isDeleted: false },
    include: {
      sender: { select: { name: true, email: true, contactNumber: true } },
      courier: { select: { name: true, email: true, contactNumber: true } },
      originHub: true, destinationHub: true, payment: { select: publicPaymentSelect },
      trackings: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if ((user.role === "CUSTOMER" && shipment.senderId !== user.userId) || (user.role === "COURIER" && shipment.courierId !== user.userId)) {
    throw new AppError(403, "You do not have permission to view this shipment");
  }
  return { ...shipment, paymentStatus: shipment.payment?.status ?? "UNPAID", allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role) };
};

const trackShipment = async (trackingId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingId, isDeleted: false },
    select: {
      trackingId: true, status: true, estimatedDelivery: true,
      trackings: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, createdAt: true, hub: { select: { name: true, location: true } } } },
    },
  });
  if (!shipment) throw new AppError(404, "Tracking information not found");
  return shipment;
};

const assignCourier = async (shipmentId: string, courierId: string, adminId: string) => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT "id" FROM "couriers" WHERE "userId" = ${courierId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${shipmentId} FOR UPDATE`;
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.status !== ShipmentStatus.PENDING || shipment.courierId) throw new AppError(409, "Shipment is no longer available for assignment");
  const courier = await tx.courier.findUnique({ where: { userId: courierId, isDeleted: false }, include: { user: true } });
  if (!courier || courier.user.isDeleted || courier.user.status !== "ACTIVE" || courier.user.role !== "COURIER") throw new AppError(404, "Active courier not found");
  if (!courier.isAvailable) throw new AppError(400, "Courier is currently unavailable");
  if (!shipment.originHubId || shipment.originHubId !== courier.currentHubId) throw new AppError(400, "Courier must belong to the shipment origin hub");
  await assertActiveHub(tx, shipment.originHubId);
  const active = await tx.shipment.count({ where: { courierId, isDeleted: false, status: { in: ACTIVE_SHIPMENT_STATUSES } } });
  if (active >= 5) throw new AppError(409, "Courier has reached the active delivery limit");
  const changed = await tx.shipment.updateMany({ where: { id: shipmentId, status: ShipmentStatus.PENDING, courierId: null, isDeleted: false }, data: { courierId, status: ShipmentStatus.ASSIGNED } });
  if (changed.count !== 1) throw new AppError(409, "Shipment changed, please reload");
  await tx.shipmentTracking.create({ data: { shipmentId, status: ShipmentStatus.ASSIGNED, updatedById: adminId, note: "Courier assigned" } });
  await tx.auditLog.create({ data: { userId: adminId, action: "ASSIGN_COURIER", entityId: shipmentId, entityType: "SHIPMENT", details: { courierId, previousStatus: shipment.status, newStatus: ShipmentStatus.ASSIGNED } } });
  return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
});

const updateShipmentStatus = async (shipmentId: string, status: ShipmentStatus, userId: string, role: string, hubId?: string, note?: string) => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${shipmentId} FOR UPDATE`;
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, include: { payment: { select: { status: true } } } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (role === "COURIER" && shipment.courierId !== userId) throw new AppError(403, "You can only update assigned shipments");
  if (!["ADMIN", "COURIER"].includes(role) || !nextShipmentStatuses(shipment.status, role).includes(status)) throw new AppError(400, "Invalid shipment status transition");
  if (status === ShipmentStatus.CANCELLED) await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
  const effectiveHub = status === ShipmentStatus.AT_ORIGIN_HUB ? shipment.originHubId : status === ShipmentStatus.AT_DESTINATION_HUB ? shipment.destinationHubId : hubId;
  if (hubId && effectiveHub && hubId !== effectiveHub) throw new AppError(400, "Hub does not match the shipment route");
  if ([ShipmentStatus.AT_ORIGIN_HUB, ShipmentStatus.AT_DESTINATION_HUB].includes(status as "AT_ORIGIN_HUB" | "AT_DESTINATION_HUB") && !effectiveHub) throw new AppError(400, "Shipment hub is required");
  await assertActiveHub(tx, effectiveHub);
  const earning = status === ShipmentStatus.DELIVERED && config.courier_commission_rate !== undefined
    ? shipment.price.mul(config.courier_commission_rate).toDecimalPlaces(2) : undefined;
  const changed = await tx.shipment.updateMany({
    where: { id: shipmentId, status: shipment.status, courierId: shipment.courierId, isDeleted: false },
    data: { status, courierEarning: earning },
  });
  if (changed.count !== 1) throw new AppError(409, "Shipment changed, please reload");
  await tx.shipmentTracking.create({ data: { shipmentId, status, updatedById: userId, hubId: effectiveHub, note } });
  if (status === ShipmentStatus.IN_TRANSIT && shipment.originHubId && shipment.destinationHubId) {
    await tx.shipmentTransfer.create({ data: { shipmentId, fromHubId: shipment.originHubId, toHubId: shipment.destinationHubId, transferredById: userId, departureAt: new Date() } });
  }
  if (status === ShipmentStatus.AT_DESTINATION_HUB) {
    await tx.shipmentTransfer.updateMany({ where: { shipmentId, arrivalAt: null }, data: { arrivalAt: new Date(), status } });
  }
  await tx.auditLog.create({ data: { userId, action: "UPDATE_STATUS", entityId: shipmentId, entityType: "SHIPMENT", details: { previousStatus: shipment.status, newStatus: status } } });
  return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
});

const cancelShipment = async (shipmentId: string, userId: string) => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${shipmentId} FOR UPDATE`;
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, include: { payment: { select: { status: true } } } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.senderId !== userId) throw new AppError(403, "You cannot cancel this shipment");
  if (shipment.status !== ShipmentStatus.PENDING) throw new AppError(409, "Only pending shipments can be cancelled");
  await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
  const changed = await tx.shipment.updateMany({ where: { id: shipmentId, senderId: userId, status: ShipmentStatus.PENDING, isDeleted: false }, data: { status: ShipmentStatus.CANCELLED } });
  if (changed.count !== 1) throw new AppError(409, "Shipment changed, please reload");
  await tx.shipmentTracking.create({ data: { shipmentId, status: ShipmentStatus.CANCELLED, updatedById: userId, note: "Cancelled by customer" } });
  await tx.auditLog.create({ data: { userId, action: "CANCEL_SHIPMENT", entityId: shipmentId, entityType: "SHIPMENT", details: { previousStatus: shipment.status, newStatus: ShipmentStatus.CANCELLED } } });
  return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
});

export const ShipmentService = { createShipment, getAllShipments, getShipmentSummary, getSingleShipment, trackShipment, assignCourier, updateShipmentStatus, cancelShipment };
