import { PrismaClient } from "@prisma/client";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";
import { cloudinary } from "../../utils/cloudinary";

const prisma = new PrismaClient();

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customerProfile: true,
      courierProfile: {
        include: {
          hub: true,
        },
      },
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const updateProfileImage = async (userId: string, fileBuffer: Buffer) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, imagePublicId: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const uploadResult = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Cloudinary upload failed"));
      resolve(result);
    }).end(fileBuffer);
  });

  const updatedUser = await prisma.user.update({
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

  if (user.imagePublicId) {
    await cloudinary.uploader.destroy(user.imagePublicId);
  }

  return updatedUser;
};

export const UserService = {
  getMe,
  updateProfileImage,
};