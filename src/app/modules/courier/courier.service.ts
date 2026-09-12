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

  const defaultPassword = payload.password || "Courier@1234";
  const hashedPassword = await bcrypt.hash(defaultPassword, Number(config.bcrypt_salt_rounds));

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
  const { isAvailable, searchTerm } = filters;
  const andConditions: any[] = [];

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

  const result = await prisma.courier.findMany({
    where: whereConditions,
    include: {
      user: {
        select: { id: true, name: true, email: true, status: true, role: true },
      },
      hub: true,
    },
  });

  return result;
};

const getCourierDetails = async (id: string) => {
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

  return result;
};

const updateCourierProfile = async (id: string, payload: ICourierUpdate) => {
  const courier = await prisma.courier.findUnique({ where: { id } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
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

const getCourierHistoryAndEarnings = async (courierId: string) => {
  const courier = await prisma.courier.findUnique({ where: { id: courierId } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
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