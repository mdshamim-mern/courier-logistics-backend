import { PrismaClient, ShipmentStatus } from "@prisma/client";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

const prisma = new PrismaClient();

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.ASSIGNED]: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PICKED_UP]: [ShipmentStatus.AT_ORIGIN_HUB],
  [ShipmentStatus.AT_ORIGIN_HUB]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.AT_DESTINATION_HUB],
  [ShipmentStatus.AT_DESTINATION_HUB]: [ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED],
  [ShipmentStatus.DELIVERY_FAILED]: [ShipmentStatus.RETURNED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.CANCELLED]: []
};

const createShipment = async (userId: string, payload: any) => {
  const trackingId = `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const price = payload.weight * 120;

  const result = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        ...payload,
        senderId: userId,
        trackingId,
        price,
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
        details: { trackingId, status: ShipmentStatus.PENDING },
      },
    });

    return shipment;
  });

  return result;
};

const getAllShipments = async (query: any, user: any) => {
  const { searchTerm, status, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = query;
  
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: any[] = [{ isDeleted: false }];

  if (user.role === "CUSTOMER") {
    andConditions.push({ senderId: user.userId });
  } else if (user.role === "COURIER") {
    andConditions.push({ courierId: user.userId });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { trackingId: { contains: searchTerm, mode: "insensitive" } },
        { receiverName: { contains: searchTerm, mode: "insensitive" } },
        { receiverPhone: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const allowedSortFields = ["createdAt", "price", "weight", "status"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.shipment.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
    include: {
      originHub: { select: { name: true, location: true } },
      destinationHub: { select: { name: true, location: true } },
      courier: { select: { name: true, email: true } },
    },
  });

  const total = await prisma.shipment.count({ where: { AND: andConditions } });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
    data: result,
  };
};

const getSingleShipment = async (id: string, user: any) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id, isDeleted: false },
    include: {
      sender: { select: { name: true, email: true, contactNumber: true } },
      courier: { select: { name: true, email: true, contactNumber: true } },
      originHub: true,
      destinationHub: true,
      payment: true,
      trackings: {
        orderBy: { createdAt: "desc" }
      }
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (
    (user.role === "CUSTOMER" && shipment.senderId !== user.userId) ||
    (user.role === "COURIER" && shipment.courierId !== user.userId && user.role !== "ADMIN")
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to view this shipment");
  }

  return shipment;
};

const assignCourier = async (shipmentId: string, courierId: string, adminId: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });
  
  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.courierId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Shipment is already assigned to a courier");
  }

  const courierProfile = await prisma.courier.findFirst({ 
    where: { userId: courierId },
    include: { user: true }
  });

  if (!courierProfile || !courierProfile.user || courierProfile.user.status !== "ACTIVE" || courierProfile.user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Active courier not found");
  }

  if (!courierProfile.isAvailable) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier is currently unavailable");
  }

  if (shipment.originHubId !== courierProfile.currentHubId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier is not assigned to the shipment's origin hub");
  }

  const activeShipmentsCount = await prisma.shipment.count({
    where: {
      courierId: courierId,
      status: ShipmentStatus.ASSIGNED,
      isDeleted: false,
    },
  });

  if (activeShipmentsCount >= 5) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier has reached the maximum active delivery limit");
  }

  if (!ALLOWED_TRANSITIONS[shipment.status].includes(ShipmentStatus.ASSIGNED)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot transition from ${shipment.status} to ASSIGNED`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        courierId,
        status: ShipmentStatus.ASSIGNED,
      },
    });

    await tx.shipmentTracking.create({
      data: {
        shipmentId,
        status: ShipmentStatus.ASSIGNED,
        updatedById: adminId,
        note: `Courier ${courierProfile.user.name} assigned`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "ASSIGN_COURIER",
        entityId: shipmentId,
        entityType: "SHIPMENT",
        details: { courierId, previousStatus: shipment.status, newStatus: ShipmentStatus.ASSIGNED },
      },
    });

    return updatedShipment;
  });

  return result;
};

const updateShipmentStatus = async (shipmentId: string, status: ShipmentStatus, userId: string, role: string, hubId?: string, note?: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (role === "COURIER" && shipment.courierId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update shipments assigned to you");
  }

  if (!ALLOWED_TRANSITIONS[shipment.status].includes(status)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid status transition from ${shipment.status} to ${status}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status },
    });

    await tx.shipmentTracking.create({
      data: {
        shipmentId,
        status,
        updatedById: userId,
        hubId,
        note,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "UPDATE_STATUS",
        entityId: shipmentId,
        entityType: "SHIPMENT",
        details: { previousStatus: shipment.status, newStatus: status },
      },
    });

    return updatedShipment;
  });

  return result;
};

const cancelShipment = async (shipmentId: string, userId: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.senderId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to cancel this shipment");
  }

  if (shipment.status !== ShipmentStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, "Only pending shipments can be cancelled");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.CANCELLED },
    });

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
        details: { previousStatus: shipment.status, newStatus: ShipmentStatus.CANCELLED },
      },
    });

    return updatedShipment;
  });

  return result;
};

export const ShipmentService = {
  createShipment,
  getAllShipments,
  getSingleShipment,
  assignCourier,
  updateShipmentStatus,
  cancelShipment,
};import { PrismaClient, ShipmentStatus } from "@prisma/client";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

