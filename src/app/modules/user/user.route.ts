import { Role } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth";
import { upload } from "../../middlewares/multer";
import validateRequest from "../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = express.Router();

router.get(
  "/me",
  auth(Role.CUSTOMER, Role.COURIER, Role.ADMIN),
  UserController.getMe
);

router.patch(
  "/me",
  auth(Role.ADMIN, Role.COURIER, Role.CUSTOMER),
  validateRequest(UserValidation.UpdateProfileSchema),
  UserController.updateMyProfile
);

router.patch(
  "/profile-image",
  auth(Role.CUSTOMER, Role.COURIER, Role.ADMIN),
  upload.single("profileImage"),
  UserController.updateProfileImage
);

export const UserRoutes = router;