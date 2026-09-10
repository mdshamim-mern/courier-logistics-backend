import express from "express";
import { AdminRoutes } from "../modules/admin/admin.route";
import { AuditLogRoutes } from "../modules/auditLog/auditLog.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { HubRoutes } from "../modules/hub/hub.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { ShipmentRoutes } from "../modules/shipment/shipment.route";
import { UserRoutes } from "../modules/user/user.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/hubs",
    route: HubRoutes,
  },
  {
    path: "/shipments",
    route: ShipmentRoutes,
  },
  {
    path: "/payments",
    route: PaymentRoutes,
  },
  {
    path: "/audit-logs",
    route: AuditLogRoutes,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;