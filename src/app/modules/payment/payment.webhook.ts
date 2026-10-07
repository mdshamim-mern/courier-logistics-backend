import type { Request, Response, NextFunction } from "express";
import type Stripe from "stripe";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { PaymentService, getStripe } from "./payment.service";

export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    if (!config.stripe_webhook_secret) throw new AppError(503, "Stripe webhook is not configured");
    const signature = req.get("stripe-signature");
    if (!signature || !Buffer.isBuffer(req.body)) throw new AppError(400, "Invalid webhook request");
    let event: Stripe.Event;
    try { event = getStripe().webhooks.constructEvent(req.body, signature, config.stripe_webhook_secret); }
    catch { throw new AppError(400, "Invalid webhook signature"); }
    await PaymentService.handleStripeEvent(event);
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}
