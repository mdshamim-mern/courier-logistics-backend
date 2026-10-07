ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "shipments" ADD COLUMN "courierEarning" DECIMAL(10,2);

CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymentGateway" "PaymentGateway" NOT NULL,
    "transactionId" TEXT,
    "providerTransactionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "checkoutUrl" TEXT,
    "gatewayResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_attempts_transactionId_key" ON "payment_attempts"("transactionId");
CREATE UNIQUE INDEX "payment_attempts_providerTransactionId_key" ON "payment_attempts"("providerTransactionId");
CREATE INDEX "payment_attempts_paymentId_status_idx" ON "payment_attempts"("paymentId", "status");
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "payment_attempts" ("id", "paymentId", "paymentGateway", "transactionId", "amount", "currency", "status", "gatewayResponse", "paidAt", "createdAt", "updatedAt")
SELECT "id", "id", CASE WHEN "transactionId" LIKE 'cs_%' THEN 'STRIPE'::"PaymentGateway" ELSE "paymentGateway" END, "transactionId", "amount", "currency", "status", "gatewayResponse", "paidAt", "createdAt", "updatedAt"
FROM "payments" WHERE "transactionId" IS NOT NULL;

UPDATE "payments" SET "paymentGateway" = 'STRIPE' WHERE "transactionId" LIKE 'cs_%';
