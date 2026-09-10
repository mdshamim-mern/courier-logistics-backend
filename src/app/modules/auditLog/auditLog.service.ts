import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getAuditLogs = async (query: any) => {
  const { page = 1, limit = 10, action, entityType, sortBy = "createdAt", sortOrder = "desc" } = query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: any[] = [];

  if (action) {
    andConditions.push({ action });
  }

  if (entityType) {
    andConditions.push({ entityType });
  }

  const result = await prisma.auditLog.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : {},
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const total = await prisma.auditLog.count({
    where: andConditions.length > 0 ? { AND: andConditions } : {},
  });

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

export const AuditLogService = {
  getAuditLogs,
};