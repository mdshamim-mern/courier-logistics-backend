import { prisma } from "../../utils/prisma";
import type { Prisma } from "@prisma/client";
import { listQuerySchema } from "../../utils/query";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

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

const getAllHubs = async (query: unknown) => {
  const { searchTerm, page, limit, sortBy, sortOrder } = listQuerySchema.parse(query);
  
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: Prisma.HubWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const allowedSortFields = ["createdAt", "name", "location"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.hub.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
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
