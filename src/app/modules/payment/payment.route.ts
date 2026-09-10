import express from "express";
import auth from "../../middlewares/auth";
import { PaymentController } from "./payment.controller";

const router = express.Router();

router.post("/initiate", auth("CUSTOMER"), PaymentController.initiatePayment);
router.get("/bkash/callback", PaymentController.bkashCallback);
router.get("/", auth("ADMIN", "SUPER_ADMIN", "CUSTOMER"), PaymentController.getPayments);

export const PaymentRoutes = router;