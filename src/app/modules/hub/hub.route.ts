import express from "express";
import auth from "../../middlewares/auth";
import { HubController } from "./hub.controller";

const router = express.Router();

router.post("/", auth("ADMIN", "SUPER_ADMIN"), HubController.createHub);
router.get("/", auth("ADMIN", "SUPER_ADMIN", "CUSTOMER", "COURIER"), HubController.getAllHubs);
router.get("/:id", auth("ADMIN", "SUPER_ADMIN", "CUSTOMER", "COURIER"), HubController.getSingleHub);
router.patch("/:id", auth("ADMIN", "SUPER_ADMIN"), HubController.updateHub);
router.delete("/:id", auth("ADMIN", "SUPER_ADMIN"), HubController.deleteHub);

export const HubRoutes = router;