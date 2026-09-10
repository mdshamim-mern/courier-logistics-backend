import { PrismaClient } from "@prisma/client";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

const prisma = new PrismaClient();

const createHub = async (payload: { name: string; location: string; address: string }) => {
  const isExist = await prisma.hub.findUnique({
    where: { name: payload.name },
  });

  if (isExist) {
    throw new AppError(httpStatus.CONFLICT, "Hub with this name already exists");
  }

  const result = await prisma.hub.create({
    data: payload,
  });

  return result;
};

const getAllHubs = async (query: any) => {
  const { searchTerm, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = query;
  
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: any[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const result = await prisma.hub.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
  });

  const total = await prisma.hub.count({ where: { AND: andConditions } });

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

const getSingleHub = async (id: string) => {
  const result = await prisma.hub.findUnique({
    where: { id, isDeleted: false },
    include: {
      couriers: {
        where: { isDeleted: false, isAvailable: true },
        select: { 
          id: true, 
          vehicleType: true, 
          user: { 
            select: { 
              name: true,
              contactNumber: true
            } 
          } 
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  return result;
};

const updateHub = async (id: string, payload: Partial<{ name: string; location: string; address: string }>) => {
  const isExist = await prisma.hub.findUnique({ where: { id, isDeleted: false } });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  const result = await prisma.hub.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteHub = async (id: string) => {
  const isExist = await prisma.hub.findUnique({ where: { id, isDeleted: false } });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  const result = await prisma.hub.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return result;
};

export const HubService = {
  createHub,
  getAllHubs,
  getSingleHub,
  updateHub,
  deleteHub,
};