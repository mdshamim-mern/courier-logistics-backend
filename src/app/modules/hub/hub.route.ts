import express from "express";
import auth from "../../middlewares/auth";
import { HubController } from "./hub.controller";

const router = express.Router();

router.post("/", auth("ADMIN"), HubController.createHub);
router.get("/", auth("ADMIN", "CUSTOMER", "COURIER"), HubController.getAllHubs);
router.get("/:id", auth("ADMIN", "CUSTOMER", "COURIER"), HubController.getSingleHub);
router.patch("/:id", auth("ADMIN"), HubController.updateHub);
router.delete("/:id", auth("ADMIN"), HubController.deleteHub);

export const HubRoutes = router;