const prisma = new PrismaClient();

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.ASSIGNED]: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PICKED_UP]: [ShipmentStatus.AT_ORIGIN_HUB],
  [ShipmentStatus.AT_ORIGIN_HUB]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.AT_DESTINATION_HUB],
  [ShipmentStatus.AT_DESTINATION_HUB]: [ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED],
  [ShipmentStatus.DELIVERY_FAILED]: [ShipmentStatus.RETURNED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.CANCELLED]: []
};

const createShipment = async (userId: string, payload: any) => {
  const trackingId = `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const price = payload.weight * 120;

  const result = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        ...payload,
        senderId: userId,
        trackingId,
        price,
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
        details: { trackingId, status: ShipmentStatus.PENDING },
      },
    });

    return shipment;
  });

  return result;
};

const getAllShipments = async (query: any, user: any) => {
  const { searchTerm, status, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = query;
  
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: any[] = [{ isDeleted: false }];

  if (user.role === "CUSTOMER") {
    andConditions.push({ senderId: user.userId });
  } else if (user.role === "COURIER") {
    andConditions.push({ courierId: user.userId });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { trackingId: { contains: searchTerm, mode: "insensitive" } },
        { receiverName: { contains: searchTerm, mode: "insensitive" } },
        { receiverPhone: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const allowedSortFields = ["createdAt", "price", "weight", "status"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.shipment.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
    include: {
      originHub: { select: { name: true, location: true } },
      destinationHub: { select: { name: true, location: true } },
      courier: { select: { name: true, email: true } },
    },
  });

  const total = await prisma.shipment.count({ where: { AND: andConditions } });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
    data: result,
  };
};

const getSingleShipment = async (id: string, user: any) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id, isDeleted: false },
    include: {
      sender: { select: { name: true, email: true, contactNumber: true } },
      courier: { select: { name: true, email: true, contactNumber: true } },
      originHub: true,
      destinationHub: true,
      payment: true,
      trackings: {
        orderBy: { createdAt: "desc" }
      }
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (
    (user.role === "CUSTOMER" && shipment.senderId !== user.userId) ||
    (user.role === "COURIER" && shipment.courierId !== user.userId && user.role !== "ADMIN")
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to view this shipment");
  }

  return shipment;
};

const assignCourier = async (shipmentId: string, courierId: string, adminId: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });
  
  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.courierId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Shipment is already assigned to a courier");
  }

  const courierProfile = await prisma.courier.findFirst({ 
    where: { userId: courierId },
    include: { user: true }
  });

  if (!courierProfile || !courierProfile.user || courierProfile.user.status !== "ACTIVE" || courierProfile.user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Active courier not found");
  }

  if (!courierProfile.isAvailable) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier is currently unavailable");
  }

  if (shipment.originHubId !== courierProfile.currentHubId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier is not assigned to the shipment's origin hub");
  }

  const activeShipmentsCount = await prisma.shipment.count({
    where: {
      courierId: courierId,
      status: ShipmentStatus.ASSIGNED,
      isDeleted: false,
    },
  });

  if (activeShipmentsCount >= 5) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier has reached the maximum active delivery limit");
  }

  if (!ALLOWED_TRANSITIONS[shipment.status].includes(ShipmentStatus.ASSIGNED)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot transition from ${shipment.status} to ASSIGNED`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        courierId,
        status: ShipmentStatus.ASSIGNED,
      },
    });

    await tx.shipmentTracking.create({
      data: {
        shipmentId,
        status: ShipmentStatus.ASSIGNED,
        updatedById: adminId,
        note: `Courier ${courierProfile.user.name} assigned`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "ASSIGN_COURIER",
        entityId: shipmentId,
        entityType: "SHIPMENT",
        details: { courierId, previousStatus: shipment.status, newStatus: ShipmentStatus.ASSIGNED },
      },
    });

    return updatedShipment;
  });

  return result;
};

const updateShipmentStatus = async (shipmentId: string, status: ShipmentStatus, userId: string, role: string, hubId?: string, note?: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (role === "COURIER" && shipment.courierId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update shipments assigned to you");
  }

  if (!ALLOWED_TRANSITIONS[shipment.status].includes(status)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid status transition from ${shipment.status} to ${status}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status },
    });

    await tx.shipmentTracking.create({
      data: {
        shipmentId,
        status,
        updatedById: userId,
        hubId,
        note,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "UPDATE_STATUS",
        entityId: shipmentId,
        entityType: "SHIPMENT",
        details: { previousStatus: shipment.status, newStatus: status },
      },
    });

    return updatedShipment;
  });

  return result;
};

const cancelShipment = async (shipmentId: string, userId: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.senderId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to cancel this shipment");
  }

  if (shipment.status !== ShipmentStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, "Only pending shipments can be cancelled");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.CANCELLED },
    });

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
        details: { previousStatus: shipment.status, newStatus: ShipmentStatus.CANCELLED },
      },
    });

    return updatedShipment;
  });

  return result;
};

export const ShipmentService = {
  createShipment,
  getAllShipments,
  getSingleShipment,
  assignCourier,
  updateShipmentStatus,
  cancelShipment,
};