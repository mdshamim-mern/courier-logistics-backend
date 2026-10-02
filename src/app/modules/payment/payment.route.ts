import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = express.Router();

router.post("/initiate", auth("CUSTOMER"), validateRequest(PaymentValidation.InitiatePaymentSchema), PaymentController.initiatePayment);
router.post("/stripe/initiate", auth("CUSTOMER"), validateRequest(PaymentValidation.InitiatePaymentSchema), PaymentController.initiateStripePayment);
router.get("/bkash/callback", PaymentController.bkashCallback);
router.get("/stripe/callback", PaymentController.stripeCallback);
router.get("/", auth("ADMIN", "CUSTOMER"), PaymentController.getPayments);
router.get("/:id", auth("ADMIN", "CUSTOMER"), PaymentController.getSinglePayment);

export const PaymentRoutes = router;