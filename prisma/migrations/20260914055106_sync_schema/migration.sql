/*
  Warnings:

  - The values [SUPER_ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'COURIER', 'CUSTOMER');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShipmentStatus" ADD VALUE 'AT_ORIGIN_HUB';
ALTER TYPE "ShipmentStatus" ADD VALUE 'AT_DESTINATION_HUB';
ALTER TYPE "ShipmentStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "ShipmentStatus" ADD VALUE 'DELIVERY_FAILED';

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "shipment_trackings" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "hubId" TEXT,
    "location" TEXT,
    "note" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_transfers" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "fromHubId" TEXT NOT NULL,
    "toHubId" TEXT NOT NULL,
    "transferredById" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "departureAt" TIMESTAMP(3),
    "arrivalAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipment_trackings_shipmentId_idx" ON "shipment_trackings"("shipmentId");

-- CreateIndex
CREATE INDEX "shipment_transfers_shipmentId_idx" ON "shipment_transfers"("shipmentId");

-- AddForeignKey
ALTER TABLE "shipment_trackings" ADD CONSTRAINT "shipment_trackings_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_trackings" ADD CONSTRAINT "shipment_trackings_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_trackings" ADD CONSTRAINT "shipment_trackings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_fromHubId_fkey" FOREIGN KEY ("fromHubId") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_toHubId_fkey" FOREIGN KEY ("toHubId") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
