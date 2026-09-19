-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "shipment_trackings" DROP CONSTRAINT "shipment_trackings_updatedById_fkey";

-- DropIndex
DROP INDEX "payments_transactionId_idx";

-- DropIndex
DROP INDEX "shipments_trackingId_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- AlterTable
ALTER TABLE "shipment_trackings" ALTER COLUMN "updatedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "shipment_trackings" ADD CONSTRAINT "shipment_trackings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
