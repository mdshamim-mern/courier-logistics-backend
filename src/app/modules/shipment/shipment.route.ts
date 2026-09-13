import { Role } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ShipmentController } from "./shipment.controller";
import { ShipmentValidation } from "./shipment.validation";

const router = express.Router();

router.post(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER),
  validateRequest(ShipmentValidation.CreateShipmentSchema),
  ShipmentController.createShipment
);

router.get(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  ShipmentController.getAllShipments
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  ShipmentController.getSingleShipment
);

router.patch(
  "/:id/assign",
  auth(Role.ADMIN),
  validateRequest(ShipmentValidation.AssignCourierSchema),
  ShipmentController.assignCourier
);

router.patch(
  "/:id/status",
  auth(Role.ADMIN, Role.COURIER),
  validateRequest(ShipmentValidation.UpdateShipmentStatusSchema),
  ShipmentController.updateShipmentStatus
);

router.patch(
  "/:id/cancel",
  auth(Role.CUSTOMER),
  ShipmentController.cancelShipment
);

export const ShipmentRoutes = router;import { Role } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ShipmentController } from "./shipment.controller";
import { ShipmentValidation } from "./shipment.validation";

const router = express.Router();

router.post(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER),
  validateRequest(ShipmentValidation.CreateShipmentSchema),
  ShipmentController.createShipment
);

router.get(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  ShipmentController.getAllShipments
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  ShipmentController.getSingleShipment
);

router.patch(
  "/:id/assign",
  auth(Role.ADMIN),
  validateRequest(ShipmentValidation.AssignCourierSchema),
  ShipmentController.assignCourier
);

router.patch(
  "/:id/status",
  auth(Role.ADMIN, Role.COURIER),
  validateRequest(ShipmentValidation.UpdateShipmentStatusSchema),
  ShipmentController.updateShipmentStatus
);

router.patch(
  "/:id/cancel",
  auth(Role.CUSTOMER),
  ShipmentController.cancelShipment
);

export const ShipmentRoutes = router;