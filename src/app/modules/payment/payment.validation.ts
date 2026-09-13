import { z } from "zod";

const InitiatePaymentSchema = z.object({
  body: z.object({
    shipmentId: z.string().uuid(),
  }),
});

export const PaymentValidation = {
  InitiatePaymentSchema,
};