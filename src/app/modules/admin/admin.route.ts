import express from "express";
import auth from "../../middlewares/auth";
import { AdminController } from "./admin.controller";

const router = express.Router();

router.get(
  "/dashboard-stats",
  auth("ADMIN"),
  AdminController.getDashboardStats
);

router.get(
  "/users",
  auth("ADMIN"),
  AdminController.getAllUsers
);

router.patch(
  "/users/:id/status",
  auth("ADMIN"),
  AdminController.updateUserStatus
);

export const AdminRoutes = router;