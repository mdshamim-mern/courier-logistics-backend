import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

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
  validateRequest(AdminValidation.UpdateUserStatusSchema),
  AdminController.updateUserStatus
);

router.patch(
  "/users/:id/role",
  auth("ADMIN"),
  validateRequest(AdminValidation.UpdateUserRoleSchema),
  AdminController.updateUserRole
);

export const AdminRoutes = router;