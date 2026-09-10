import express from "express";
import auth from "../../middlewares/auth";
import { upload } from "../../middlewares/multer";
import { UserController } from "./user.controller";

const router = express.Router();

router.get(
  "/me",
  auth("CUSTOMER", "COURIER", "ADMIN", "SUPER_ADMIN"),
  UserController.getMe
);

router.patch(
  "/profile-image",
  auth("CUSTOMER", "COURIER", "ADMIN", "SUPER_ADMIN"),
  upload.single("profileImage"),
  UserController.updateProfileImage
);

export const UserRoutes = router;