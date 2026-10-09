import { AuthProvider, Role, UserStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../utils/prisma";
import { safeUser } from "../../utils/session";
import { listQuerySchema } from "../../utils/query";
import { CourierValidation } from "./courier.validation";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import type { ICourierCreate, ICourierFilterRequest, ICourierUpdate } from "./courier.interface";
import { ACTIVE_SHIPMENT_STATUSES } from "../shipment/shipment.rules";

const createCourier = async (payload: ICourierCreate) => {
  if (payload.currentHubId && !(await prisma.hub.findUnique({ where: { id: payload.currentHubId, isDeleted: false } }))) {
    throw new AppError(400, "Active hub not found");
  }
  const isUserExists = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });

  if (isUserExists) {
    throw new AppError(httpStatus.CONFLICT, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        contactNumber: payload.contactNumber,
        password: hashedPassword,
        role: Role.COURIER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    const courier = await tx.courier.create({
      data: {
        userId: user.id,
        contactNumber: payload.contactNumber,
        vehicleType: payload.vehicleType,
        vehicleNumber: payload.vehicleNumber,
        currentHubId: payload.currentHubId,
        isAvailable: true,
      },
    });

    return { user: safeUser(user), courier };
  });

  return result;
};

const getAllCouriers = async (filters: ICourierFilterRequest) => {
  const { isAvailable, searchTerm, page, limit, sortBy, sortOrder } = listQuerySchema.parse(filters);
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: Prisma.CourierWhereInput[] = [{ isDeleted: false, user: { isDeleted: false, role: Role.COURIER } }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { contactNumber: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (isAvailable !== undefined) {
    andConditions.push({
      isAvailable: isAvailable === "true",
    });
  }

  const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};

  const allowedSortFields = ["createdAt", "isAvailable"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.courier.findMany({
    where: whereConditions,
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
    include: {
      user: {
        select: { id: true, name: true, email: true, status: true, role: true },
      },
      hub: true,
    },
  });

  const total = await prisma.courier.count({ where: whereConditions });

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

const getCourierDetails = async (id: string, user: { userId: string; role: string }) => {
  const result = await prisma.courier.findUnique({
    where: { id, isDeleted: false },
    include: {
      user: {
        select: { id: true, name: true, email: true, status: true, role: true },
      },
      hub: true,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && result.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to view this courier profile");
  }

  return result;
};

const updateCourierProfile = async (id: string, input: ICourierUpdate, user: { userId: string; role: string }) => {
  const payload = CourierValidation.updateCourierZodSchema.shape.body.parse(input);
  const courier = await prisma.courier.findUnique({ where: { id, isDeleted: false } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && courier.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to update this courier profile");
  }

  if (user.role === Role.COURIER && payload.currentHubId !== undefined) {
    throw new AppError(403, "Only administrators may change the courier hub");
  }
  if (payload.currentHubId && !(await prisma.hub.findUnique({ where: { id: payload.currentHubId, isDeleted: false } }))) {
    throw new AppError(400, "Active hub not found");
  }
  if (payload.currentHubId && payload.currentHubId !== courier.currentHubId) {
    const activeWork = await prisma.shipment.count({ where: { courierId: courier.userId, isDeleted: false, status: { in: ACTIVE_SHIPMENT_STATUSES } } });
    if (activeWork) throw new AppError(409, "Courier has active parcel assignments. Complete or hand over those parcels before changing the hub.");
  }

  const result = await prisma.courier.update({
    where: { id },
    data: { vehicleType: payload.vehicleType, vehicleNumber: payload.vehicleNumber, isAvailable: payload.isAvailable, currentHubId: payload.currentHubId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      hub: true,
    },
  });

  return result;
};

const getCourierHistoryAndEarnings = async (courierId: string, user: { userId: string; role: string }) => {
  const courier = await prisma.courier.findUnique({ where: { id: courierId, isDeleted: false } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && courier.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to view this courier history");
  }

  const shipments = await prisma.shipment.findMany({
    where: { courierId: courier.userId, isDeleted: false },
    orderBy: { createdAt: "desc" },
  });

  const earningsData = await prisma.shipment.aggregate({
    _sum: {
      courierEarning: true,
    },
    where: {
      courierId: courier.userId,
      status: "DELIVERED",
      isDeleted: false,
    },
  });

  const completed = shipments.filter(shipment => shipment.status === "DELIVERED");
  const attempted = shipments.filter(shipment => ["DELIVERED", "DELIVERY_FAILED", "RETURNED"].includes(shipment.status));
  const totalEarnings = completed.some(shipment => shipment.courierEarning === null) ? null : Number(earningsData._sum.courierEarning ?? 0);

  return {
    totalEarnings,
    completedDeliveries: completed.length,
    performanceRate: attempted.length ? Math.round(completed.length / attempted.length * 10000) / 100 : 0,
    compensationConfigured: config.courier_commission_rate !== undefined,
    totalShipments: shipments.length,
    shipments,
  };
};

export const CourierService = {
  createCourier,
  getAllCouriers,
  getCourierDetails,
  updateCourierProfile,
  getCourierHistoryAndEarnings,
};
