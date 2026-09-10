import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ShipmentController } from "./shipment.controller";
import { ShipmentValidation } from "./shipment.validation";

const router = express.Router();

router.post(
  "/",
  auth("CUSTOMER"),
  validateRequest(ShipmentValidation.CreateShipmentSchema),
  ShipmentController.createShipment
);

router.get(
  "/",
  auth("ADMIN", "SUPER_ADMIN", "CUSTOMER", "COURIER"),
  ShipmentController.getAllShipments
);

router.get(
  "/:id",
  auth("ADMIN", "SUPER_ADMIN", "CUSTOMER", "COURIER"),
  ShipmentController.getSingleShipment
);

router.patch(
  "/:id/assign",
  auth("ADMIN", "SUPER_ADMIN"),
  validateRequest(ShipmentValidation.AssignCourierSchema),
  ShipmentController.assignCourier
);

router.patch(
  "/:id/status",
  auth("ADMIN", "SUPER_ADMIN", "COURIER"),
  validateRequest(ShipmentValidation.UpdateShipmentStatusSchema),
  ShipmentController.updateShipmentStatus
);

export const ShipmentRoutes = router;