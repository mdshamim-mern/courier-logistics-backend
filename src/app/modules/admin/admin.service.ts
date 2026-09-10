import { PrismaClient, Role, UserStatus } from "@prisma/client";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

const prisma = new PrismaClient();

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

const getAllUsers = async (query: any) => {
  const { role, status, searchTerm, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: any[] = [{ isDeleted: false }];

  if (role) {
    andConditions.push({ role });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const result = await prisma.user.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
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
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role === Role.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, "Cannot modify Super Admin status");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { status },
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
        details: { previousStatus: user.status, newStatus: status },
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
};