import { type Prisma, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { lockCourier } from "../../utils/rowLocks";
import { listQuerySchema } from "../../utils/query";
import { ACTIVE_SHIPMENT_STATUSES } from "../shipment/shipment.rules";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

async function lockAdminMutation(tx: Prisma.TransactionClient, userId: string, adminId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(702045)`;
  const actor = await tx.user.findUnique({ where: { id: adminId } });
  if (!actor || actor.role !== Role.ADMIN || actor.status !== UserStatus.ACTIVE || actor.isDeleted || !actor.emailVerified) throw new AppError(403, "Administrator access is no longer valid");
  const user = await tx.user.findUnique({ where: { id: userId, isDeleted: false } });
  if (!user) throw new AppError(404, "User not found");
  return user;
}

async function assertAnotherAdmin(tx: Prisma.TransactionClient) {
  const count = await tx.user.count({ where: { role: Role.ADMIN, status: UserStatus.ACTIVE, isDeleted: false, emailVerified: true } });
  if (count <= 1) throw new AppError(409, "At least one active administrator must remain");
}

const getDashboardStats = async () => {
  const totalCustomers = await prisma.user.count({
    where: { role: Role.CUSTOMER, isDeleted: false },
  });

  const totalCouriers = await prisma.user.count({
    where: { role: Role.COURIER, isDeleted: false },
  });

  const totalShipments = await prisma.shipment.count({
    where: { isDeleted: false },
  });

  const shipmentsByStatus = await prisma.shipment.groupBy({
    by: ["status"],
    _count: { status: true },
    where: { isDeleted: false },
  });

  const revenueResult = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "PAID", isDeleted: false },
  });

  const totalRevenue = revenueResult._sum.amount ? Number(revenueResult._sum.amount) : 0;

  return {
    totalCustomers,
    totalCouriers,
    totalShipments,
    totalRevenue,
    shipmentsByStatus,
  };
};

const getAllUsers = async (query: unknown) => {
  const { role, status, searchTerm, page, limit, sortBy, sortOrder } = listQuerySchema.parse(query);
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: Prisma.UserWhereInput[] = [{ isDeleted: false }];

  if (role) {
    andConditions.push({ role });
  }

  if (status) {
    andConditions.push({ status: z.nativeEnum(UserStatus).parse(status) });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const allowedSortFields = ["createdAt", "name", "email", "status", "role"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.user.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  const total = await prisma.user.count({ where: { AND: andConditions } });

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

const updateUserStatus = async (userId: string, status: UserStatus, adminId: string) => {
  if (userId === adminId && status !== "ACTIVE") throw new AppError(400, "Cannot block or delete your own account");
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentUser = await lockAdminMutation(tx, userId, adminId);
    if (currentUser.role === Role.ADMIN && status !== UserStatus.ACTIVE) await assertAnotherAdmin(tx);
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { status, tokenVersion: { increment: 1 }, isDeleted: status === "DELETED", deletedAt: status === "DELETED" ? new Date() : null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "UPDATE_USER_STATUS",
        entityId: userId,
        entityType: "USER",
        details: { previousStatus: currentUser.status, newStatus: status },
      },
    });

    return updatedUser;
  });

  return result;
};

const updateUserRole = async (userId: string, role: Role, adminId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.id === adminId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot update your own role");
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentUser = await lockAdminMutation(tx, userId, adminId);
    if (currentUser.role === Role.ADMIN && role !== Role.ADMIN) await assertAnotherAdmin(tx);
    await lockCourier(tx, userId);
    if (currentUser.role === Role.COURIER && role !== Role.COURIER) {
      const active = await tx.shipment.count({ where: { courierId: userId, isDeleted: false, status: { in: ACTIVE_SHIPMENT_STATUSES } } });
      if (active) throw new AppError(409, "Complete or reassign the courier deliveries before changing role");
    }
    if (role === Role.COURIER) {
      const customer = await tx.customer.findUnique({ where: { userId } });
      const contactNumber = currentUser.contactNumber ?? customer?.contactNumber;
      if (!contactNumber) throw new AppError(400, "A contact number is required before creating a courier profile");
      await tx.courier.upsert({ where: { userId }, create: { userId, contactNumber }, update: { isDeleted: false, deletedAt: null } });
    }
    if (role === Role.CUSTOMER) {
      await tx.customer.upsert({ where: { userId }, create: { userId, contactNumber: currentUser.contactNumber }, update: { isDeleted: false, deletedAt: null } });
    }
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { role, tokenVersion: { increment: 1 } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "UPDATE_USER_ROLE",
        entityId: userId,
        entityType: "USER",
        details: { previousRole: currentUser.role, newRole: role },
      },
    });

    return updatedUser;
  });

  return result;
};

export const AdminService = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
};
