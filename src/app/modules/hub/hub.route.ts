import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { HubController } from "./hub.controller";
import { HubValidation } from "./hub.validation";

const router = express.Router();

router.post("/", auth("ADMIN"), validateRequest(HubValidation.CreateHubSchema), HubController.createHub);
router.get("/", auth("ADMIN", "CUSTOMER", "COURIER"), HubController.getAllHubs);
router.get("/:id", auth("ADMIN", "CUSTOMER", "COURIER"), HubController.getSingleHub);
router.patch("/:id", auth("ADMIN"), validateRequest(HubValidation.UpdateHubSchema), HubController.updateHub);
router.delete("/:id", auth("ADMIN"), HubController.deleteHub);

export const HubRoutes = router;