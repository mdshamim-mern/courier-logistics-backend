import express from "express";
import auth from "../../middlewares/auth";
import { AdminController } from "./admin.controller";

const router = express.Router();

router.get(
  "/dashboard-stats",
  auth("ADMIN", "SUPER_ADMIN"),
  AdminController.getDashboardStats
);

router.get(
  "/users",
  auth("ADMIN", "SUPER_ADMIN"),
  AdminController.getAllUsers
);

router.patch(
  "/users/:id/status",
  auth("ADMIN", "SUPER_ADMIN"),
  AdminController.updateUserStatus
);

export const AdminRoutes = router;