import { Role } from "@prisma/client";
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CourierController } from "./courier.controller";
import { CourierValidation } from "./courier.validation";

const router = express.Router();

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(CourierValidation.createCourierZodSchema),
  CourierController.createCourier
);

router.get(
  "/",
  auth(Role.ADMIN),
  CourierController.getAllCouriers
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.COURIER),
  CourierController.getCourierDetails
);

router.patch(
  "/:id",
  auth(Role.ADMIN, Role.COURIER),
  validateRequest(CourierValidation.updateCourierZodSchema),
  CourierController.updateCourierProfile
);

router.get(
  "/:id/history-earnings",
  auth(Role.ADMIN, Role.COURIER),
  CourierController.getCourierHistoryAndEarnings
);

export const CourierRoutes = router;