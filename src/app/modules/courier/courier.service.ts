import { AuthProvider, PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { ICourierCreate, ICourierFilterRequest, ICourierUpdate } from "./courier.interface";

const prisma = new PrismaClient();

const createCourier = async (payload: ICourierCreate) => {
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

    return { user, courier };
  });

  return result;
};

const getAllCouriers = async (filters: ICourierFilterRequest) => {
  const { isAvailable, searchTerm, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = filters;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: any[] = [{ user: { isDeleted: false } }];

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
      isAvailable: isAvailable === "true" || isAvailable === true,
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

const getCourierDetails = async (id: string, user: any) => {
  const result = await prisma.courier.findUnique({
    where: { id },
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

const updateCourierProfile = async (id: string, payload: ICourierUpdate, user: any) => {
  const courier = await prisma.courier.findUnique({ where: { id } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && courier.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to update this courier profile");
  }

  const result = await prisma.courier.update({
    where: { id },
    data: payload,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      hub: true,
    },
  });

  return result;
};

const getCourierHistoryAndEarnings = async (courierId: string, user: any) => {
  const courier = await prisma.courier.findUnique({ where: { id: courierId } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && courier.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to view this courier history");
  }

  const shipments = await prisma.shipment.findMany({
    where: { courierId },
    orderBy: { createdAt: "desc" },
  });

  const earningsData = await prisma.shipment.aggregate({
    _sum: {
      price: true,
    },
    where: {
      courierId,
      status: "DELIVERED",
    },
  });

  const totalEarnings = Number(earningsData._sum?.price || 0);

  return {
    totalEarnings,
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