ALTER TABLE "shipments" ADD COLUMN     "bookingFingerprint" TEXT,
ADD COLUMN     "bookingKey" TEXT,
ADD COLUMN     "codAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "codFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "declaredValue" DECIMAL(10,2),
ADD COLUMN     "deliveryInstructions" TEXT,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupAreaId" TEXT,
ADD COLUMN     "pickupMode" TEXT NOT NULL DEFAULT 'HOME',
ADD COLUMN     "priceBreakdown" JSONB,
ADD COLUMN     "productType" TEXT,
ADD COLUMN     "receiverAreaId" TEXT,
ADD COLUMN     "requestedPickupAt" TIMESTAMP(3),
ADD COLUMN     "senderPhone" TEXT,
ADD COLUMN     "serviceType" TEXT NOT NULL DEFAULT 'STANDARD';

CREATE TABLE "service_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "upazila" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rate_plans" (
    "id" TEXT NOT NULL,
    "pickupAreaId" TEXT NOT NULL,
    "receiverAreaId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL DEFAULT 'STANDARD',
    "baseWeight" DECIMAL(10,2) NOT NULL,
    "baseCharge" DECIMAL(10,2) NOT NULL,
    "extraPerKg" DECIMAL(10,2) NOT NULL,
    "pickupFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "codPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "deliveryDays" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "payoutMethod" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courier_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_proofs" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cash_collections" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "payable" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COLLECTED',
    "receiptReference" TEXT,
    "payoutReference" TEXT,
    "receivedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_collections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_areas_name_key" ON "service_areas"("name");

CREATE UNIQUE INDEX "rate_plans_pickupAreaId_receiverAreaId_serviceType_key" ON "rate_plans"("pickupAreaId", "receiverAreaId", "serviceType");

CREATE UNIQUE INDEX "business_accounts_userId_key" ON "business_accounts"("userId");

CREATE UNIQUE INDEX "courier_applications_userId_key" ON "courier_applications"("userId");

CREATE UNIQUE INDEX "delivery_proofs_shipmentId_key" ON "delivery_proofs"("shipmentId");

CREATE UNIQUE INDEX "cash_collections_shipmentId_key" ON "cash_collections"("shipmentId");

CREATE UNIQUE INDEX "cash_collections_receiptReference_key" ON "cash_collections"("receiptReference");

CREATE UNIQUE INDEX "cash_collections_payoutReference_key" ON "cash_collections"("payoutReference");

CREATE INDEX "cash_collections_merchantId_status_idx" ON "cash_collections"("merchantId", "status");

CREATE INDEX "cash_collections_courierId_status_idx" ON "cash_collections"("courierId", "status");

CREATE UNIQUE INDEX "shipments_bookingKey_key" ON "shipments"("bookingKey");

ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "courier_applications" ADD CONSTRAINT "courier_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
