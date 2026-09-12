import { PrismaClient, ShipmentStatus } from "@prisma/client";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

const prisma = new PrismaClient();

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

    await tx.auditLog.create({
      data: {
        userId,
        action: "CREATE_SHIPMENT",
        entityId: shipment.id,
        entityType: "SHIPMENT",
        details: { trackingId, status: "PENDING" },
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

  const result = await prisma.shipment.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
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

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        courierId,
        status: ShipmentStatus.ASSIGNED,
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

const updateShipmentStatus = async (shipmentId: string, status: ShipmentStatus, userId: string, role: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (role === "COURIER" && shipment.courierId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update shipments assigned to you");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status },
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

export const ShipmentService = {
  createShipment,
  getAllShipments,
  getSingleShipment,
  assignCourier,
  updateShipmentStatus,
};