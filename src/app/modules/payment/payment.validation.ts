import { z } from "zod";

const InitiatePaymentSchema = z.object({
  body: z.object({
    shipmentId: z.string().uuid(),
  }).strict(),
});

export const PaymentValidation = {
  BkashCallbackSchema: z.object({ query: z.object({ paymentID: z.string().min(1).max(150), status: z.enum(["success", "failure", "cancel"]) }) }),
  StripeCallbackSchema: z.object({ query: z.object({ session_id: z.string().min(1).max(150).startsWith("cs_") }) }),
  InitiatePaymentSchema,
};
