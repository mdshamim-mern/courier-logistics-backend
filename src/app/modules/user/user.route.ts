import express from "express";
import auth from "../../middlewares/auth";
import { upload } from "../../middlewares/multer";
import { UserController } from "./user.controller";

const router = express.Router();

router.get(
  "/me",
  auth("CUSTOMER", "COURIER", "ADMIN"),
  UserController.getMe
);

router.patch(
  "/profile-image",
  auth("CUSTOMER", "COURIER", "ADMIN"),
  upload.single("profileImage"),
  UserController.updateProfileImage
);

export const UserRoutes = router;