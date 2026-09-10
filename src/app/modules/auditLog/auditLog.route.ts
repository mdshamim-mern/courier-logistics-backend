import express from "express";
import auth from "../../middlewares/auth";
import { AuditLogController } from "./auditLog.controller";

const router = express.Router();

router.get(
  "/",
  auth("ADMIN", "SUPER_ADMIN"),
  AuditLogController.getAuditLogs
);

export const AuditLogRoutes = router;