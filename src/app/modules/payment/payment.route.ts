import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = express.Router();

router.post("/reconcile", auth("CUSTOMER"), validateRequest(PaymentValidation.InitiatePaymentSchema), PaymentController.reconcilePayment);

router.post("/initiate", auth("CUSTOMER"), validateRequest(PaymentValidation.InitiatePaymentSchema), PaymentController.initiatePayment);
router.post("/stripe/initiate", auth("CUSTOMER"), validateRequest(PaymentValidation.InitiatePaymentSchema), PaymentController.initiateStripePayment);
router.get("/bkash/callback", validateRequest(PaymentValidation.BkashCallbackSchema), PaymentController.bkashCallback);
router.get("/stripe/callback", validateRequest(PaymentValidation.StripeCallbackSchema), PaymentController.stripeCallback);
router.get("/", auth("ADMIN", "CUSTOMER"), PaymentController.getPayments);
router.get("/:id", auth("ADMIN", "CUSTOMER"), PaymentController.getSinglePayment);

export const PaymentRoutes = router;
