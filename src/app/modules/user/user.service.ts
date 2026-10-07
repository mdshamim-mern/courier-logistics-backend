import type { z } from "zod";
import type { User } from "@prisma/client";
import type { UploadApiResponse } from "cloudinary";
import { prisma } from "../../utils/prisma";
import { safeUser } from "../../utils/session";
import { UserValidation } from "./user.validation";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";
import { cloudinary } from "../../utils/cloudinary";

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customer: true,
      courier: {
        include: {
          hub: true,
        },
      },
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return safeUser(user);
};

const updateProfileImage = async (userId: string, fileBuffer: Buffer) => {
  const jpeg = fileBuffer.length >= 3 && fileBuffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = fileBuffer.length >= 8 && fileBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = fileBuffer.length >= 12 && fileBuffer.toString("ascii", 0, 4) === "RIFF" && fileBuffer.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp) throw new AppError(400, "Invalid image content");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, imagePublicId: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: "image", allowed_formats: ["jpg", "png", "webp"], transformation: [{ width: 512, height: 512, crop: "limit" }], folder: "courier-profiles" }, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Cloudinary upload failed"));
      resolve(result);
    }).end(fileBuffer);
  });

  let updatedUser: Pick<User, "id" | "name" | "email" | "role" | "imageUrl">;
  try {
    updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      imageUrl: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      imageUrl: true,
    },
    });
  } catch (error) {
    await cloudinary.uploader.destroy(uploadResult.public_id).catch(() => undefined);
    throw error;
  }

  if (user.imagePublicId) {
    await cloudinary.uploader.destroy(user.imagePublicId).catch(() => undefined);
  }

  return updatedUser;
};

const updateMyProfile = async (userId: string, input: z.infer<typeof UserValidation.UpdateProfileSchema>["body"]) => {
  const payload = UserValidation.UpdateProfileSchema.shape.body.parse(input);
  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId, isDeleted: false } });
    if (!user) throw new AppError(404, "User not found");
    if (payload.address !== undefined && user.role !== "CUSTOMER") throw new AppError(400, "Only customer profiles have an address");
    await tx.user.update({ where: { id: userId }, data: { name: payload.name, contactNumber: payload.contactNumber } });
    if (user.role === "CUSTOMER") {
      await tx.customer.upsert({
        where: { userId },
        create: { userId, address: payload.address, contactNumber: payload.contactNumber ?? user.contactNumber },
        update: { address: payload.address, contactNumber: payload.contactNumber },
      });
    }
    if (user.role === "COURIER" && payload.contactNumber !== undefined) {
      await tx.courier.updateMany({ where: { userId }, data: { contactNumber: payload.contactNumber } });
    }
    return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { customer: true } });
  });
  return safeUser(result);
};

export const UserService = {
  getMe,
  updateProfileImage,
  updateMyProfile,
};
