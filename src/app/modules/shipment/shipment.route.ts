import { Role } from "@prisma/client";
import express from "express";
import { z } from "zod";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ShipmentController } from "./shipment.controller";
import { ShipmentValidation } from "./shipment.validation";

const router = express.Router();

router.get("/summary", auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER), ShipmentController.getShipmentSummary);

router.get("/track/:trackingId", validateRequest(z.object({ params: z.object({ trackingId: z.string().trim().min(8).max(80).regex(/^TRK-[A-Z0-9-]+$/).transform(value => value.toUpperCase()) }) })), ShipmentController.trackShipment);

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
