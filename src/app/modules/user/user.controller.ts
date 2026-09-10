import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await UserService.getMe(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateProfileImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, "Profile image file is required");
  }

  const userId = req.user.userId;
  const result = await UserService.updateProfileImage(userId, req.file.buffer);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile image updated successfully",
    data: result,
  });
});

export const UserController = {
  getMe,
  updateProfileImage,
};