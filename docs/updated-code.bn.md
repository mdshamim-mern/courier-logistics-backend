# পরিবর্তিত কোড: সম্পূর্ণ পথসহ

মূল কাঠামো রেখে সংশোধিত ফাইলের বর্তমান কোড নিচে আছে। প্রতিটি কোডের আগে সম্পূর্ণ স্থানীয় পথ দেওয়া হয়েছে। বাস্তব শংসাপত্রের ফাইল অন্তর্ভুক্ত করা হয়নি। যেগুলোতে কার্যকর পরিবর্তনের বদলে টাইপের আমদানি, ভাষা-সচেতন লিংক বা প্রবেশযোগ্যতার সংশোধন হয়েছে, সেগুলোও অন্তর্ভুক্ত।

মোট কোড ফাইল: 83।

অন্যান্য পরিবর্তিত ফাইল:

- [package-lock.json](D:/NEXT_LEVEL_WEB_DEV/assignment/courier-backend/package-lock.json)

লকফাইল, গিটের উপেক্ষার নিয়ম এবং নেক্সটের তৈরি ঘোষণা উপরে মূল ফাইলের লিংকে আছে। স্বয়ংক্রিয়ভাবে তৈরি AGENTS.md ও CLAUDE.md এবং আপনার অব্যবহৃত খালি ফাইল এই কোড-তালিকার অংশ নয়। চালানোর নিয়ম, পরীক্ষা ও প্রকাশের আগে বাকি কাজ production-readiness.bn.md নথিতে আছে।



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\.env.example

```dotenv
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

DATABASE_URL="postgresql://user:password@localhost:5432/courier_db?schema=public"
REDIS_URL="redis://localhost:6379"
STAGING_DATABASE_URL=""
INTEGRATION_DATABASE_URL=""
INTEGRATION_REDIS_URL=""
PRISMA_TRANSACTION_MAX_WAIT_MS=10000
PRISMA_TRANSACTION_TIMEOUT_MS=20000

JWT_ACCESS_SECRET="replace-with-a-random-access-secret-of-32-or-more-characters"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="replace-with-a-different-random-refresh-secret-of-32-or-more-characters"
JWT_REFRESH_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=12

GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

EMAIL_SENDER="noreply@courier.com"
SMTP_PASSWORD="your_smtp_password"
SMTP_SEND_TIMEOUT_MS=25000

BKASH_BASE_URL="https://tokenized.sandbox.bka.sh/v1.2.0-beta"
BKASH_USERNAME="your_bkash_username"
BKASH_PASSWORD="your_bkash_password"
BKASH_APP_KEY="your_bkash_app_key"
BKASH_APP_SECRET="your_bkash_app_secret"
BKASH_CALLBACK_URL="http://localhost:5000/api/v1/payments/bkash/callback"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
COOKIE_SAME_SITE="lax"
TRUST_PROXY_HOPS=0
COURIER_COMMISSION_RATE=""
ALLOW_DEMO_SEED=false
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\.github\workflows\ci.yml

```yaml
name: backend-checks
on:
  push:
  pull_request:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: courier
          POSTGRES_PASSWORD: courier
          POSTGRES_DB: courier_test
        ports:
          - 5432:5432
        options: --health-cmd "pg_isready -U courier -d courier_test" --health-interval 5s --health-timeout 5s --health-retries 10
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: --health-cmd "redis-cli ping" --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      NODE_ENV: test
      DATABASE_URL: postgresql://courier:courier@localhost:5432/courier_test
      INTEGRATION_DATABASE_URL: postgresql://courier:courier@localhost:5432/courier_test
      REDIS_URL: redis://localhost:6379
      INTEGRATION_REDIS_URL: redis://localhost:6379/15
      JWT_ACCESS_SECRET: ci-access-secret-at-least-32-characters
      JWT_REFRESH_SECRET: ci-refresh-secret-at-least-32-characters
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run audit:security
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run db:deploy
      - run: npm run test:integration
      - run: npm run build
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\package.json

```json
{
	"name": "project-courier-backend",
	"version": "1.0.0",
	"description": "",
	"main": "dist/server.js",
	"engines": { "node": ">=22 <27" },
	"overrides": { "esbuild": "^0.28.2" },
	"scripts": {
		"dev": "tsx watch src/server.ts",
		"build": "prisma generate && tsup",
		"start": "node dist/server.js",
		"postinstall": "prisma generate",
		"typecheck": "tsc --noEmit",
		"test": "tsx --test tests/*.test.ts",
		"test:integration": "tsx --test tests/integration/*.test.ts",
		"test:staging": "node scripts/staging-integration.mjs",
		"test:recovery": "node scripts/staging-recovery.mjs",
		"audit:security": "npm audit --audit-level=high",
		"test:providers": "node scripts/provider-smoke.mjs",
		"test:bkash:interactive": "node scripts/bkash-interactive.mjs",
		"lint": "biome lint src",
		"db:deploy": "node scripts/deploy-migrations.mjs"
	},
	"dependencies": {
		"@prisma/client": "^5.10.2",
		"bcryptjs": "^2.4.3",
		"cloudinary": "^2.0.1",
		"cookie-parser": "^1.4.6",
		"cors": "^2.8.5",
		"date-fns": "^3.3.1",
		"dotenv": "^16.4.5",
		"express": "^4.18.3",
		"express-rate-limit": "^7.2.0",
		"google-auth-library": "^11.1.0",
		"helmet": "^7.1.0",
		"http-status": "^1.7.4",
		"jsonwebtoken": "^9.0.2",
		"multer": "^2.4.0",
		"nodemailer": "^10.0.16",
		"pg": "^8.11.3",
		"redis": "^4.6.13",
		"stripe": "^23.0.0",
		"zod": "^3.22.4"
	},
	"devDependencies": {
		"@biomejs/biome": "^1.6.0",
		"@types/bcryptjs": "^2.4.6",
		"@types/cookie-parser": "^1.4.7",
		"@types/cors": "^2.8.17",
		"@types/ejs": "^3.1.5",
		"@types/express": "^4.17.21",
		"@types/jsonwebtoken": "^9.0.6",
		"@types/multer": "^1.4.11",
		"@types/node": "^20.11.24",
		"@types/nodemailer": "^8.0.2",
		"@types/pdfkit": "^0.13.4",
		"@types/pg": "^8.11.2",
		"prisma": "^5.10.2",
		"ts-node": "^10.9.2",
		"tsup": "^8.0.2",
		"tsx": "^4.7.1",
		"typescript": "^5.3.3"
	},
	"prisma": {
		"seed": "ts-node prisma/seed.ts"
	}
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\prisma\migrations\20261008000000_security_payment_attempts\migration.sql

```sql
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
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\prisma\schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  COURIER
  CUSTOMER
}

enum UserStatus {
  ACTIVE
  BLOCKED
  DELETED
}

enum AuthProvider {
  CREDENTIAL
  GOOGLE
}

enum ShipmentStatus {
  PENDING
  ASSIGNED
  PICKED_UP
  AT_ORIGIN_HUB
  IN_TRANSIT
  AT_DESTINATION_HUB
  OUT_FOR_DELIVERY
  DELIVERED
  DELIVERY_FAILED
  RETURNED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PAID
  FAILED
  CANCELLED
  REFUNDED
}

enum PaymentGateway {
  BKASH
  STRIPE
  SSLCOMMERZ
}

model User {
  id                 String       @id @default(uuid())
  name               String
  email              String       @unique
  password           String?
  googleId           String?      @unique
  authProvider       AuthProvider @default(CREDENTIAL)
  role               Role         @default(CUSTOMER)
  status             UserStatus   @default(ACTIVE)
  emailVerified      Boolean      @default(false)
  needPasswordChange Boolean      @default(false)
  tokenVersion       Int          @default(0)
  contactNumber      String?
  imageUrl           String?
  imagePublicId      String?
  isDeleted          Boolean      @default(false)
  deletedAt          DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  customer             Customer?
  courier              Courier?
  sentShipments        Shipment[]         @relation("SenderShipments")
  deliveries           Shipment[]         @relation("CourierDeliveries")
  auditLogs            AuditLog[]
  shipmentTrackings    ShipmentTracking[]
  transferredShipments ShipmentTransfer[]
  businessAccount      BusinessAccount?
  courierApplication   CourierApplication?

  @@index([role])
  @@index([isDeleted])
  @@map("users")
}

model Customer {
  id            String    @id @default(uuid())
  userId        String    @unique
  contactNumber String?
  address       String?
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("customers")
}

model Courier {
  id            String    @id @default(uuid())
  userId        String    @unique
  contactNumber String
  vehicleType   String?
  vehicleNumber String?
  isAvailable   Boolean   @default(true)
  currentHubId  String?
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  hub  Hub?  @relation(fields: [currentHubId], references: [id], onDelete: SetNull)

  @@index([isAvailable])
  @@map("couriers")
}

model Hub {
  id        String    @id @default(uuid())
  name      String    @unique
  location  String
  address   String
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  couriers             Courier[]
  originShipments      Shipment[]         @relation("OriginHub")
  destinationShipments Shipment[]         @relation("DestinationHub")
  trackingRecords      ShipmentTracking[]
  transfersFrom        ShipmentTransfer[] @relation("FromHub")
  transfersTo          ShipmentTransfer[] @relation("ToHub")

  @@map("hubs")
}

model Shipment {
  bookingKey String? @unique
  bookingFingerprint String?
  id                String         @id @default(uuid())
  trackingId        String         @unique
  senderId          String
  courierId         String?
  originHubId       String?
  destinationHubId  String?
  receiverName      String
  receiverPhone     String
  receiverAddress   String
  weight            Decimal        @db.Decimal(10, 2)
  price             Decimal        @db.Decimal(10, 2)
  courierEarning    Decimal?       @db.Decimal(10, 2)
  status            ShipmentStatus @default(PENDING)
  estimatedDelivery DateTime?
  isDeleted         Boolean        @default(false)
  deletedAt         DateTime?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  sender         User               @relation("SenderShipments", fields: [senderId], references: [id], onDelete: Restrict)
  courier        User?              @relation("CourierDeliveries", fields: [courierId], references: [id], onDelete: SetNull)
  originHub      Hub?               @relation("OriginHub", fields: [originHubId], references: [id], onDelete: SetNull)
  destinationHub Hub?               @relation("DestinationHub", fields: [destinationHubId], references: [id], onDelete: SetNull)
  payment        Payment?
  trackings      ShipmentTracking[]
  transfers      ShipmentTransfer[]
  deliveryProof DeliveryProof?
  collection CashCollection?

  pickupAddress String?
  senderPhone String?
  pickupAreaId String?
  receiverAreaId String?
  pickupMode String @default("HOME")
  productType String?
  declaredValue Decimal? @db.Decimal(10, 2)
  codAmount Decimal @default(0) @db.Decimal(10, 2)
  codFee Decimal @default(0) @db.Decimal(10, 2)
  priceBreakdown Json?
  requestedPickupAt DateTime?
  deliveryInstructions String?
  serviceType String @default("STANDARD")

  @@index([senderId])
  @@index([courierId])
  @@index([status])
  @@map("shipments")
}

model ShipmentTracking {
  id         String         @id @default(uuid())
  shipmentId String
  status     ShipmentStatus
  hubId      String?
  location   String?
  note       String?
  updatedById String?
  createdAt  DateTime       @default(now())

  shipment  Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  hub       Hub?     @relation(fields: [hubId], references: [id], onDelete: SetNull)
  updatedBy User?    @relation(fields: [updatedById], references: [id], onDelete: SetNull)

  @@index([shipmentId])
  @@map("shipment_trackings")
}

model ShipmentTransfer {
  id             String         @id @default(uuid())
  shipmentId     String
  fromHubId      String
  toHubId        String
  transferredById String
  status         ShipmentStatus @default(IN_TRANSIT)
  departureAt    DateTime?
  arrivalAt      DateTime?
  notes          String?
  createdAt      DateTime       @default(now())

  shipment      Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  fromHub       Hub      @relation("FromHub", fields: [fromHubId], references: [id], onDelete: Restrict)
  toHub         Hub      @relation("ToHub", fields: [toHubId], references: [id], onDelete: Restrict)
  transferredBy User     @relation(fields: [transferredById], references: [id], onDelete: Restrict)

  @@index([shipmentId])
  @@map("shipment_transfers")
}

model Payment {
  id              String         @id @default(uuid())
  shipmentId      String         @unique
  amount          Decimal        @db.Decimal(10, 2)
  currency        String         @default("BDT")
  paymentGateway  PaymentGateway @default(BKASH)
  transactionId   String?        @unique
  status          PaymentStatus  @default(UNPAID)
  payerReference  String?
  gatewayResponse Json?
  paidAt          DateTime?
  isDeleted       Boolean        @default(false)
  deletedAt       DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  shipment Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  attempts PaymentAttempt[]

  @@map("payments")
}

model PaymentAttempt {
  id                    String         @id @default(uuid())
  paymentId             String
  paymentGateway        PaymentGateway
  transactionId         String?        @unique
  providerTransactionId String?        @unique
  amount                Decimal        @db.Decimal(10, 2)
  currency              String         @default("BDT")
  status                PaymentStatus  @default(UNPAID)
  checkoutUrl           String?
  gatewayResponse       Json?
  paidAt                DateTime?
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId, status])
  @@map("payment_attempts")
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String
  entityId   String
  entityType String
  details    Json?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entityId, entityType])
  @@map("audit_logs")
}

model ServiceArea {
  id String @id @default(uuid())
  name String @unique
  district String
  upazila String
  hubId String
  pickupEnabled Boolean @default(false)
  dropoffEnabled Boolean @default(false)
  deliveryEnabled Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("service_areas")
}
model RatePlan {
  id String @id @default(uuid())
  pickupAreaId String
  receiverAreaId String
  serviceType String @default("STANDARD")
  baseWeight Decimal @db.Decimal(10, 2)
  baseCharge Decimal @db.Decimal(10, 2)
  extraPerKg Decimal @db.Decimal(10, 2)
  pickupFee Decimal @default(0) @db.Decimal(10, 2)
  codPercent Decimal @default(0) @db.Decimal(5, 2)
  deliveryDays Int
  cutoffMinutes Int?
  active Boolean @default(false)
  updatedAt DateTime @updatedAt
  @@unique([pickupAreaId, receiverAreaId, serviceType])
  @@map("rate_plans")
}
model BusinessAccount {
  id String @id @default(uuid())
  userId String @unique
  shopName String
  pickupAddress String
  contactNumber String
  payoutMethod String
  accountName String
  accountNumber String
  approved Boolean @default(false)
  reviewNote String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("business_accounts")
}
model CourierApplication {
  id String @id @default(uuid())
  userId String @unique
  contactNumber String
  area String
  vehicleType String
  status String @default("PENDING")
  reviewNote String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("courier_applications")
}
model DeliveryProof {
  id String @id @default(uuid())
  shipmentId String @unique
  receiverName String
  signature String
  recordedById String
  acknowledged Boolean
  createdAt DateTime @default(now())
  shipment Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  @@map("delivery_proofs")
}
model CashCollection {
  id String @id @default(uuid())
  shipmentId String @unique
  merchantId String
  courierId String
  amount Decimal @db.Decimal(10, 2)
  fee Decimal @db.Decimal(10, 2)
  payable Decimal @db.Decimal(10, 2)
  status String @default("COLLECTED")
  receiptReference String? @unique
  payoutReference String? @unique
  receivedAt DateTime?
  paidAt DateTime?
  createdAt DateTime @default(now())
  shipment Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  @@index([merchantId, status])
  @@index([courierId, status])
  @@map("cash_collections")
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\prisma\seed.ts

```ts
import { PrismaClient, Role, UserStatus, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seeding requires ALLOW_DEMO_SEED=true outside production");
  }
  const adminEmail = "admin@courier.com";
  const courierEmail = "courier@courier.com";
  
  const customerEmail = "customer@courier.com";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin@12345", 10);
    await prisma.user.create({
      data: {
        name: "Demo Admin",
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.CREDENTIAL,
        emailVerified: true,
      },
    });
  }

  const existingCourier = await prisma.user.findUnique({
    where: { email: courierEmail },
  });

  if (!existingCourier) {
    const hashedPassword = await bcrypt.hash("Courier@1234", 10);
    const courierUser = await prisma.user.create({
      data: {
        name: "Demo Courier",
        email: courierEmail,
        password: hashedPassword,
        role: Role.COURIER,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.CREDENTIAL,
        emailVerified: true,
      },
    });

    await prisma.courier.create({
      data: {
        userId: courierUser.id,
        contactNumber: "01700000000",
        isAvailable: true,
      },
    });
  }

  const existingCustomer = await prisma.user.findUnique({
    where: { email: customerEmail },
  });

  if (!existingCustomer) {
    const hashedPassword = await bcrypt.hash("Customer@1234", 10);
    const customerUser = await prisma.user.create({
      data: {
        name: "Demo Customer",
        email: customerEmail,
        password: hashedPassword,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.CREDENTIAL,
        emailVerified: true,
      },
    });

    await prisma.customer.create({
      data: {
        userId: customerUser.id,
        contactNumber: "01800000000",
        address: "House 12, Road 5, Savar, Dhaka",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\app.ts

```ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import config from "./config";
import { csrfProtection } from "./middlewares/csrf";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import rateLimiter from "./middlewares/rateLimiter";
import { stripeWebhook } from "./modules/payment/payment.webhook";
import router from "./routes";
import { logger } from "./utils/logger";
import { prisma } from "./utils/prisma";
import { connectRedis, redisClient } from "./utils/redis";

const app: Application = express();
app.disable("x-powered-by");
app.set("trust proxy", config.trust_proxy_hops);
app.use(helmet());
app.use((req, res, next) => {
  const requestId = randomUUID();
  const start = Date.now();
  res.setHeader("X-Request-ID", requestId);
  res.on("finish", () => logger.info("http_request", { requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start }));
  next();
});
app.use(cors({ origin: new URL(config.frontend_url).origin, credentials: true, allowedHeaders: ["Content-Type", "Authorization", "X-Courier-Client"], exposedHeaders: ["X-Request-ID"] }));

app.get("/health/live", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/ready", async (req, res) => {
  try {
    await connectRedis();
    await Promise.all([prisma.$queryRaw`SELECT 1`, redisClient.ping()]);
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});
app.use("/api", async (req, res, next) => {
  try { await connectRedis(); next(); } catch (error) { next(error); }
});
app.post("/api/v1/payments/stripe/webhook", express.raw({ type: "application/json", limit: "256kb" }), stripeWebhook);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use("/api", rateLimiter, csrfProtection);
app.use("/api/v1", (req, res, next) => {
  const match = req.path.match(/^\/(shipments|couriers|payments|hubs|admin\/users)\/([^/]+)/);
  if (match && !["track", "summary", "reconcile", "initiate", "stripe", "bkash"].includes(match[2])) {
    const parsed = z.string().uuid().safeParse(match[2]);
    if (!parsed.success) return next(parsed.error);
  }
  next();
});
app.use("/api/v1", router);
app.get("/", (req: Request, res: Response) => res.status(200).json({ success: true, message: "Courier & Logistics Platform API is running" }));
app.use(notFound);
app.use(globalErrorHandler);
export default app;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\config\index.ts

```ts
import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const environmentSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().int().min(1).max(65535).default(5000),
	DATABASE_URL: z.string().url(),
	REDIS_URL: z.string().url(),
	PRISMA_TRANSACTION_MAX_WAIT_MS: z.coerce
		.number()
		.int()
		.min(1000)
		.max(30000)
		.default(10000),
	PRISMA_TRANSACTION_TIMEOUT_MS: z.coerce
		.number()
		.int()
		.min(1000)
		.max(60000)
		.default(20000),
	SMTP_SEND_TIMEOUT_MS: z.coerce
		.number()
		.int()
		.min(5000)
		.max(60000)
		.default(25000),
	FRONTEND_URL: z.string().url().default("http://localhost:3000"),
	JWT_ACCESS_SECRET: z.string().min(32),
	JWT_REFRESH_SECRET: z.string().min(32),
	JWT_ACCESS_EXPIRES_IN: z
		.string()
		.regex(/^\d+[smhd]$/)
		.default("15m"),
	JWT_REFRESH_EXPIRES_IN: z
		.string()
		.regex(/^\d+[smhd]$/)
		.default("7d"),
	BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
	COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
	TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
	COURIER_COMMISSION_RATE: z.preprocess(
		(value) => (value === "" ? undefined : value),
		z.coerce.number().min(0).max(1).optional(),
	),
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) {
	throw new Error(
		`Invalid environment configuration: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
	);
}
const environment = parsed.data;
if (environment.JWT_ACCESS_SECRET === environment.JWT_REFRESH_SECRET) {
	throw new Error("Access and refresh secrets must be different");
}
if (
	environment.COOKIE_SAME_SITE === "none" &&
	environment.NODE_ENV !== "production"
) {
	throw new Error("Cross-site cookies require production HTTPS");
}

export default {
	env: environment.NODE_ENV,
	port: environment.PORT,
	database_url: environment.DATABASE_URL,
	prisma_transaction_max_wait_ms: environment.PRISMA_TRANSACTION_MAX_WAIT_MS,
	prisma_transaction_timeout_ms: environment.PRISMA_TRANSACTION_TIMEOUT_MS,
	smtp_send_timeout_ms: environment.SMTP_SEND_TIMEOUT_MS,
	frontend_url: environment.FRONTEND_URL.replace(/\/$/, ""),
	bcrypt_salt_rounds: environment.BCRYPT_SALT_ROUNDS,
	jwt_access_secret: environment.JWT_ACCESS_SECRET,
	jwt_refresh_secret: environment.JWT_REFRESH_SECRET,
	jwt_access_expires_in: environment.JWT_ACCESS_EXPIRES_IN,
	jwt_refresh_expires_in: environment.JWT_REFRESH_EXPIRES_IN,
	cookie_same_site: environment.COOKIE_SAME_SITE,
	trust_proxy_hops: environment.TRUST_PROXY_HOPS,
	courier_commission_rate: environment.COURIER_COMMISSION_RATE,
	google_client_id: process.env.GOOGLE_CLIENT_ID,
	cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
	cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
	redis_url: environment.REDIS_URL,
	stripe_secret_key: process.env.STRIPE_SECRET_KEY,
	stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
	bkash_base_url: process.env.BKASH_BASE_URL,
	bkash_username: process.env.BKASH_USERNAME,
	bkash_password: process.env.BKASH_PASSWORD,
	bkash_app_key: process.env.BKASH_APP_KEY,
	bkash_app_secret: process.env.BKASH_APP_SECRET,
	bkash_callback_url: process.env.BKASH_CALLBACK_URL,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\errors\handleCastError.ts

```ts
const handleCastError = (err: { path?: string; message?: string }) => {
  const statusCode = 400;
  
  const errorSources = [
    {
      path: err.path || "id",
      message: err.message || "Invalid data type provided",
    },
  ];

  return {
    statusCode,
    message: "Invalid Type Error",
    errorSources,
  };
};

export default handleCastError;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\errors\handleDuplicateError.ts

```ts
import type { Prisma } from "@prisma/client";

const handleDuplicateError = (err: Prisma.PrismaClientKnownRequestError) => {
  const target = err.meta?.target as string[];
  const message = "Duplicate Entry Error";
  
  const errorSources = target?.map((field: string) => ({
    path: field,
    message: `The ${field} provided is already in use`,
  })) || [
    {
      path: "",
      message: "Duplicate value entered",
    }
  ];

  const statusCode = 409;

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handleDuplicateError;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\errors\handlePrismaError.ts

```ts
import type { Prisma } from "@prisma/client";

const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError) => {
  let errorSources = [];
  let message = "";
  const statusCode = 400;

  if (err.code === "P2025") {
    message = "Record not found";
    errorSources = [
      {
        path: "",
        message: err.meta?.cause as string || "Record not found",
      },
    ];
  } else if (err.code === "P2003") {
    message = "Foreign key constraint failed";
    errorSources = [
      {
        path: "",
        message: "Foreign key constraint failed on the field",
      },
    ];
  } else {
    message = "Prisma Request Error";
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handlePrismaError;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\errors\handleZodError.ts

```ts
import type { ZodError, ZodIssue } from "zod";

const handleZodError = (err: ZodError) => {
  const errorSources = err.issues.map((issue: ZodIssue) => {
    return {
      path: issue?.path[issue.path.length - 1],
      message: issue.message,
    };
  });

  const statusCode = 400;

  return {
    statusCode,
    message: "Validation Error",
    errorSources,
  };
};

export default handleZodError;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\auth.ts

```ts
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";
import { AppError } from "../errors/AppError";
import { prisma } from "../utils/prisma";
import { hasSession } from "../utils/session";

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & { userId: string; role: Role; sessionId: string };
    }
  }
}

const auth = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bearer = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
      const token = req.cookies?.accessToken || bearer;
      if (!token) throw new AppError(401, "Authentication required");
      const decoded = jwt.verify(token, config.jwt_access_secret, { algorithms: ["HS256"] }) as JwtPayload;
      if (typeof decoded.userId !== "string" || typeof decoded.sessionId !== "string") {
        throw new AppError(401, "Invalid session");
      }
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || user.isDeleted || user.status !== "ACTIVE") throw new AppError(403, "User account is not accessible");
      if (decoded.tokenVersion !== user.tokenVersion || !(await hasSession(decoded.sessionId))) throw new AppError(401, "Session expired");
      if (!user.emailVerified) throw new AppError(403, "Email verification required");
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) throw new AppError(403, "You do not have permission for this action");
      req.user = { ...decoded, sessionId: decoded.sessionId, userId: user.id, email: user.email, name: user.name, role: user.role };
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\csrf.ts

```ts
import type { RequestHandler } from "express";
import config from "../config";
import { AppError } from "../errors/AppError";

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin !== new URL(config.frontend_url).origin) return next(new AppError(403, "Request origin is not allowed"));
  if ((req.cookies?.accessToken || req.cookies?.refreshToken) && req.get("X-Courier-Client") !== "1") {
    return next(new AppError(403, "Missing request verification header"));
  }
  next();
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\globalErrorHandler.ts

```ts
import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from "jsonwebtoken";
import multer from "multer";
import { ZodError } from "zod";
import config from "../config";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let statusCode = 500;
  let message = "An unexpected error occurred";
  let errors: { path: string; message: string }[] = [];
  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    errors = error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }));
  } else if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
    statusCode = 401;
    message = "Invalid or expired session";
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof multer.MulterError) {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = error.code === "LIMIT_FILE_SIZE" ? "Image exceeds the 5 MB limit" : "Invalid upload";
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") { statusCode = 409; message = "Record already exists"; }
    if (error.code === "P2025") { statusCode = 404; message = "Record not found"; }
    if (error.code === "P2003") { statusCode = 400; message = "Related record is invalid"; }
    if (error.code === "P2034") { statusCode = 409; message = "Record changed, please try again"; }
  } else if (error?.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON request";
  } else if (error?.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }
  if (statusCode >= 500) logger.error("request_failed", { requestId: res.getHeader("X-Request-ID"), path: req.path, code: error?.code, name: error?.name });
  if (!errors.length) errors = [{ path: "", message }];
  res.status(statusCode).json({ success: false, message, errors, requestId: res.getHeader("X-Request-ID"), ...(config.env === "development" ? { stack: error?.stack } : {}) });
};
export default globalErrorHandler;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\multer.ts

```ts
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../errors/AppError";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Only JPEG, PNG, and WEBP image files are allowed"
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter,
});
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\notFound.ts

```ts
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API Not Found",
    errors: [
      {
        path: req.originalUrl,
        message: "Your requested path is not found!",
      },
    ],
  });
};

export default notFound;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\rateLimiter.ts

```ts
import rateLimit, { type IncrementResponse, type Options, type Store } from "express-rate-limit";
import { createHash } from "node:crypto";
import { redisClient } from "../utils/redis";

class RedisLimitStore implements Store {
  windowMs = 15 * 60 * 1000;
  constructor(public prefix: string) {}
  init(options: Options) { this.windowMs = options.windowMs; }
  async increment(key: string): Promise<IncrementResponse> {
    const result = await redisClient.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return {count, redis.call('PTTL', KEYS[1])}",
      { keys: [this.prefix + key], arguments: [String(this.windowMs)] },
    ) as number[];
    return { totalHits: result[0], resetTime: new Date(Date.now() + result[1]) };
  }
  async decrement(key: string) {
    await redisClient.eval("if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('DECR', KEYS[1]) end; return 1", { keys: [this.prefix + key], arguments: [] });
  }
  async resetKey(key: string) { await redisClient.del(this.prefix + key); }
}

const message = { success: false, message: "Too many requests, please try again later" };
const rateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, store: new RedisLimitStore("limit:api:"), message });
export const authRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, store: new RedisLimitStore("limit:auth:"), message });
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, store: new RedisLimitStore("limit:otp:"), message,
  keyGenerator: req => createHash("sha256").update(typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : req.ip || "unknown").digest("hex"),
});
export default rateLimiter;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\middlewares\validateRequest.ts

```ts
import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";

const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        cookies: req.cookies,
        params: req.params,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.cookies !== undefined) req.cookies = parsed.cookies;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\admin\admin.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AdminService } from "./admin.service";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard statistics retrieved successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateUserStatus(
    req.params.id,
    req.body.status,
    req.user.userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateUserRole(
    req.params.id,
    req.body.role,
    req.user.userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

export const AdminController = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\admin\admin.service.ts

```ts
import { type Prisma, Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { lockCourier } from "../../utils/rowLocks";
import { listQuerySchema } from "../../utils/query";
import { ACTIVE_SHIPMENT_STATUSES } from "../shipment/shipment.rules";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

async function lockAdminMutation(
	tx: Prisma.TransactionClient,
	userId: string,
	adminId: string,
) {
	await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(702045)`;
	const actor = await tx.user.findUnique({ where: { id: adminId } });
	if (
		!actor ||
		actor.role !== Role.ADMIN ||
		actor.status !== UserStatus.ACTIVE ||
		actor.isDeleted ||
		!actor.emailVerified
	)
		throw new AppError(403, "Administrator access is no longer valid");
	const user = await tx.user.findUnique({
		where: { id: userId, isDeleted: false },
	});
	if (!user) throw new AppError(404, "User not found");
	return user;
}

async function assertAnotherAdmin(tx: Prisma.TransactionClient) {
	const count = await tx.user.count({
		where: {
			role: Role.ADMIN,
			status: UserStatus.ACTIVE,
			isDeleted: false,
			emailVerified: true,
		},
	});
	if (count <= 1)
		throw new AppError(409, "At least one active administrator must remain");
}

const getDashboardStats = async () => {
	const totalCustomers = await prisma.user.count({
		where: { role: Role.CUSTOMER, isDeleted: false },
	});

	const totalCouriers = await prisma.user.count({
		where: { role: Role.COURIER, isDeleted: false },
	});

	const totalShipments = await prisma.shipment.count({
		where: { isDeleted: false },
	});

	const shipmentsByStatus = await prisma.shipment.groupBy({
		by: ["status"],
		_count: { status: true },
		where: { isDeleted: false },
	});

	const revenueResult = await prisma.payment.aggregate({
		_sum: { amount: true },
		where: { status: "PAID", isDeleted: false },
	});

	const totalRevenue = revenueResult._sum.amount
		? Number(revenueResult._sum.amount)
		: 0;

	return {
		totalCustomers,
		totalCouriers,
		totalShipments,
		totalRevenue,
		shipmentsByStatus,
	};
};

const getAllUsers = async (query: unknown) => {
	const { role, status, searchTerm, page, limit, sortBy, sortOrder } =
		listQuerySchema.parse(query);
	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: Prisma.UserWhereInput[] = [{ isDeleted: false }];

	if (role) {
		andConditions.push({ role });
	}

	if (status) {
		andConditions.push({ status: z.nativeEnum(UserStatus).parse(status) });
	}

	if (searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: searchTerm, mode: "insensitive" } },
				{ email: { contains: searchTerm, mode: "insensitive" } },
			],
		});
	}

	const allowedSortFields = ["createdAt", "name", "email", "status", "role"];
	const validSortBy = allowedSortFields.includes(sortBy as string)
		? sortBy
		: "createdAt";

	const result = await prisma.user.findMany({
		where: { AND: andConditions },
		skip,
		take,
		orderBy: { [validSortBy]: sortOrder },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			createdAt: true,
		},
	});

	const total = await prisma.user.count({ where: { AND: andConditions } });

	return {
		meta: {
			page: Number(page),
			limit: Number(limit),
			total,
			totalPages: Math.ceil(total / take),
		},
		data: result,
	};
};

const updateUserStatus = async (
	userId: string,
	status: UserStatus,
	adminId: string,
) => {
	if (userId === adminId && status !== "ACTIVE")
		throw new AppError(400, "Cannot block or delete your own account");
	const user = await prisma.user.findUnique({
		where: { id: userId, isDeleted: false },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const result = await prisma.$transaction(async (tx) => {
		const currentUser = await lockAdminMutation(tx, userId, adminId);
		if (currentUser.role === Role.ADMIN && status !== UserStatus.ACTIVE)
			await assertAnotherAdmin(tx);
		const updatedUser = await tx.user.update({
			where: { id: userId },
			data: {
				status,
				tokenVersion: { increment: 1 },
				isDeleted: status === "DELETED",
				deletedAt: status === "DELETED" ? new Date() : null,
			},
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				status: true,
			},
		});

		await tx.auditLog.create({
			data: {
				userId: adminId,
				action: "UPDATE_USER_STATUS",
				entityId: userId,
				entityType: "USER",
				details: { previousStatus: currentUser.status, newStatus: status },
			},
		});

		return updatedUser;
	});

	return result;
};

const updateUserRole = async (userId: string, role: Role, adminId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId, isDeleted: false },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.id === adminId) {
		throw new AppError(httpStatus.BAD_REQUEST, "Cannot update your own role");
	}

	const result = await prisma.$transaction(async (tx) => {
		const currentUser = await lockAdminMutation(tx, userId, adminId);
		if (currentUser.role === Role.ADMIN && role !== Role.ADMIN)
			await assertAnotherAdmin(tx);
		await lockCourier(tx, userId);
		if (currentUser.role === Role.COURIER && role !== Role.COURIER) {
			const active = await tx.shipment.count({
				where: {
					courierId: userId,
					isDeleted: false,
					status: { in: ACTIVE_SHIPMENT_STATUSES },
				},
			});
			if (active)
				throw new AppError(
					409,
					"Complete or reassign the courier deliveries before changing role",
				);
		}
		if (role === Role.COURIER) {
			const customer = await tx.customer.findUnique({ where: { userId } });
			const contactNumber =
				currentUser.contactNumber ?? customer?.contactNumber;
			if (!contactNumber)
				throw new AppError(
					400,
					"A contact number is required before creating a courier profile",
				);
			await tx.courier.upsert({
				where: { userId },
				create: { userId, contactNumber },
				update: { isDeleted: false, deletedAt: null },
			});
		}
		if (role === Role.CUSTOMER) {
			await tx.customer.upsert({
				where: { userId },
				create: { userId, contactNumber: currentUser.contactNumber },
				update: { isDeleted: false, deletedAt: null },
			});
		}
		const updatedUser = await tx.user.update({
			where: { id: userId },
			data: { role, tokenVersion: { increment: 1 } },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				status: true,
			},
		});

		await tx.auditLog.create({
			data: {
				userId: adminId,
				action: "UPDATE_USER_ROLE",
				entityId: userId,
				entityType: "USER",
				details: { previousRole: currentUser.role, newRole: role },
			},
		});

		return updatedUser;
	});

	return result;
};

export const AdminService = {
	getDashboardStats,
	getAllUsers,
	updateUserStatus,
	updateUserRole,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\auditLog\auditLog.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuditLogService } from "./auditLog.service";

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditLogService.getAuditLogs(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const AuditLogController = {
  getAuditLogs,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\auditLog\auditLog.service.ts

```ts
import { prisma } from "../../utils/prisma";
import type { Prisma } from "@prisma/client";
import { listQuerySchema } from "../../utils/query";

const getAuditLogs = async (query: unknown) => {
  const { page, limit, action, entityType, sortBy, sortOrder } = listQuerySchema.parse(query);
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: Prisma.AuditLogWhereInput[] = [];

  if (action) {
    andConditions.push({ action });
  }

  if (entityType) {
    andConditions.push({ entityType });
  }

  const allowedSortFields = ["createdAt", "action", "entityType"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.auditLog.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : {},
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const total = await prisma.auditLog.count({
    where: andConditions.length > 0 ? { AND: andConditions } : {},
  });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
    data: result,
  };
};

export const AuditLogService = {
  getAuditLogs,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\auth\auth.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { clearSessionCookies, setSessionCookies } from "../../utils/cookies";
import { AuthService } from "./auth.service";

const registerCustomer = catchAsync(async (req: Request, res: Response) => {
  await AuthService.registerCustomer(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "OTP sent to email for verification", data: null });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyEmail(req.body);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "User registered successfully", data: { user: result.user, customer: result.customer, role: result.user.role } });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Logged in successfully", data: { user: result.user, role: result.user.role, needPasswordChange: result.user.needPasswordChange } });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.refreshToken(req.cookies?.refreshToken);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Session refreshed successfully", data: { user: result.user, role: result.user.role } });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.googleLogin(req.body);
  setSessionCookies(res, result);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Google login successful", data: { user: result.user, role: result.user.role } });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.forgotPassword(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "If the account is eligible, a reset code has been sent", data: null });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resetPassword(req.body);
  clearSessionCookies(res);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Password reset successfully", data: null });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logoutUser(req.cookies?.refreshToken);
  clearSessionCookies(res);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Logged out successfully", data: null });
});

export const AuthController = { registerCustomer, verifyEmail, loginUser, refreshToken, googleLogin, forgotPassword, resetPassword, logout };
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\auth\auth.route.ts

```ts
import express from "express";
import { authRateLimiter, otpRateLimiter } from "../../middlewares/rateLimiter";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = express.Router();
router.use(authRateLimiter);

router.post(
  "/register",
  otpRateLimiter,
  validateRequest(AuthValidation.RegisterCustomerZodSchema),
  AuthController.registerCustomer
);

router.post(
  "/verify-email",
  otpRateLimiter,
  validateRequest(AuthValidation.VerifyEmailZodSchema),
  AuthController.verifyEmail
);

router.post(
  "/login",
  validateRequest(AuthValidation.LoginZodSchema),
  AuthController.loginUser
);

router.post(
  "/refresh-token",
  AuthController.refreshToken
);

router.post(
  "/google",
  validateRequest(AuthValidation.GoogleLoginZodSchema),
  AuthController.googleLogin
);

router.post(
  "/forgot-password",
  otpRateLimiter,
  validateRequest(AuthValidation.ForgotPasswordZodSchema),
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  otpRateLimiter,
  validateRequest(AuthValidation.ResetPasswordZodSchema),
  AuthController.resetPassword
);

router.post(
  "/logout",
  AuthController.logout
);

export const AuthRoutes = router;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\auth\auth.service.ts

```ts
import { AuthProvider, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { emailSender } from "../../utils/emailSender";
import { prisma } from "../../utils/prisma";
import { redisClient } from "../../utils/redis";
import { createSession, revokeSession, rotateSession, safeUser } from "../../utils/session";
import type { IForgotPasswordPayload, IGoogleLoginPayload, ILoginPayload, IRegisterCustomerPayload, IResetPasswordPayload, IVerifyEmailPayload } from "./auth.interface";

const googleClient = new OAuth2Client(config.google_client_id);
const hashOtp = (otp: string) => createHash("sha256").update(otp).digest("hex");
const normalizedEmail = (email: string) => email.trim().toLowerCase();

const consumeOtp = async (key: string, otp: string) => {
  const stored = await redisClient.get(key);
  const supplied = hashOtp(otp);
  if (!stored || stored.length !== supplied.length || !timingSafeEqual(Buffer.from(stored), Buffer.from(supplied))) {
    throw new AppError(400, "Invalid or expired OTP");
  }
  const consumed = await redisClient.eval(
    "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end; return 0",
    { keys: [key], arguments: [supplied] },
  );
  if (consumed !== 1) throw new AppError(400, "Invalid or expired OTP");
};

const registerCustomer = async (payload: IRegisterCustomerPayload) => {
  const email = normalizedEmail(payload.email);
  if (await prisma.user.findUnique({ where: { email } })) throw new AppError(409, "User with this email already exists");
  const password = await bcrypt.hash(payload.password as string, config.bcrypt_salt_rounds);
  const otp = randomInt(100000, 1000000).toString();
  await redisClient.multi()
    .setEx(`registration-otp:${email}`, 300, hashOtp(otp))
    .setEx(`registration-data:${email}`, 300, JSON.stringify({ name: payload.name, email, password, contactNumber: payload.contactNumber }))
    .exec();
  await emailSender(email, "Email Verification OTP", `<p>Your verification code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
  return null;
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
  const email = normalizedEmail(payload.email);
  const data = await redisClient.get(`registration-data:${email}`);
  if (!data) throw new AppError(400, "Registration data expired");
  await consumeOtp(`registration-otp:${email}`, payload.otp);
  const pending = JSON.parse(data) as IRegisterCustomerPayload;
  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: {
      name: pending.name, email, password: pending.password, contactNumber: pending.contactNumber,
      role: Role.CUSTOMER, status: UserStatus.ACTIVE, emailVerified: true, authProvider: AuthProvider.CREDENTIAL,
    } });
    const customer = await tx.customer.create({ data: { userId: user.id, contactNumber: pending.contactNumber } });
    return { user, customer };
  });
  await redisClient.del(`registration-data:${email}`);
  const tokens = await createSession(result.user);
  return { ...tokens, user: safeUser(result.user), customer: result.customer };
};

const loginUser = async (payload: ILoginPayload) => {
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail(payload.email) } });
  if (!user?.password || !payload.password || !(await bcrypt.compare(payload.password, user.password))) throw new AppError(401, "Invalid credentials");
  if (user.isDeleted || user.status !== UserStatus.ACTIVE || !user.emailVerified) throw new AppError(403, "User account is not accessible");
  const tokens = await createSession(user);
  return { ...tokens, user: safeUser(user) };
};

const refreshToken = async (token?: string) => {
  if (!token) throw new AppError(401, "Refresh token required");
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.jwt_refresh_secret, { algorithms: ["HS256"] }) as JwtPayload;
  } catch {
    throw new AppError(401, "Invalid refresh token");
  }
  if (typeof decoded.userId !== "string" || typeof decoded.sessionId !== "string") throw new AppError(401, "Invalid session");
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE || !user.emailVerified) throw new AppError(403, "User account is not accessible");
  if (decoded.tokenVersion !== user.tokenVersion) throw new AppError(401, "Session expired");
  const tokens = await rotateSession(user, token, decoded.sessionId);
  return { ...tokens, user: safeUser(user) };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  if (!config.google_client_id) throw new AppError(503, "Google login is not configured");
  const ticket = await googleClient.verifyIdToken({ idToken: payload.idToken, audience: config.google_client_id });
  const identity = ticket.getPayload();
  if (!identity?.email || !identity.email_verified) throw new AppError(401, "Verified Google identity required");
  const email = normalizedEmail(identity.email);
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    if (user.isDeleted || user.status !== UserStatus.ACTIVE) throw new AppError(403, "User account is not accessible");
    if (user.googleId && user.googleId !== identity.sub) throw new AppError(401, "Google identity does not match");
    if (!user.googleId) user = await prisma.user.update({ where: { id: user.id }, data: { googleId: identity.sub, emailVerified: true } });
  } else {
    user = await prisma.user.create({ data: {
      name: identity.name || email.split("@")[0], email, googleId: identity.sub, authProvider: AuthProvider.GOOGLE,
      role: Role.CUSTOMER, status: UserStatus.ACTIVE, emailVerified: true, customer: { create: {} },
    } });
  }
  const tokens = await createSession(user);
  return { ...tokens, user: safeUser(user) };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const email = normalizedEmail(payload.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password || user.isDeleted || user.status !== UserStatus.ACTIVE) return null;
  const otp = randomInt(100000, 1000000).toString();
  await redisClient.setEx(`reset-otp:${email}`, 300, hashOtp(otp));
  await emailSender(email, "Password Reset OTP", `<p>Your reset code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
  return null;
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const email = normalizedEmail(payload.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password || user.isDeleted || user.status !== UserStatus.ACTIVE) throw new AppError(400, "Invalid reset request");
  await consumeOtp(`reset-otp:${email}`, payload.otp);
  const password = await bcrypt.hash(payload.newPassword, config.bcrypt_salt_rounds);
  await prisma.user.update({ where: { id: user.id }, data: { password, needPasswordChange: false, tokenVersion: { increment: 1 } } });
  return null;
};

const logoutUser = async (token?: string) => {
  if (!token) return null;
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.jwt_refresh_secret, { algorithms: ["HS256"] }) as JwtPayload;
  } catch {
    return null;
  }
  if (typeof decoded.sessionId === "string") await revokeSession(decoded.sessionId);
  return null;
};

export const AuthService = { registerCustomer, verifyEmail, loginUser, refreshToken, googleLogin, forgotPassword, resetPassword, logoutUser };
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\auth\auth.validation.ts

```ts
import { z } from "zod";

const RegisterCustomerZodSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(255),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
    contactNumber: z.string().optional(),
  }),
});

const VerifyEmailZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().regex(/^\d{6}$/),
  }),
});

const LoginZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(72),
  }),
});

const GoogleLoginZodSchema = z.object({
  body: z.object({
    idToken: z.string().min(1).max(10000),
  }),
});

const ForgotPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const ResetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().regex(/^\d{6}$/),
    newPassword: z
      .string()
      .min(8)
      .max(72)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
  }),
});

export const AuthValidation = {
  RegisterCustomerZodSchema,
  VerifyEmailZodSchema,
  LoginZodSchema,
  GoogleLoginZodSchema,
  ForgotPasswordZodSchema,
  ResetPasswordZodSchema,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\courier\courier.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CourierService } from "./courier.service";

const createCourier = catchAsync(async (req: Request, res: Response) => {
  const result = await CourierService.createCourier(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Courier created successfully",
    data: result,
  });
});

const getAllCouriers = catchAsync(async (req: Request, res: Response) => {
  const result = await CourierService.getAllCouriers(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Couriers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCourierDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CourierService.getCourierDetails(id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier details retrieved successfully",
    data: result,
  });
});

const updateCourierProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CourierService.updateCourierProfile(id, req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier profile updated successfully",
    data: result,
  });
});

const getCourierHistoryAndEarnings = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CourierService.getCourierHistoryAndEarnings(id, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier history and earnings retrieved successfully",
    data: result,
  });
});

export const CourierController = {
  createCourier,
  getAllCouriers,
  getCourierDetails,
  updateCourierProfile,
  getCourierHistoryAndEarnings,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\courier\courier.service.ts

```ts
import { AuthProvider, Role, UserStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../utils/prisma";
import { safeUser } from "../../utils/session";
import { listQuerySchema } from "../../utils/query";
import { CourierValidation } from "./courier.validation";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import type { ICourierCreate, ICourierFilterRequest, ICourierUpdate } from "./courier.interface";

const createCourier = async (payload: ICourierCreate) => {
  const isUserExists = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });

  if (isUserExists) {
    throw new AppError(httpStatus.CONFLICT, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        contactNumber: payload.contactNumber,
        password: hashedPassword,
        role: Role.COURIER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    const courier = await tx.courier.create({
      data: {
        userId: user.id,
        contactNumber: payload.contactNumber,
        vehicleType: payload.vehicleType,
        vehicleNumber: payload.vehicleNumber,
        currentHubId: payload.currentHubId,
        isAvailable: true,
      },
    });

    return { user: safeUser(user), courier };
  });

  return result;
};

const getAllCouriers = async (filters: ICourierFilterRequest) => {
  const { isAvailable, searchTerm, page, limit, sortBy, sortOrder } = listQuerySchema.parse(filters);
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: Prisma.CourierWhereInput[] = [{ isDeleted: false, user: { isDeleted: false, role: Role.COURIER } }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { contactNumber: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (isAvailable !== undefined) {
    andConditions.push({
      isAvailable: isAvailable === "true",
    });
  }

  const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};

  const allowedSortFields = ["createdAt", "isAvailable"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.courier.findMany({
    where: whereConditions,
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
    include: {
      user: {
        select: { id: true, name: true, email: true, status: true, role: true },
      },
      hub: true,
    },
  });

  const total = await prisma.courier.count({ where: whereConditions });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
    data: result,
  };
};

const getCourierDetails = async (id: string, user: { userId: string; role: string }) => {
  const result = await prisma.courier.findUnique({
    where: { id, isDeleted: false },
    include: {
      user: {
        select: { id: true, name: true, email: true, status: true, role: true },
      },
      hub: true,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && result.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to view this courier profile");
  }

  return result;
};

const updateCourierProfile = async (id: string, input: ICourierUpdate, user: { userId: string; role: string }) => {
  const payload = CourierValidation.updateCourierZodSchema.shape.body.parse(input);
  const courier = await prisma.courier.findUnique({ where: { id, isDeleted: false } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && courier.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to update this courier profile");
  }

  if (user.role === Role.COURIER && payload.currentHubId !== undefined) {
    throw new AppError(403, "Only administrators may change the courier hub");
  }
  if (payload.currentHubId && !(await prisma.hub.findUnique({ where: { id: payload.currentHubId, isDeleted: false } }))) {
    throw new AppError(400, "Active hub not found");
  }

  const result = await prisma.courier.update({
    where: { id },
    data: { vehicleType: payload.vehicleType, vehicleNumber: payload.vehicleNumber, isAvailable: payload.isAvailable, currentHubId: payload.currentHubId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      hub: true,
    },
  });

  return result;
};

const getCourierHistoryAndEarnings = async (courierId: string, user: { userId: string; role: string }) => {
  const courier = await prisma.courier.findUnique({ where: { id: courierId, isDeleted: false } });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier not found");
  }

  if (user.role === Role.COURIER && courier.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to view this courier history");
  }

  const shipments = await prisma.shipment.findMany({
    where: { courierId: courier.userId, isDeleted: false },
    orderBy: { createdAt: "desc" },
  });

  const earningsData = await prisma.shipment.aggregate({
    _sum: {
      courierEarning: true,
    },
    where: {
      courierId: courier.userId,
      status: "DELIVERED",
      isDeleted: false,
    },
  });

  const completed = shipments.filter(shipment => shipment.status === "DELIVERED");
  const attempted = shipments.filter(shipment => ["DELIVERED", "DELIVERY_FAILED", "RETURNED"].includes(shipment.status));
  const totalEarnings = completed.some(shipment => shipment.courierEarning === null) ? null : Number(earningsData._sum.courierEarning ?? 0);

  return {
    totalEarnings,
    completedDeliveries: completed.length,
    performanceRate: attempted.length ? Math.round(completed.length / attempted.length * 10000) / 100 : 0,
    compensationConfigured: config.courier_commission_rate !== undefined,
    totalShipments: shipments.length,
    shipments,
  };
};

export const CourierService = {
  createCourier,
  getAllCouriers,
  getCourierDetails,
  updateCourierProfile,
  getCourierHistoryAndEarnings,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\courier\courier.validation.ts

```ts
import { z } from "zod";

const createCourierZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }),
    email: z.string({ required_error: "Email is required" }).email(),
    password: z.string().min(8).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    contactNumber: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/),
    vehicleType: z.string().optional(),
    vehicleNumber: z.string().optional(),
    currentHubId: z.string().uuid().optional(),
  }).strict(),
});

const updateCourierZodSchema = z.object({
  body: z.object({
    vehicleType: z.string().optional(),
    vehicleNumber: z.string().optional(),
    isAvailable: z.boolean().optional(),
    currentHubId: z.string().uuid().optional(),
  }).strict(),
});

export const CourierValidation = {
  createCourierZodSchema,
  updateCourierZodSchema,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\hub\hub.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { HubService } from "./hub.service";

const createHub = catchAsync(async (req: Request, res: Response) => {
  const result = await HubService.createHub(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Hub created successfully",
    data: result,
  });
});

const getAllHubs = catchAsync(async (req: Request, res: Response) => {
  const result = await HubService.getAllHubs(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hubs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleHub = catchAsync(async (req: Request, res: Response) => {
  const result = await HubService.getSingleHub(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hub retrieved successfully",
    data: result,
  });
});

const updateHub = catchAsync(async (req: Request, res: Response) => {
  const result = await HubService.updateHub(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hub updated successfully",
    data: result,
  });
});

const deleteHub = catchAsync(async (req: Request, res: Response) => {
  const result = await HubService.deleteHub(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hub deleted successfully",
    data: result,
  });
});

export const HubController = {
  createHub,
  getAllHubs,
  getSingleHub,
  updateHub,
  deleteHub,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\hub\hub.service.ts

```ts
import { prisma } from "../../utils/prisma";
import type { Prisma } from "@prisma/client";
import { listQuerySchema } from "../../utils/query";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

const createHub = async (payload: { name: string; location: string; address: string }) => {
  const isExist = await prisma.hub.findUnique({
    where: { name: payload.name },
  });

  if (isExist) {
    throw new AppError(httpStatus.CONFLICT, "Hub with this name already exists");
  }

  const result = await prisma.hub.create({
    data: payload,
  });

  return result;
};

const getAllHubs = async (query: unknown) => {
  const { searchTerm, page, limit, sortBy, sortOrder } = listQuerySchema.parse(query);
  
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const andConditions: Prisma.HubWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const allowedSortFields = ["createdAt", "name", "location"];
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

  const result = await prisma.hub.findMany({
    where: { AND: andConditions },
    skip,
    take,
    orderBy: { [validSortBy]: sortOrder },
  });

  const total = await prisma.hub.count({ where: { AND: andConditions } });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
    data: result,
  };
};

const getSingleHub = async (id: string) => {
  const result = await prisma.hub.findUnique({
    where: { id, isDeleted: false },
    include: {
      couriers: {
        where: { isDeleted: false, isAvailable: true },
        select: { 
          id: true, 
          vehicleType: true, 
          user: { 
            select: { 
              name: true,
              contactNumber: true
            } 
          } 
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  return result;
};

const updateHub = async (id: string, payload: Partial<{ name: string; location: string; address: string }>) => {
  const isExist = await prisma.hub.findUnique({ where: { id, isDeleted: false } });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  const result = await prisma.hub.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteHub = async (id: string) => {
  const isExist = await prisma.hub.findUnique({ where: { id, isDeleted: false } });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  const result = await prisma.hub.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return result;
};

export const HubService = {
  createHub,
  getAllHubs,
  getSingleHub,
  updateHub,
  deleteHub,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiatePayment(req.body.shipmentId, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment initiated successfully",
    data: result,
  });
});

const bkashCallback = catchAsync(async (req: Request, res: Response) => {
  const { paymentID, status } = req.query;
  
  const result = await PaymentService.executePayment(paymentID as string, status as string);
  
  res.redirect(result.redirectUrl);
});

const initiateStripePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiateStripePayment(req.body.shipmentId, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stripe payment initiated successfully",
    data: result,
  });
});

const stripeCallback = catchAsync(async (req: Request, res: Response) => {
  const { session_id } = req.query;

  if (!session_id) {
    res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
    return;
  }

  const result = await PaymentService.executeStripePayment(session_id as string);
  
  res.redirect(result.redirectUrl);
});


const reconcilePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.reconcilePayment(req.body.shipmentId, req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payment status checked with provider", data: result });
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPayments(req.query, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getSinglePayment(req.params.id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment details retrieved successfully",
    data: result,
  });
});

export const PaymentController = {
  reconcilePayment,
  initiatePayment,
  bkashCallback,
  initiateStripePayment,
  stripeCallback,
  getPayments,
  getSinglePayment,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.gateway.ts

```ts
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { AppError } from "../../errors/AppError";

export type ExpectedPayment = { transactionId: string | null; amount: Prisma.Decimal; currency: string; paymentId: string };

export function assertStripePayment(session: Stripe.Checkout.Session, expected: ExpectedPayment, shipmentId: string, attemptId: string) {
  if (session.id !== expected.transactionId || session.metadata?.shipmentId !== shipmentId || session.metadata?.attemptId !== attemptId ||
      session.mode !== "payment" || session.payment_status !== "paid" ||
      session.currency?.toUpperCase() !== expected.currency ||
      session.amount_total !== expected.amount.mul(100).toNumber()) {
    throw new AppError(400, "Stripe payment verification failed");
  }
}

export function assertBkashPayment(result: Record<string, unknown>, expected: ExpectedPayment) {
  if (result.statusCode !== "0000" || result.transactionStatus !== "Completed" ||
      result.paymentID !== expected.transactionId || result.currency !== expected.currency ||
      typeof result.trxID !== "string" || !result.trxID ||
      (typeof result.amount !== "string" && typeof result.amount !== "number")) {
    throw new AppError(400, "bKash payment verification failed");
  }
  let amount: Prisma.Decimal;
  try { amount = new Prisma.Decimal(result.amount as string); } catch { throw new AppError(400, "Invalid payment amount"); }
  if (!amount.equals(expected.amount)) throw new AppError(400, "Payment amount does not match");
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.route.ts

```ts
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
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.service.ts

```ts
import { PaymentGateway, PaymentStatus, type Prisma } from "@prisma/client";
import Stripe from "stripe";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../utils/prisma";
import { lockShipment } from "../../utils/rowLocks";
import { listQuerySchema } from "../../utils/query";
import { redisClient } from "../../utils/redis";
import { assertBkashPayment, assertStripePayment } from "./payment.gateway";

let stripe: Stripe | undefined;
export const getStripe = () => {
  if (!config.stripe_secret_key) throw new AppError(503, "Stripe is not configured");
  if (!stripe) stripe = new Stripe(config.stripe_secret_key);
  return stripe;
};
const paymentSelect = {
  id: true, shipmentId: true, amount: true, currency: true, paymentGateway: true, transactionId: true,
  status: true, paidAt: true, createdAt: true, updatedAt: true,
} as const;
type Actor = { userId: string; role: string };
const redirect = (outcome: "success" | "failure" | "cancel", shipmentId: string) => ({
  redirectUrl: `${config.frontend_url}/payment/${outcome}?shipmentId=${encodeURIComponent(shipmentId)}`,
});

async function bkashRequest(path: string, body: Record<string, unknown>, grant = false): Promise<Record<string, unknown>> {
  if (!config.bkash_base_url || !config.bkash_app_key || !config.bkash_app_secret || !config.bkash_username || !config.bkash_password) {
    throw new AppError(503, "bKash is not configured");
  }
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (grant) {
    headers.username = config.bkash_username;
    headers.password = config.bkash_password;
  } else {
    headers.Authorization = await getBkashToken();
    headers["X-App-Key"] = config.bkash_app_key;
  }
  const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/${path}`, {
    method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new AppError(502, "bKash is temporarily unavailable");
  return await response.json() as Record<string, unknown>;
}

const getBkashToken = async (): Promise<string> => {
  const key = "bkash:token";
  const cached = await redisClient.get(key);
  if (cached) return cached;
  const result = await bkashRequest("token/grant", { app_key: config.bkash_app_key, app_secret: config.bkash_app_secret }, true);
  if (result.statusCode !== "0000" || typeof result.id_token !== "string") throw new AppError(502, "Unable to authenticate with bKash");
  const ttl = Math.max(1, Math.min(Number(result.expires_in) || 3600, 3600) - 60);
  await redisClient.setEx(key, ttl, result.id_token);
  return result.id_token;
};

const prepareAttempt = async (shipmentId: string, userId: string, gateway: PaymentGateway) => prisma.$transaction(async tx => {
  await lockShipment(tx, shipmentId);
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, include: { sender: { select: { email: true } } } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.senderId !== userId) throw new AppError(403, "Unauthorized shipment");
  if (["CANCELLED", "RETURNED"].includes(shipment.status)) throw new AppError(409, "This shipment cannot accept payment");
  const payment = await tx.payment.upsert({
    where: { shipmentId },
    create: { shipmentId, amount: shipment.price, currency: "BDT", paymentGateway: gateway },
    update: {},
  });
  if (["PAID", "REFUNDED"].includes(payment.status)) throw new AppError(409, "Shipment payment is already settled");
  const pending = await tx.paymentAttempt.findFirst({ where: { paymentId: payment.id, status: PaymentStatus.UNPAID }, orderBy: { createdAt: "desc" } });
  if (pending) {
    if (pending.paymentGateway === gateway && pending.checkoutUrl && Date.now() - pending.createdAt.getTime() < 30 * 60 * 1000) {
      return { shipment, payment, attempt: pending, reused: true };
    }
    throw new AppError(409, "A payment attempt is pending verification. Check payment status before trying again");
  }
  const attempt = await tx.paymentAttempt.create({ data: { paymentId: payment.id, amount: shipment.price, currency: "BDT", paymentGateway: gateway } });
  return { shipment, payment, attempt, reused: false };
});

const completeAttempt = async (attemptId: string, providerTransactionId: string, summary: Prisma.InputJsonObject) => prisma.$transaction(async tx => {
  const lookup = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { payment: true } });
  if (!lookup) throw new AppError(404, "Payment attempt not found");
  await lockShipment(tx, lookup.payment.shipmentId);
  const attempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { payment: true } });
  if (attempt.status === PaymentStatus.PAID) return attempt.payment;
  const paidAt = new Date();
  const claimed = await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: PaymentStatus.PAID } }, data: { status: PaymentStatus.PAID, providerTransactionId, paidAt, gatewayResponse: summary } });
  if (claimed.count === 0) return tx.payment.findUniqueOrThrow({ where: { id: attempt.paymentId } });
  if (attempt.payment.status === PaymentStatus.PAID || attempt.payment.status === PaymentStatus.REFUNDED) {
    await tx.auditLog.create({ data: { action: "PAYMENT_REQUIRES_REVIEW", entityId: attempt.payment.shipmentId, entityType: "SHIPMENT", details: { attemptId, providerTransactionId, reason: "additional_payment" } } });
    return attempt.payment;
  }
  const payment = await tx.payment.update({ where: { id: attempt.paymentId }, data: {
    status: PaymentStatus.PAID, amount: attempt.amount, currency: attempt.currency,
    paymentGateway: attempt.paymentGateway, transactionId: attempt.transactionId, paidAt, gatewayResponse: summary,
  } });
  const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: payment.shipmentId } });
  await tx.auditLog.create({ data: {
    action: shipment.status === "CANCELLED" ? "PAYMENT_REQUIRES_REVIEW" : "PAYMENT_SUCCESS",
    entityId: payment.shipmentId, entityType: "SHIPMENT", details: { attemptId, providerTransactionId, amount: attempt.amount.toString() },
  } });
  return payment;
});

const failAttempt = async (attemptId: string, status: "FAILED" | "CANCELLED") => prisma.$transaction(async tx => {
  const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { payment: true } });
  if (!attempt) throw new AppError(404, "Payment attempt not found");
  await lockShipment(tx, attempt.payment.shipmentId);
  const changed = await tx.paymentAttempt.updateMany({ where: { id: attemptId, status: { not: PaymentStatus.PAID } }, data: { status } });
  if (changed.count) {
    await tx.payment.updateMany({ where: { id: attempt.paymentId, status: { notIn: [PaymentStatus.PAID, PaymentStatus.REFUNDED] } }, data: { status } });
  }
});

const initiatePayment = async (shipmentId: string, userId: string) => {
  if (!config.bkash_callback_url) throw new AppError(503, "bKash callback URL is not configured");
  const { shipment, attempt, reused } = await prepareAttempt(shipmentId, userId, PaymentGateway.BKASH);
  if (reused) return { paymentUrl: attempt.checkoutUrl, shipmentId };
  const result = await bkashRequest("create", {
    mode: "0011", payerReference: shipment.sender.email, callbackURL: config.bkash_callback_url,
    amount: attempt.amount.toFixed(2), currency: "BDT", intent: "sale", merchantInvoiceNumber: attempt.id,
  });
  if (result.statusCode !== "0000" || typeof result.paymentID !== "string" || typeof result.bkashURL !== "string") {
    if (typeof result.statusCode === "string" && result.statusCode !== "0000") await failAttempt(attempt.id, "FAILED");
    throw new AppError(502, "Unable to initiate bKash payment");
  }
  const checkout = new URL(result.bkashURL);
  if (checkout.protocol !== "https:" || !(checkout.hostname.endsWith(".bka.sh") || checkout.hostname.endsWith(".bkash.com"))) throw new AppError(502, "Unexpected bKash checkout address");
  await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { transactionId: result.paymentID, checkoutUrl: result.bkashURL } });
  return { paymentUrl: result.bkashURL, shipmentId };
};

const executePayment = async (paymentID: string, status: string) => {
  const attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: paymentID }, include: { payment: true } });
  if (!attempt || attempt.paymentGateway !== PaymentGateway.BKASH) throw new AppError(404, "Payment attempt not found");
  if (attempt.status === PaymentStatus.PAID) return redirect("success", attempt.payment.shipmentId);
  let result: Record<string, unknown>;
  if (status === "success") {
    try { result = await bkashRequest("execute", { paymentID }); }
    catch { result = await bkashRequest("payment/status", { paymentID }); }
    if (result.statusCode !== "0000" || result.transactionStatus !== "Completed") result = await bkashRequest("payment/status", { paymentID });
  } else {
    result = await bkashRequest("payment/status", { paymentID });
  }
  if (result.transactionStatus === "Completed") {
    assertBkashPayment(result, attempt);
    await completeAttempt(attempt.id, result.trxID as string, { paymentID, transactionId: result.trxID as string, amount: String(result.amount), currency: "BDT" });
    return redirect("success", attempt.payment.shipmentId);
  }
  if (result.statusCode === "0000" && result.paymentID === paymentID && ["Cancelled", "Failed"].includes(String(result.transactionStatus))) {
    const failedStatus = result.transactionStatus === "Cancelled" ? "CANCELLED" : "FAILED";
    await failAttempt(attempt.id, failedStatus);
    return redirect(failedStatus === "CANCELLED" ? "cancel" : "failure", attempt.payment.shipmentId);
  }
  throw new AppError(409, "Payment is awaiting provider verification");
};

const initiateStripePayment = async (shipmentId: string, userId: string) => {
  const client = getStripe();
  if (!config.stripe_webhook_secret) throw new AppError(503, "Stripe webhook is not configured");
  const { shipment, attempt, reused } = await prepareAttempt(shipmentId, userId, PaymentGateway.STRIPE);
  if (reused) return { paymentUrl: attempt.checkoutUrl, shipmentId };
  const session = await client.checkout.sessions.create({
    line_items: [{ price_data: {
      currency: "bdt", product_data: { name: `Shipment ${shipment.trackingId}` },
      unit_amount: attempt.amount.mul(100).toNumber(),
    }, quantity: 1 }],
    mode: "payment", expires_at: Math.floor(attempt.createdAt.getTime() / 1000) + 30 * 60,
    success_url: `${config.frontend_url}/payment/success?shipmentId=${shipmentId}`,
    cancel_url: `${config.frontend_url}/payment/cancel?shipmentId=${shipmentId}`,
    customer_email: shipment.sender.email, metadata: { shipmentId, attemptId: attempt.id },
  }, { idempotencyKey: attempt.id });
  if (!session.url) throw new AppError(502, "Stripe checkout URL is missing");
  await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { transactionId: session.id, checkoutUrl: session.url } });
  return { paymentUrl: session.url, shipmentId };
};

const confirmStripeSession = async (session: Stripe.Checkout.Session) => {
  let attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: session.id }, include: { payment: true } });
  if (!attempt && session.metadata?.attemptId) {
    const pending = await prisma.paymentAttempt.findUnique({ where: { id: session.metadata.attemptId }, include: { payment: true } });
    if (pending && pending.paymentGateway === PaymentGateway.STRIPE && !pending.transactionId) {
      assertStripePayment(session, { ...pending, transactionId: session.id }, pending.payment.shipmentId, pending.id);
      await prisma.paymentAttempt.updateMany({ where: { id: pending.id, transactionId: null }, data: { transactionId: session.id } });
      attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: session.id }, include: { payment: true } });
    }
  }
  if (!attempt || attempt.paymentGateway !== PaymentGateway.STRIPE) throw new AppError(404, "Payment attempt not found");
  assertStripePayment(session, attempt, attempt.payment.shipmentId, attempt.id);
  const providerId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!providerId) throw new AppError(400, "Stripe transaction identifier is missing");
  return completeAttempt(attempt.id, providerId, { sessionId: session.id, transactionId: providerId, amount: String(session.amount_total), currency: session.currency ?? "" });
};

const executeStripePayment = async (sessionId: string) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const payment = await confirmStripeSession(session);
  return redirect("success", payment.shipmentId);
};

const handleStripeEvent = async (event: Stripe.Event) => {
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") await confirmStripeSession(session);
  } else if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const attempt = await prisma.paymentAttempt.findUnique({ where: { transactionId: session.id } });
    if (!attempt) throw new AppError(404, "Payment attempt not found");
    await failAttempt(attempt.id, "FAILED");
  }
};

const reconcilePayment = async (shipmentId: string, userId: string) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, select: { senderId: true } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.senderId !== userId) throw new AppError(403, "Unauthorized shipment");
  const payment = await prisma.payment.findUnique({ where: { shipmentId }, include: { attempts: { where: { status: PaymentStatus.UNPAID } } } });
  if (!payment || ["PAID", "REFUNDED"].includes(payment.status)) return { shipmentId, status: payment?.status ?? "UNPAID" };
  for (const attempt of payment.attempts) {
    if (!attempt.transactionId) throw new AppError(409, "Payment reference is missing. Contact support for provider reconciliation");
    if (attempt.paymentGateway === PaymentGateway.STRIPE) {
      const session = await getStripe().checkout.sessions.retrieve(attempt.transactionId);
      if (session.payment_status === "paid") await confirmStripeSession(session);
      else if (session.status === "expired") {
        if (session.id !== attempt.transactionId || session.metadata?.attemptId !== attempt.id || session.metadata?.shipmentId !== shipmentId) throw new AppError(400, "Payment reference mismatch");
        await failAttempt(attempt.id, "FAILED");
      }
    } else if (attempt.paymentGateway === PaymentGateway.BKASH) {
      try { await executePayment(attempt.transactionId, "query"); }
      catch (error) { if (!(error instanceof AppError && error.statusCode === 409)) throw error; }
    }
  }
  const refreshed = await prisma.payment.findUniqueOrThrow({ where: { shipmentId } });
  return { shipmentId, status: refreshed.status };
};

const getPayments = async (query: unknown, user: Actor) => {
  const { page, limit } = listQuerySchema.parse(query);
  const where: Prisma.PaymentWhereInput = { isDeleted: false, ...(user.role === "CUSTOMER" ? { shipment: { senderId: user.userId } } : {}) };
  const [data, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
      select: { ...paymentSelect, shipment: { select: { trackingId: true, sender: { select: { name: true, email: true } } } } } }),
    prisma.payment.count({ where }),
  ]);
  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data };
};

const getSinglePayment = async (id: string, user: Actor) => {
  const payment = await prisma.payment.findUnique({ where: { id, isDeleted: false }, select: {
    ...paymentSelect, shipment: { select: { trackingId: true, senderId: true } },
    attempts: { orderBy: { createdAt: "desc" }, select: { id: true, paymentGateway: true, status: true, createdAt: true, paidAt: true } },
  } });
  if (!payment) throw new AppError(404, "Payment not found");
  if (user.role === "CUSTOMER" && payment.shipment.senderId !== user.userId) throw new AppError(403, "Unauthorized payment");
  return payment;
};

export const PaymentService = { initiatePayment, executePayment, initiateStripePayment, executeStripePayment, handleStripeEvent, reconcilePayment, getPayments, getSinglePayment };
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.validation.ts

```ts
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
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\payment\payment.webhook.ts

```ts
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
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ShipmentService } from "./shipment.service";

const createShipment = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.createShipment(
		req.user.userId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Shipment created successfully",
		data: result,
	});
});

const getAllShipments = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.getAllShipments(req.query, req.user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Shipments retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getShipmentSummary = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.getShipmentSummary(req.user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Shipment summary retrieved",
		data: result,
	});
});

const getSingleShipment = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.getSingleShipment(
		req.params.id,
		req.user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Shipment retrieved successfully",
		data: result,
	});
});

const trackShipment = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.trackShipment(req.params.trackingId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Tracking retrieved successfully",
		data: result,
	});
});

const assignCourier = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.assignCourier(
		req.params.id,
		req.body.courierId,
		req.user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Courier assigned successfully",
		data: result,
	});
});

const updateShipmentStatus = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.updateShipmentStatus(
		req.params.id,
		req.body.status,
		req.user.userId,
		req.user.role,
		req.body.hubId,
		req.body.note,
		req.body.proof,
		req.body.collectedAmount,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Shipment status updated successfully",
		data: result,
	});
});

const cancelShipment = catchAsync(async (req: Request, res: Response) => {
	const result = await ShipmentService.cancelShipment(
		req.params.id,
		req.user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Shipment cancelled successfully",
		data: result,
	});
});

export const ShipmentController = {
	getShipmentSummary,
	trackShipment,
	createShipment,
	getAllShipments,
	getSingleShipment,
	assignCourier,
	updateShipmentStatus,
	cancelShipment,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.route.ts

```ts
import { Role } from "@prisma/client";
import express from "express";
import { z } from "zod";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ShipmentController } from "./shipment.controller";
import { ShipmentValidation } from "./shipment.validation";
import { ShipmentService } from "./shipment.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const router = express.Router();
router.patch(
	"/:id/handoff",
	auth(Role.ADMIN),
	validateRequest(ShipmentValidation.AssignCourierSchema),
	catchAsync(async (req, res) => {
		const data = await ShipmentService.handoffCourier(
			z.string().uuid().parse(req.params.id),
			req.body.courierId,
			req.user.userId,
		);
		sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Worker handover completed",
			data,
		});
	}),
);
router.post(
	"/bulk",
	auth(Role.CUSTOMER),
	catchAsync(async (req, res) => {
		const data = await ShipmentService.bulkCreate(req.user.userId, req.body);
		sendResponse(res, {
			statusCode: 201,
			success: true,
			message: "Shipments created",
			data,
		});
	}),
);

router.get(
	"/summary",
	auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
	ShipmentController.getShipmentSummary,
);

router.get(
	"/track/:trackingId",
	validateRequest(
		z.object({
			params: z.object({
				trackingId: z
					.string()
					.trim()
					.min(8)
					.max(80)
					.regex(/^TRK-[A-Z0-9-]+$/)
					.transform((value) => value.toUpperCase()),
			}),
		}),
	),
	ShipmentController.trackShipment,
);

router.post(
	"/",
	auth(Role.ADMIN, Role.CUSTOMER),
	validateRequest(ShipmentValidation.CreateShipmentSchema),
	ShipmentController.createShipment,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
	ShipmentController.getAllShipments,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
	ShipmentController.getSingleShipment,
);

router.patch(
	"/:id/assign",
	auth(Role.ADMIN),
	validateRequest(ShipmentValidation.AssignCourierSchema),
	ShipmentController.assignCourier,
);

router.patch(
	"/:id/status",
	auth(Role.ADMIN, Role.COURIER),
	validateRequest(ShipmentValidation.UpdateShipmentStatusSchema),
	ShipmentController.updateShipmentStatus,
);

router.patch(
	"/:id/cancel",
	auth(Role.CUSTOMER),
	ShipmentController.cancelShipment,
);

export const ShipmentRoutes = router;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.rules.ts

```ts
import { Role, ShipmentStatus } from "@prisma/client";

export const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
	PENDING: [ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED],
	ASSIGNED: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
	PICKED_UP: [ShipmentStatus.AT_ORIGIN_HUB],
	AT_ORIGIN_HUB: [ShipmentStatus.IN_TRANSIT],
	IN_TRANSIT: [ShipmentStatus.AT_DESTINATION_HUB],
	AT_DESTINATION_HUB: [ShipmentStatus.OUT_FOR_DELIVERY],
	OUT_FOR_DELIVERY: [ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED],
	DELIVERY_FAILED: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED],
	DELIVERED: [],
	RETURNED: [],
	CANCELLED: [],
};

export const ACTIVE_SHIPMENT_STATUSES = Object.values(ShipmentStatus).filter(
	(status) =>
		![
			ShipmentStatus.PENDING,
			ShipmentStatus.DELIVERED,
			ShipmentStatus.RETURNED,
			ShipmentStatus.CANCELLED,
		].includes(status as "PENDING" | "DELIVERED" | "RETURNED" | "CANCELLED"),
);

export function nextShipmentStatuses(status: ShipmentStatus, role: string) {
	if (role === Role.CUSTOMER)
		return status === ShipmentStatus.PENDING ? [ShipmentStatus.CANCELLED] : [];
	return ALLOWED_TRANSITIONS[status].filter(
		(next) =>
			next !== ShipmentStatus.ASSIGNED &&
			(role === Role.ADMIN || next !== ShipmentStatus.CANCELLED),
	);
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.service.ts

```ts
import { Prisma, ShipmentStatus } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../utils/prisma";
import { lockCourier, lockShipment } from "../../utils/rowLocks";
import { listQuerySchema } from "../../utils/query";
import {
	ACTIVE_SHIPMENT_STATUSES,
	nextShipmentStatuses,
} from "./shipment.rules";
import { ShipmentValidation } from "./shipment.validation";
import {
	operationsLock,
	quoteInTransaction,
	operationsActor,
} from "../operations/operations.service";
import { proofSchema } from "../operations/operations.validation";

type Actor = { userId: string; role: string };
const publicPaymentSelect = {
	id: true,
	status: true,
	amount: true,
	currency: true,
	paymentGateway: true,
	paidAt: true,
} as const;

async function assertActiveHub(
	tx: Prisma.TransactionClient,
	id?: string | null,
) {
	if (id && !(await tx.hub.findUnique({ where: { id, isDeleted: false } })))
		throw new AppError(400, "Active hub not found");
}

async function assertCancellationSafe(
	tx: Prisma.TransactionClient,
	shipmentId: string,
	paymentStatus?: string,
) {
	if (paymentStatus === "PAID")
		throw new AppError(
			409,
			"Paid shipments require a refund before cancellation",
		);
	const pending = await tx.paymentAttempt.count({
		where: { payment: { shipmentId }, status: "UNPAID" },
	});
	if (pending)
		throw new AppError(
			409,
			"Payment must be verified before cancelling this shipment",
		);
}

async function createInTransaction(
	tx: Prisma.TransactionClient,
	userId: string,
	input: z.infer<typeof ShipmentValidation.CreateShipmentSchema>["body"],
) {
	const payload =
		ShipmentValidation.CreateShipmentSchema.shape.body.parse(input);
	await operationsActor(tx, { userId, role: "CUSTOMER" }, "CUSTOMER");
	const fingerprint = createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex");
	const prior = await tx.shipment.findUnique({
		where: { bookingKey: payload.requestId },
	});
	if (prior) {
		if (prior.senderId !== userId || prior.bookingFingerprint !== fingerprint)
			throw new AppError(409, "Booking request key already used");
		return prior;
	}
	const trackingId = `TRK-${randomUUID().replace(/-/g, "").toUpperCase()}`;
	const quote = await quoteInTransaction(tx, {
		pickupAreaId: payload.pickupAreaId,
		receiverAreaId: payload.receiverAreaId,
		weight: payload.weight,
		codAmount: payload.codAmount,
		serviceType: payload.serviceType,
		pickupMode: payload.pickupMode,
		requestedPickupAt: payload.requestedPickupAt,
	});
	if (
		((payload.serviceType === "SAME_DAY" ||
			payload.quotedServiceType !== undefined) &&
			payload.quotedServiceType !== quote.serviceType) ||
		quote.rateUpdatedAt.toISOString() !== payload.quoteVersion ||
		!new Prisma.Decimal(quote.deliveryCharge).equals(
			payload.quotedDeliveryCharge,
		) ||
		!new Prisma.Decimal(quote.codFee).equals(payload.quotedCodFee)
	)
		throw new AppError(409, "Pricing changed; review a new quote");
	const sender = await tx.user.findUnique({ where: { id: userId } });
	if (
		!sender ||
		sender.role !== "CUSTOMER" ||
		sender.isDeleted ||
		sender.status !== "ACTIVE" ||
		!sender.emailVerified
	)
		throw new AppError(403, "Verified customer account required");
	if (
		payload.codAmount > 0 &&
		!(await tx.businessAccount.findUnique({ where: { userId } }))?.approved
	)
		throw new AppError(409, "Approved business account required for COD");
	const shipment = await tx.shipment.create({
		data: {
			bookingKey: payload.requestId,
			bookingFingerprint: fingerprint,
			receiverName: payload.receiverName,
			receiverPhone: payload.receiverPhone,
			receiverAddress: payload.receiverAddress,
			weight: payload.weight,
			originHubId: quote.originHubId,
			destinationHubId: quote.destinationHubId,
			senderId: userId,
			trackingId,
			price: quote.deliveryCharge,
			status: ShipmentStatus.PENDING,
			senderPhone: payload.senderPhone,
			pickupAddress: payload.pickupAddress,
			pickupAreaId: payload.pickupAreaId,
			receiverAreaId: payload.receiverAreaId,
			pickupMode: payload.pickupMode,
			productType: payload.productType,
			declaredValue: payload.declaredValue,
			codAmount: payload.codAmount,
			codFee: quote.codFee,
			priceBreakdown: JSON.parse(JSON.stringify(quote)),
			requestedPickupAt: new Date(payload.requestedPickupAt),
			deliveryInstructions: payload.deliveryInstructions,
			serviceType: quote.serviceType,
			estimatedDelivery: new Date(
				Date.parse(payload.requestedPickupAt) + quote.deliveryDays * 86400000,
			),
		},
	});
	await tx.shipmentTracking.create({
		data: {
			shipmentId: shipment.id,
			status: ShipmentStatus.PENDING,
			updatedById: userId,
			note: "Shipment created",
		},
	});
	await tx.auditLog.create({
		data: {
			userId,
			action: "CREATE_SHIPMENT",
			entityId: shipment.id,
			entityType: "SHIPMENT",
			details: { trackingId, status: shipment.status },
		},
	});
	return shipment;
}
const createShipment = (
	userId: string,
	input: z.infer<typeof ShipmentValidation.CreateShipmentSchema>["body"],
) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		return createInTransaction(tx, userId, input);
	});
const bulkCreate = (userId: string, input: unknown) => {
	const payload = z
		.array(ShipmentValidation.CreateShipmentSchema.shape.body)
		.min(1)
		.max(100)
		.parse(input);
	return prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		const results = [];
		for (const row of payload)
			results.push(await createInTransaction(tx, userId, row));
		return results;
	});
};

const getAllShipments = async (query: unknown, user: Actor) => {
	const { searchTerm, status, task, page, limit, sortBy, sortOrder } =
		listQuerySchema.parse(query);
	const conditions: Prisma.ShipmentWhereInput[] = [{ isDeleted: false }];
	if (user.role === "CUSTOMER") conditions.push({ senderId: user.userId });
	if (user.role === "COURIER") conditions.push({ courierId: user.userId });
	if (status)
		conditions.push({ status: z.nativeEnum(ShipmentStatus).parse(status) });
	if (task === "UNASSIGNED")
		conditions.push({ status: "PENDING", courierId: null });
	if (task === "TODAY") {
		const now = new Date(Date.now() + 6 * 3600000);
		const start = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
				6 * 3600000,
		);
		const end = new Date(start.getTime() + 86400000);
		conditions.push({
			OR: [
				{ status: "ASSIGNED", requestedPickupAt: { gte: start, lt: end } },
				{
					status: "OUT_FOR_DELIVERY",
					estimatedDelivery: { gte: start, lt: end },
				},
			],
		});
	}
	if (task === "PICKUP") conditions.push({ status: "ASSIGNED" });
	if (task === "DELIVERY") conditions.push({ status: "OUT_FOR_DELIVERY" });
	if (task === "FAILED") conditions.push({ status: "DELIVERY_FAILED" });
	if (task === "URGENT")
		conditions.push({
			serviceType: { in: ["EXPRESS", "SAME_DAY"] },
			status: { notIn: ["DELIVERED", "RETURNED", "CANCELLED"] },
		});
	if (task === "LATE")
		conditions.push({
			estimatedDelivery: { lt: new Date() },
			status: { notIn: ["DELIVERED", "RETURNED", "CANCELLED"] },
		});
	if (searchTerm)
		conditions.push({
			OR: [
				{ trackingId: { contains: searchTerm, mode: "insensitive" } },
				{ receiverName: { contains: searchTerm, mode: "insensitive" } },
				{ receiverPhone: { contains: searchTerm, mode: "insensitive" } },
			],
		});
	const validSortBy = ["createdAt", "price", "weight", "status"].includes(
		sortBy,
	)
		? sortBy
		: "createdAt";
	const [shipments, total] = await prisma.$transaction([
		prisma.shipment.findMany({
			where: { AND: conditions },
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { [validSortBy]: sortOrder },
			include: {
				sender: { select: { name: true } },
				originHub: { select: { name: true, location: true } },
				destinationHub: { select: { name: true, location: true } },
				courier: { select: { name: true, email: true } },
				payment: { select: publicPaymentSelect },
			},
		}),
		prisma.shipment.count({ where: { AND: conditions } }),
	]);
	return {
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		data: shipments.map((shipment) => ({
			...shipment,
			paymentStatus: shipment.payment?.status ?? "UNPAID",
			allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role),
		})),
	};
};

const getShipmentSummary = async (user: Actor) => {
	const where: Prisma.ShipmentWhereInput = {
		isDeleted: false,
		...(user.role === "CUSTOMER"
			? { senderId: user.userId }
			: user.role === "COURIER"
				? { courierId: user.userId }
				: {}),
	};
	const groups = await prisma.shipment.groupBy({
		by: ["status"],
		where,
		_count: { _all: true },
	});
	return groups.reduce(
		(summary, group) => {
			summary.totalShipments += group._count._all;
			if (
				group.status === "PENDING" ||
				ACTIVE_SHIPMENT_STATUSES.includes(group.status)
			)
				summary.activeShipments += group._count._all;
			if (group.status === "DELIVERED")
				summary.deliveredShipments += group._count._all;
			return summary;
		},
		{ totalShipments: 0, activeShipments: 0, deliveredShipments: 0 },
	);
};

const getSingleShipment = async (id: string, user: Actor) => {
	const shipment = await prisma.shipment.findUnique({
		where: { id, isDeleted: false },
		include: {
			sender: { select: { name: true, email: true, contactNumber: true } },
			courier: { select: { name: true, email: true, contactNumber: true } },
			originHub: true,
			destinationHub: true,
			payment: { select: publicPaymentSelect },
			trackings: { orderBy: { createdAt: "desc" } },
			deliveryProof: {
				select: {
					receiverName: true,
					signature: true,
					createdAt: true,
					acknowledged: true,
				},
			},
			collection: true,
		},
	});
	if (!shipment) throw new AppError(404, "Shipment not found");
	if (
		(user.role === "CUSTOMER" && shipment.senderId !== user.userId) ||
		(user.role === "COURIER" && shipment.courierId !== user.userId)
	) {
		throw new AppError(403, "You do not have permission to view this shipment");
	}
	return {
		...shipment,
		paymentStatus: shipment.payment?.status ?? "UNPAID",
		allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role),
	};
};

const trackShipment = async (trackingId: string) => {
	const shipment = await prisma.shipment.findUnique({
		where: { trackingId, isDeleted: false },
		select: {
			trackingId: true,
			status: true,
			estimatedDelivery: true,
			trackings: {
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					status: true,
					createdAt: true,
					hub: { select: { name: true, location: true } },
				},
			},
		},
	});
	if (!shipment) throw new AppError(404, "Tracking information not found");
	return shipment;
};

const assignCourier = async (
	shipmentId: string,
	courierId: string,
	adminId: string,
) =>
	prisma.$transaction(async (tx) => {
		await operationsActor(tx, { userId: adminId, role: "ADMIN" }, "ADMIN");
		await lockCourier(tx, courierId);
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
		});
		if (!shipment) throw new AppError(404, "Shipment not found");
		if (shipment.status !== ShipmentStatus.PENDING || shipment.courierId)
			throw new AppError(409, "Shipment is no longer available for assignment");
		const courier = await tx.courier.findUnique({
			where: { userId: courierId, isDeleted: false },
			include: { user: true },
		});
		if (
			!courier ||
			courier.user.isDeleted ||
			courier.user.status !== "ACTIVE" ||
			courier.user.role !== "COURIER"
		)
			throw new AppError(404, "Active courier not found");
		if (!courier.isAvailable)
			throw new AppError(400, "Courier is currently unavailable");
		if (!shipment.originHubId || shipment.originHubId !== courier.currentHubId)
			throw new AppError(400, "Courier must belong to the shipment origin hub");
		await assertActiveHub(tx, shipment.originHubId);
		const active = await tx.shipment.count({
			where: {
				courierId,
				isDeleted: false,
				status: { in: ACTIVE_SHIPMENT_STATUSES },
			},
		});
		if (active >= 5)
			throw new AppError(409, "Courier has reached the active delivery limit");
		const changed = await tx.shipment.updateMany({
			where: {
				id: shipmentId,
				status: ShipmentStatus.PENDING,
				courierId: null,
				isDeleted: false,
			},
			data: { courierId, status: ShipmentStatus.ASSIGNED },
		});
		if (changed.count !== 1)
			throw new AppError(409, "Shipment changed, please reload");
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status: ShipmentStatus.ASSIGNED,
				updatedById: adminId,
				note: "Courier assigned",
			},
		});
		await tx.auditLog.create({
			data: {
				userId: adminId,
				action: "ASSIGN_COURIER",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: {
					courierId,
					previousStatus: shipment.status,
					newStatus: ShipmentStatus.ASSIGNED,
				},
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});

const updateShipmentStatus = async (
	shipmentId: string,
	status: ShipmentStatus,
	userId: string,
	role: string,
	hubId?: string,
	note?: string,
	proof?: z.infer<typeof proofSchema>,
	collectedAmount?: number,
) =>
	prisma.$transaction(async (tx) => {
		await operationsActor(tx, { userId, role });
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
			include: { payment: { select: { status: true } } },
		});
		if (!shipment) throw new AppError(404, "Shipment not found");
		if (role === "COURIER" && shipment.courierId !== userId)
			throw new AppError(403, "You can only update assigned shipments");
		if (
			!["ADMIN", "COURIER"].includes(role) ||
			!nextShipmentStatuses(shipment.status, role).includes(status)
		)
			throw new AppError(400, "Invalid shipment status transition");
		if (
			["DELIVERY_FAILED", "RETURNED"].includes(status) &&
			(!note || note.trim().length < 5)
		)
			throw new AppError(400, "Delivery failure or return reason is required");
		if (status === "DELIVERED") {
			const evidence = proofSchema.parse(proof);
			if (shipment.pickupAreaId && shipment.payment?.status !== "PAID")
				throw new AppError(409, "Delivery fee must be paid before delivery");
			if (
				shipment.codAmount.gt(0) &&
				(collectedAmount === undefined ||
					!shipment.codAmount.equals(collectedAmount))
			)
				throw new AppError(400, "Exact COD collection is required");
			await tx.deliveryProof.create({
				data: { shipmentId, ...evidence, recordedById: userId },
			});
			if (shipment.codAmount.gt(0)) {
				await tx.cashCollection.create({
					data: {
						shipmentId,
						merchantId: shipment.senderId,
						courierId: shipment.courierId || userId,
						amount: shipment.codAmount,
						fee: shipment.codFee,
						payable: shipment.codAmount.minus(shipment.codFee),
					},
				});
			}
		}
		if (status === ShipmentStatus.CANCELLED)
			await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
		const effectiveHub =
			status === ShipmentStatus.AT_ORIGIN_HUB
				? shipment.originHubId
				: status === ShipmentStatus.AT_DESTINATION_HUB
					? shipment.destinationHubId
					: hubId;
		if (hubId && effectiveHub && hubId !== effectiveHub)
			throw new AppError(400, "Hub does not match the shipment route");
		if (
			[
				ShipmentStatus.AT_ORIGIN_HUB,
				ShipmentStatus.AT_DESTINATION_HUB,
			].includes(status as "AT_ORIGIN_HUB" | "AT_DESTINATION_HUB") &&
			!effectiveHub
		)
			throw new AppError(400, "Shipment hub is required");
		await assertActiveHub(tx, effectiveHub);
		const earning =
			status === ShipmentStatus.DELIVERED &&
			config.courier_commission_rate !== undefined
				? shipment.price.mul(config.courier_commission_rate).toDecimalPlaces(2)
				: undefined;
		const changed = await tx.shipment.updateMany({
			where: {
				id: shipmentId,
				status: shipment.status,
				courierId: shipment.courierId,
				isDeleted: false,
			},
			data: { status, courierEarning: earning },
		});
		if (changed.count !== 1)
			throw new AppError(409, "Shipment changed, please reload");
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status,
				updatedById: userId,
				hubId: effectiveHub,
				note,
			},
		});
		if (
			status === ShipmentStatus.IN_TRANSIT &&
			shipment.originHubId &&
			shipment.destinationHubId
		) {
			await tx.shipmentTransfer.create({
				data: {
					shipmentId,
					fromHubId: shipment.originHubId,
					toHubId: shipment.destinationHubId,
					transferredById: userId,
					departureAt: new Date(),
				},
			});
		}
		if (status === ShipmentStatus.AT_DESTINATION_HUB) {
			await tx.shipmentTransfer.updateMany({
				where: { shipmentId, arrivalAt: null },
				data: { arrivalAt: new Date(), status },
			});
		}
		await tx.auditLog.create({
			data: {
				userId,
				action: "UPDATE_STATUS",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: { previousStatus: shipment.status, newStatus: status },
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});

const cancelShipment = async (shipmentId: string, userId: string) =>
	prisma.$transaction(async (tx) => {
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
			include: { payment: { select: { status: true } } },
		});
		if (!shipment) throw new AppError(404, "Shipment not found");
		if (shipment.senderId !== userId)
			throw new AppError(403, "You cannot cancel this shipment");
		if (shipment.status !== ShipmentStatus.PENDING)
			throw new AppError(409, "Only pending shipments can be cancelled");
		await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
		const changed = await tx.shipment.updateMany({
			where: {
				id: shipmentId,
				senderId: userId,
				status: ShipmentStatus.PENDING,
				isDeleted: false,
			},
			data: { status: ShipmentStatus.CANCELLED },
		});
		if (changed.count !== 1)
			throw new AppError(409, "Shipment changed, please reload");
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status: ShipmentStatus.CANCELLED,
				updatedById: userId,
				note: "Cancelled by customer",
			},
		});
		await tx.auditLog.create({
			data: {
				userId,
				action: "CANCEL_SHIPMENT",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: {
					previousStatus: shipment.status,
					newStatus: ShipmentStatus.CANCELLED,
				},
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});

const handoffCourier = (
	shipmentId: string,
	courierId: string,
	adminId: string,
) =>
	prisma.$transaction(async (tx) => {
		await operationsActor(tx, { userId: adminId, role: "ADMIN" }, "ADMIN");
		await lockCourier(tx, courierId);
		await lockShipment(tx, shipmentId);
		const shipment = await tx.shipment.findUnique({
			where: { id: shipmentId, isDeleted: false },
		});
		if (
			!shipment ||
			!["AT_ORIGIN_HUB", "AT_DESTINATION_HUB"].includes(shipment.status)
		)
			throw new AppError(409, "Handover requires a parcel at a hub");
		const hubId =
			shipment.status === "AT_ORIGIN_HUB"
				? shipment.originHubId
				: shipment.destinationHubId;
		await assertActiveHub(tx, hubId);
		const courier = await tx.courier.findUnique({
			where: { userId: courierId },
			include: { user: true },
		});
		if (
			!courier ||
			!courier.isAvailable ||
			courier.isDeleted ||
			courier.user.isDeleted ||
			!courier.user.emailVerified ||
			courier.user.role !== "COURIER" ||
			courier.user.status !== "ACTIVE" ||
			courier.currentHubId !== hubId ||
			shipment.courierId === courierId
		)
			throw new AppError(
				400,
				"Available worker at the matching hub is required",
			);
		if (
			(await tx.shipment.count({
				where: {
					courierId,
					isDeleted: false,
					status: { in: ACTIVE_SHIPMENT_STATUSES },
				},
			})) >= 5
		)
			throw new AppError(409, "Worker capacity exceeded");
		await tx.shipment.update({
			where: { id: shipmentId },
			data: { courierId },
		});
		await tx.shipmentTracking.create({
			data: {
				shipmentId,
				status: shipment.status,
				hubId,
				updatedById: adminId,
				note: "Hub worker handover",
			},
		});
		await tx.auditLog.create({
			data: {
				userId: adminId,
				action: "HANDOFF_COURIER",
				entityId: shipmentId,
				entityType: "SHIPMENT",
				details: {
					fromCourierId: shipment.courierId,
					toCourierId: courierId,
					hubId,
				},
			},
		});
		return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
	});
export const ShipmentService = {
	createShipment,
	bulkCreate,
	getAllShipments,
	getShipmentSummary,
	getSingleShipment,
	trackShipment,
	assignCourier,
	handoffCourier,
	updateShipmentStatus,
	cancelShipment,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.validation.ts

```ts
import { z } from "zod";
import { quoteSchema, proofSchema } from "../operations/operations.validation";

const CreateShipmentSchema = z.object({
	body: quoteSchema
		.extend({
			requestId: z.string().uuid(),
			quotedServiceType: z
				.enum(["STANDARD", "EXPRESS", "SAME_DAY", "NEXT_DAY"])
				.optional(),
			quoteVersion: z.string().datetime(),
			quotedDeliveryCharge: z.number().min(0).max(1000000).multipleOf(0.01),
			quotedCodFee: z.number().min(0).max(1000000).multipleOf(0.01),
			receiverName: z.string().trim().min(1).max(255),
			receiverPhone: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/),
			receiverAddress: z.string().trim().min(5).max(500),
			senderPhone: z.string().regex(/^(?:\+88|88)?01[3-9]\d{8}$/),
			pickupAddress: z.string().trim().min(5).max(500),
			productType: z.enum(["DOCUMENT", "PARCEL", "FRAGILE"]),
			declaredValue: z.number().min(0).max(1000000).multipleOf(0.01),
			requestedPickupAt: z
				.string()
				.datetime({ offset: true })
				.refine(
					(value) =>
						Date.parse(value) > Date.now() &&
						Date.parse(value) < Date.now() + 30 * 86400000,
					"Pickup time must be within the next 30 days",
				),
			deliveryInstructions: z.string().trim().max(500).default(""),
		})
		.strict()
		.refine((value) => value.codAmount <= value.declaredValue, {
			message: "COD cannot exceed declared value",
			path: ["codAmount"],
		}),
});

const UpdateShipmentStatusSchema = z.object({
	body: z
		.object({
			status: z.enum([
				"PENDING",
				"ASSIGNED",
				"PICKED_UP",
				"AT_ORIGIN_HUB",
				"IN_TRANSIT",
				"AT_DESTINATION_HUB",
				"OUT_FOR_DELIVERY",
				"DELIVERED",
				"DELIVERY_FAILED",
				"RETURNED",
				"CANCELLED",
			]),
			hubId: z.string().uuid().optional(),
			note: z.string().trim().max(500).optional(),
			proof: proofSchema.optional(),
			collectedAmount: z
				.number()
				.min(0)
				.max(1000000)
				.multipleOf(0.01)
				.optional(),
		})
		.strict(),
});

const AssignCourierSchema = z.object({
	body: z
		.object({
			courierId: z.string().uuid(),
		})
		.strict(),
});

export const ShipmentValidation = {
	CreateShipmentSchema,
	UpdateShipmentStatusSchema,
	AssignCourierSchema,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\user\user.controller.ts

```ts
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await UserService.getMe(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateProfileImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, "Profile image file is required");
  }

  const userId = req.user.userId;
  const result = await UserService.updateProfileImage(userId, req.file.buffer);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile image updated successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateMyProfile(req.user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

export const UserController = {
  getMe,
  updateProfileImage,
  updateMyProfile,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\user\user.service.ts

```ts
import type { z } from "zod";
import type { User } from "@prisma/client";
import type { UploadApiResponse } from "cloudinary";
import { prisma } from "../../utils/prisma";
import { safeUser } from "../../utils/session";
import { UserValidation } from "./user.validation";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";
import { cloudinary } from "../../utils/cloudinary";

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customer: true,
      courier: {
        include: {
          hub: true,
        },
      },
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return safeUser(user);
};

const updateProfileImage = async (userId: string, fileBuffer: Buffer) => {
  const jpeg = fileBuffer.length >= 3 && fileBuffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = fileBuffer.length >= 8 && fileBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = fileBuffer.length >= 12 && fileBuffer.toString("ascii", 0, 4) === "RIFF" && fileBuffer.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp) throw new AppError(400, "Invalid image content");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, imagePublicId: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: "image", allowed_formats: ["jpg", "png", "webp"], transformation: [{ width: 512, height: 512, crop: "limit" }], folder: "courier-profiles" }, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Cloudinary upload failed"));
      resolve(result);
    }).end(fileBuffer);
  });

  let updatedUser: Pick<User, "id" | "name" | "email" | "role" | "imageUrl">;
  try {
    updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      imageUrl: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      imageUrl: true,
    },
    });
  } catch (error) {
    await cloudinary.uploader.destroy(uploadResult.public_id).catch(() => undefined);
    throw error;
  }

  if (user.imagePublicId) {
    await cloudinary.uploader.destroy(user.imagePublicId).catch(() => undefined);
  }

  return updatedUser;
};

const updateMyProfile = async (userId: string, input: z.infer<typeof UserValidation.UpdateProfileSchema>["body"]) => {
  const payload = UserValidation.UpdateProfileSchema.shape.body.parse(input);
  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId, isDeleted: false } });
    if (!user) throw new AppError(404, "User not found");
    if (payload.address !== undefined && user.role !== "CUSTOMER") throw new AppError(400, "Only customer profiles have an address");
    await tx.user.update({ where: { id: userId }, data: { name: payload.name, contactNumber: payload.contactNumber } });
    if (user.role === "CUSTOMER") {
      await tx.customer.upsert({
        where: { userId },
        create: { userId, address: payload.address, contactNumber: payload.contactNumber ?? user.contactNumber },
        update: { address: payload.address, contactNumber: payload.contactNumber },
      });
    }
    if (user.role === "COURIER" && payload.contactNumber !== undefined) {
      await tx.courier.updateMany({ where: { userId }, data: { contactNumber: payload.contactNumber } });
    }
    return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { customer: true } });
  });
  return safeUser(result);
};

export const UserService = {
  getMe,
  updateProfileImage,
  updateMyProfile,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\user\user.validation.ts

```ts
import { z } from "zod";

const UpdateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(255).optional(),
    contactNumber: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/).optional(),
    address: z.string().trim().max(500).refine(value => value.length === 0 || value.length >= 5).optional(),
  }).strict().refine(value => Object.keys(value).length > 0, "At least one profile field is required"),
});

export const UserValidation = {
  UpdateProfileSchema,
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\routes\index.ts

```ts
import express from "express";
import { OperationsRoutes } from "../modules/operations/operations.route";
import { AdminRoutes } from "../modules/admin/admin.route";
import { AuditLogRoutes } from "../modules/auditLog/auditLog.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { CourierRoutes } from "../modules/courier/courier.route";
import { HubRoutes } from "../modules/hub/hub.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { ShipmentRoutes } from "../modules/shipment/shipment.route";
import { UserRoutes } from "../modules/user/user.route";

const router = express.Router();

const moduleRoutes = [
	{ path: "/operations", route: OperationsRoutes },
	{
		path: "/auth",
		route: AuthRoutes,
	},
	{
		path: "/users",
		route: UserRoutes,
	},
	{
		path: "/hubs",
		route: HubRoutes,
	},
	{
		path: "/shipments",
		route: ShipmentRoutes,
	},
	{
		path: "/payments",
		route: PaymentRoutes,
	},
	{
		path: "/audit-logs",
		route: AuditLogRoutes,
	},
	{
		path: "/admin",
		route: AdminRoutes,
	},
	{
		path: "/couriers",
		route: CourierRoutes,
	},
];

for (const route of moduleRoutes) router.use(route.path, route.route);

export default router;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\catchAsync.ts

```ts
import type { NextFunction, Request, RequestHandler, Response } from "express";

const catchAsync = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

export default catchAsync;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\cookies.ts

```ts
import type { CookieOptions, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: config.cookie_same_site,
  path: "/",
};

export function setSessionCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  for (const name of ["accessToken", "refreshToken"] as const) {
    const token = tokens[name];
    const expiry = (jwt.decode(token) as JwtPayload).exp;
    if (!expiry) throw new Error("Session token expiry is missing");
    res.cookie(name, token, { ...sessionCookieOptions, maxAge: Math.max(0, expiry * 1000 - Date.now()) });
  }
}

export function clearSessionCookies(res: Response) {
  res.clearCookie("accessToken", sessionCookieOptions);
  res.clearCookie("refreshToken", sessionCookieOptions);
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\logger.ts

```ts
export const logger = {
  info(event: string, details: Record<string, unknown> = {}) {
    console.log(JSON.stringify({ level: "info", event, time: new Date().toISOString(), ...details }));
  },
  error(event: string, details: Record<string, unknown> = {}) {
    console.error(JSON.stringify({ level: "error", event, time: new Date().toISOString(), ...details }));
  },
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\prisma.ts

```ts
import { PrismaClient } from "@prisma/client";
import config from "../config";

const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalDatabase.prisma ?? new PrismaClient({
  transactionOptions: {
    maxWait: config.prisma_transaction_max_wait_ms,
    timeout: config.prisma_transaction_timeout_ms,
  },
});

if (process.env.NODE_ENV !== "production") {
  globalDatabase.prisma = prisma;
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\query.ts

```ts
import { z } from "zod";

export const listQuerySchema = z.object({
	page: z.coerce.number().int().min(1).max(100000).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z.string().max(40).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	searchTerm: z.string().trim().max(200).optional(),
	role: z.enum(["ADMIN", "COURIER", "CUSTOMER"]).optional(),
	status: z.string().max(40).optional(),
	isAvailable: z.enum(["true", "false"]).optional(),
	action: z.string().max(80).optional(),
	entityType: z.string().max(80).optional(),
	task: z
		.enum([
			"PICKUP",
			"DELIVERY",
			"FAILED",
			"LATE",
			"URGENT",
			"TODAY",
			"UNASSIGNED",
		])
		.optional(),
});

export const idParamsSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
});
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\redis.ts

```ts
import { createClient } from "redis";
import config from "../config";
import { logger } from "./logger";

export const redisClient = createClient({
  url: config.redis_url,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: retries => retries < 3 ? Math.min(retries * 200, 1000) : new Error("Redis unavailable"),
  },
  disableOfflineQueue: true,
});

redisClient.on("error", () => logger.error("redis_connection_error"));

let connection: Promise<void> | undefined;
export const connectRedis = async () => {
  if (redisClient.isReady) return;
  if (!connection) {
    connection = redisClient.connect().then(() => undefined).finally(() => { connection = undefined; });
  }
  await connection;
};
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\sendResponse.ts

```ts
import type { Response } from "express";

type TMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: TMeta;
  data: T;
};

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    meta: data.meta,
    data: data.data,
  });
};

export default sendResponse;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\session.ts

```ts
import type { User } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import config from "../config";
import { AppError } from "../errors/AppError";
import { redisClient } from "./redis";

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const sessionKey = (sessionId: string) => `session:${sessionId}`;

export function buildSessionTokens(user: User, sessionId: string = randomUUID()) {
  const payload = { userId: user.id, name: user.name, email: user.email, role: user.role, tokenVersion: user.tokenVersion, sessionId };
  const accessToken = jwt.sign(payload, config.jwt_access_secret, {
    algorithm: "HS256", expiresIn: config.jwt_access_expires_in as SignOptions["expiresIn"], jwtid: randomUUID(),
  });
  const refreshToken = jwt.sign(payload, config.jwt_refresh_secret, {
    algorithm: "HS256", expiresIn: config.jwt_refresh_expires_in as SignOptions["expiresIn"], jwtid: randomUUID(),
  });
  const expiresAt = (jwt.decode(refreshToken) as JwtPayload).exp;
  if (!expiresAt) throw new Error("Session token expiry is missing");
  return { accessToken, refreshToken, sessionId, ttl: Math.max(1, expiresAt - Math.floor(Date.now() / 1000)) };
}

export async function createSession(user: User) {
  const tokens = buildSessionTokens(user);
  await redisClient.setEx(sessionKey(tokens.sessionId), tokens.ttl, digest(tokens.refreshToken));
  return tokens;
}

export async function rotateSession(user: User, oldToken: string, sessionId: string) {
  const tokens = buildSessionTokens(user, sessionId);
  const changed = await redisClient.eval(
    "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1 end; return 0",
    { keys: [sessionKey(sessionId)], arguments: [digest(oldToken), digest(tokens.refreshToken), String(tokens.ttl)] },
  );
  if (changed !== 1) throw new AppError(401, "Session expired or refresh token already used");
  return tokens;
}

export const revokeSession = (sessionId: string) => redisClient.del(sessionKey(sessionId));
export const hasSession = async (sessionId: string) => Boolean(await redisClient.exists(sessionKey(sessionId)));

export function safeUser(user: User) {
  const { password, googleId, imagePublicId, tokenVersion, ...publicUser } = user;
  return publicUser;
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\server.ts

```ts
import type { Server } from "node:http";
import app from "./app/app";
import config from "./app/config";
import { logger } from "./app/utils/logger";
import { prisma } from "./app/utils/prisma";
import { connectRedis, redisClient } from "./app/utils/redis";

let server: Server | undefined;
let stopping = false;

async function shutdown(reason: string, exitCode = 0) {
  if (stopping) return;
  stopping = true;
  logger.info("server_shutdown", { reason });
  const deadline = setTimeout(() => process.exit(1), 15000);
  deadline.unref();
  const runningServer = server;
  if (runningServer) await new Promise<void>(resolve => runningServer.close(() => resolve()));
  await prisma.$disconnect();
  if (redisClient.isOpen) await redisClient.quit();
  clearTimeout(deadline);
  process.exit(exitCode);
}

async function main() {
  try {
    await prisma.$connect();
    await connectRedis();
    server = app.listen(config.port, () => logger.info("server_started", { port: config.port }));
    server.requestTimeout = 30000;
    server.headersTimeout = 15000;
  } catch {
    logger.error("server_start_failed");
    await shutdown("startup_failure", 1);
  }
}

if (!process.env.VERCEL) {
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("unhandledRejection", () => { logger.error("unhandled_rejection"); void shutdown("unhandled_rejection", 1); });
  process.on("uncaughtException", () => { logger.error("uncaught_exception"); void shutdown("uncaught_exception", 1); });
  void main();
}

export default app;
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\environment.ts

```ts
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/courier_test";
process.env.REDIS_URL = "redis://127.0.0.1:6379";
process.env.JWT_ACCESS_SECRET =
	"test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET =
	"test-refresh-secret-that-is-at-least-32-characters";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.COOKIE_SAME_SITE = "lax";
process.env.STRIPE_SECRET_KEY = "sk_test_local_fixture";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
process.env.SMTP_SEND_TIMEOUT_MS = "25000";
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\integration\environment.ts

```ts
const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const parsedUrl = databaseUrl ? new URL(databaseUrl) : undefined;
const isolatedSchema = parsedUrl?.searchParams.get("schema");
const ownedStagingSchema = process.env.INTEGRATION_OWNED_SCHEMA;
const dedicatedDatabase = parsedUrl?.pathname.endsWith("_test");
const dedicatedSchema = isolatedSchema === ownedStagingSchema && /^courier_integration_[a-f0-9]{32}_test$/.test(isolatedSchema ?? "");
if (!databaseUrl || (!dedicatedDatabase && !dedicatedSchema)) throw new Error("Integration tests require a dedicated _test database or a runner-owned staging schema");
process.env.DATABASE_URL = databaseUrl;
const redisUrl = process.env.INTEGRATION_REDIS_URL;
if (!redisUrl) throw new Error("INTEGRATION_REDIS_URL must point to a dedicated test Redis instance or database");
process.env.REDIS_URL = redisUrl;
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "integration-access-secret-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "integration-refresh-secret-at-least-32-characters";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.COOKIE_SAME_SITE = "lax";
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\integration\transactions.test.ts

```ts
import "./environment";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { PaymentGateway, Role } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "../../src/app/utils/prisma";
import { connectRedis, redisClient } from "../../src/app/utils/redis";
import {
	createSession,
	rotateSession,
	revokeSession,
} from "../../src/app/utils/session";
import { ShipmentService } from "../../src/app/modules/shipment/shipment.service";
import { UserService } from "../../src/app/modules/user/user.service";
import { OperationsService } from "../../src/app/modules/operations/operations.service";
import { PaymentService } from "../../src/app/modules/payment/payment.service";

const userIds: string[] = [];
const hubIds: string[] = [];
const shipmentIds: string[] = [];
const areaIds: string[] = [];
const rateIds: string[] = [];
before(async () => {
	await prisma.$connect();
	await connectRedis();
});
after(async () => {
	await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
	await prisma.auditLog.deleteMany({
		where: {
			OR: [{ entityId: { in: shipmentIds } }, { userId: { in: userIds } }],
		},
	});
	await prisma.ratePlan.deleteMany({ where: { id: { in: rateIds } } });
	await prisma.serviceArea.deleteMany({ where: { id: { in: areaIds } } });
	await prisma.user.deleteMany({ where: { id: { in: userIds } } });
	await prisma.hub.deleteMany({ where: { id: { in: hubIds } } });
	await prisma.$disconnect();
	if (redisClient.isOpen) await redisClient.quit();
});

async function fixtures() {
	const suffix = randomUUID();
	const sender = await prisma.user.create({
		data: {
			name: "Integration Customer",
			email: suffix + "@integration.test",
			role: Role.CUSTOMER,
			emailVerified: true,
			customer: { create: {} },
		},
	});
	userIds.push(sender.id);
	const admin = await prisma.user.create({
		data: {
			name: "Integration Admin",
			email: "admin-" + suffix + "@integration.test",
			role: Role.ADMIN,
			emailVerified: true,
		},
	});
	userIds.push(admin.id);
	const hub = await prisma.hub.create({
		data: {
			name: "Integration-" + suffix,
			location: "Dhaka",
			address: "Integration address",
		},
	});
	hubIds.push(hub.id);
	const destination = await prisma.hub.create({
		data: {
			name: "Destination-" + suffix,
			location: "Savar",
			address: "Integration address",
		},
	});
	hubIds.push(destination.id);
	const couriers = [];
	for (const number of [1, 2]) {
		const courier = await prisma.user.create({
			data: {
				name: "Integration Courier",
				email: "courier-" + number + "-" + suffix + "@integration.test",
				role: Role.COURIER,
				emailVerified: true,
				courier: {
					create: { contactNumber: "01712345678", currentHubId: hub.id },
				},
			},
		});
		userIds.push(courier.id);
		couriers.push(courier);
	}

	const pickup = await prisma.serviceArea.create({
		data: {
			name: "Pickup-" + suffix,
			district: "Dhaka",
			upazila: "Mirpur",
			hubId: hub.id,
			pickupEnabled: true,
			deliveryEnabled: true,
		},
	});
	const receiver = await prisma.serviceArea.create({
		data: {
			name: "Receiver-" + suffix,
			district: "Dhaka",
			upazila: "Savar",
			hubId: destination.id,
			pickupEnabled: true,
			deliveryEnabled: true,
		},
	});
	areaIds.push(pickup.id, receiver.id);
	const rate = await prisma.ratePlan.create({
		data: {
			pickupAreaId: pickup.id,
			receiverAreaId: receiver.id,
			baseWeight: 1,
			baseCharge: 120,
			extraPerKg: 20,
			pickupFee: 0,
			codPercent: 1,
			deliveryDays: 2,
			active: true,
		},
	});
	rateIds.push(rate.id);
	const input = {
		requestId: randomUUID(),
		quoteVersion: rate.updatedAt.toISOString(),
		quotedDeliveryCharge: 120,
		quotedCodFee: 0,
		receiverName: "Receiver",
		receiverPhone: "01712345678",
		receiverAddress: "Integration destination",
		weight: 1,
		pickupAreaId: pickup.id,
		receiverAreaId: receiver.id,
		senderPhone: "01712345678",
		pickupAddress: "Integration pickup address",
		pickupMode: "HOME" as const,
		serviceType: "STANDARD" as const,
		productType: "PARCEL" as const,
		declaredValue: 0,
		codAmount: 0,
		requestedPickupAt: new Date(Date.now() + 86400000).toISOString(),
		deliveryInstructions: "",
	};
	const shipment = await ShipmentService.createShipment(sender.id, input);
	shipmentIds.push(shipment.id);
	return {
		sender,
		admin,
		couriers,
		shipment,
		pickup,
		receiver,
		rate,
		input,
		hub,
		destination,
	};
}

test("concurrent courier assignment succeeds once and records one tracking event", async () => {
	const { admin, couriers, shipment } = await fixtures();
	const results = await Promise.allSettled(
		couriers.map((courier) =>
			ShipmentService.assignCourier(shipment.id, courier.id, admin.id),
		),
	);
	assert.equal(
		results.filter((result) => result.status === "fulfilled").length,
		1,
	);
	assert.equal(
		await prisma.shipmentTracking.count({
			where: { shipmentId: shipment.id, status: "ASSIGNED" },
		}),
		1,
	);
});

test("concurrent status changes cannot append duplicate tracking events", async () => {
	const { admin, couriers, shipment } = await fixtures();
	await ShipmentService.assignCourier(shipment.id, couriers[0].id, admin.id);
	const results = await Promise.allSettled(
		[1, 2].map(() =>
			ShipmentService.updateShipmentStatus(
				shipment.id,
				"PICKED_UP",
				couriers[0].id,
				"COURIER",
			),
		),
	);
	assert.equal(
		results.filter((result) => result.status === "fulfilled").length,
		1,
	);
	assert.equal(
		await prisma.shipmentTracking.count({
			where: { shipmentId: shipment.id, status: "PICKED_UP" },
		}),
		1,
	);
});

test("profile address and phone update together without changing role", async () => {
	const { sender } = await fixtures();
	const result = await UserService.updateMyProfile(sender.id, {
		name: "Updated Customer",
		address: "Updated integration address",
		contactNumber: "01812345678",
	});
	assert.equal(result.role, "CUSTOMER");
	assert.equal(result.customer?.address, "Updated integration address");
	assert.equal(result.customer?.contactNumber, result.contactNumber);
});

test("verified repeated Stripe events record money and audit once", async () => {
	const { shipment } = await fixtures();
	const payment = await prisma.payment.create({
		data: {
			shipmentId: shipment.id,
			amount: shipment.price,
			paymentGateway: PaymentGateway.STRIPE,
		},
	});
	const reference = "cs_test_" + randomUUID();
	const attempt = await prisma.paymentAttempt.create({
		data: {
			paymentId: payment.id,
			paymentGateway: PaymentGateway.STRIPE,
			amount: payment.amount,
			transactionId: reference,
		},
	});
	const event = {
		id: "evt_" + randomUUID(),
		type: "checkout.session.completed",
		data: {
			object: {
				id: reference,
				mode: "payment",
				payment_status: "paid",
				currency: "bdt",
				amount_total: 12000,
				payment_intent: "pi_" + randomUUID(),
				metadata: { shipmentId: shipment.id, attemptId: attempt.id },
			},
		},
	} as unknown as Stripe.Event;
	await Promise.all([
		PaymentService.handleStripeEvent(event),
		PaymentService.handleStripeEvent(event),
	]);
	assert.equal(
		(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }))
			.status,
		"PAID",
	);
	assert.equal(
		await prisma.auditLog.count({
			where: { entityId: shipment.id, action: "PAYMENT_SUCCESS" },
		}),
		1,
	);
	const expired = {
		...event,
		type: "checkout.session.expired",
	} as Stripe.Event;
	await PaymentService.handleStripeEvent(expired);
	assert.equal(
		(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }))
			.status,
		"PAID",
	);
});

test("Redis refresh rotation allows exactly one concurrent use", async () => {
	const { sender } = await fixtures();
	const tokens = await createSession(sender);
	try {
		const results = await Promise.allSettled(
			[1, 2].map(() =>
				rotateSession(sender, tokens.refreshToken, tokens.sessionId),
			),
		);
		assert.equal(
			results.filter((result) => result.status === "fulfilled").length,
			1,
		);
	} finally {
		await revokeSession(tokens.sessionId);
	}
});

test("pending payment attempts prevent cancellation", async () => {
	const { sender, shipment } = await fixtures();
	const payment = await prisma.payment.create({
		data: { shipmentId: shipment.id, amount: shipment.price },
	});
	await prisma.paymentAttempt.create({
		data: {
			paymentId: payment.id,
			amount: shipment.price,
			paymentGateway: PaymentGateway.BKASH,
		},
	});
	await assert.rejects(
		() => ShipmentService.cancelShipment(shipment.id, sender.id),
		(error: any) => error.statusCode === 409,
	);
	assert.equal(
		(await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } }))
			.status,
		"PENDING",
	);
});

test("payment reconciliation rejects a different customer", async () => {
	const { admin, shipment } = await fixtures();
	await assert.rejects(
		() => PaymentService.reconcilePayment(shipment.id, admin.id),
		(error: any) => error.statusCode === 403,
	);
});

test("shipment summary counts every matching shipment without a page limit", async () => {
	const { sender, shipment } = await fixtures();
	const extra = Array.from({ length: 104 }, () => ({
		id: randomUUID(),
		trackingId: "TRK-" + randomUUID(),
		senderId: sender.id,
		receiverName: "Receiver",
		receiverPhone: "01712345678",
		receiverAddress: "Integration address",
		weight: 1,
		price: 120,
	}));
	shipmentIds.push(...extra.map((item) => item.id));
	await prisma.shipment.createMany({ data: extra });
	await prisma.shipment.update({
		where: { id: shipment.id },
		data: { status: "DELIVERED" },
	});
	const summary = await ShipmentService.getShipmentSummary({
		userId: sender.id,
		role: "CUSTOMER",
	});
	assert.deepEqual(summary, {
		totalShipments: 105,
		activeShipments: 104,
		deliveredShipments: 1,
	});
});

const phone = "01712345678";
const actor = (user: { id: string; role: string }) => ({
	userId: user.id,
	role: user.role,
});
const businessInput = {
	shopName: "Integration shop",
	pickupAddress: "Integration pickup address",
	contactNumber: phone,
	payoutMethod: "BANK",
	accountName: "Integration merchant",
	accountNumber: "1234567890",
};
async function approveBusiness(f: Awaited<ReturnType<typeof fixtures>>) {
	const record = await OperationsService.business(
		businessInput,
		actor(f.sender),
	);
	await OperationsService.review(
		"business",
		record.id,
		{ approved: true, note: "Integration verified account" },
		actor(f.admin),
	);
	return record;
}
async function prepareDelivery(
	f: Awaited<ReturnType<typeof fixtures>>,
	id = f.shipment.id,
) {
	await prisma.payment.create({
		data: {
			shipmentId: id,
			amount: 120,
			status: "PAID",
			paymentGateway: "STRIPE",
		},
	});
	await ShipmentService.assignCourier(id, f.couriers[0].id, f.admin.id);
	for (const status of [
		"PICKED_UP",
		"AT_ORIGIN_HUB",
		"IN_TRANSIT",
		"AT_DESTINATION_HUB",
		"OUT_FOR_DELIVERY",
	] as const)
		await ShipmentService.updateShipmentStatus(
			id,
			status,
			f.couriers[0].id,
			"COURIER",
		);
}
const signature =
	"data:image/png;base64," +
	Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		Buffer.alloc(120, 1),
	]).toString("base64");
const evidence = {
	receiverName: "Integration Receiver",
	signature,
	acknowledged: true as const,
};

test("approved pricing uses exact decimals and unavailable areas fail closed", async () => {
	const f = await fixtures();
	const quote = await OperationsService.quote({
		pickupAreaId: f.pickup.id,
		receiverAreaId: f.receiver.id,
		weight: 1.01,
		codAmount: 100,
	});
	assert.equal(quote.deliveryCharge, "140");
	assert.equal(quote.codFee, "1");
	assert.equal(quote.merchantPayable, "99");
	await prisma.serviceArea.update({
		where: { id: f.receiver.id },
		data: { deliveryEnabled: false },
	});
	await assert.rejects(() =>
		OperationsService.quote({
			pickupAreaId: f.pickup.id,
			receiverAreaId: f.receiver.id,
			weight: 1,
		}),
	);
	await assert.rejects(
		() =>
			OperationsService.configure(
				"area",
				{
					name: "Unauthorized area",
					district: "Dhaka",
					upazila: "Savar",
					hubId: f.hub.id,
					pickupEnabled: true,
					deliveryEnabled: true,
				},
				actor(f.sender),
			),
		(e: any) => e.statusCode === 403,
	);
});

test("booking retries return one shipment and changed payload keys are rejected", async () => {
	const f = await fixtures();
	const body = { ...f.input, requestId: randomUUID() };
	const results = await Promise.all([
		ShipmentService.createShipment(f.sender.id, body),
		ShipmentService.createShipment(f.sender.id, body),
	]);
	shipmentIds.push(results[0].id);
	assert.equal(results[0].id, results[1].id);
	assert.equal(
		await prisma.shipmentTracking.count({
			where: { shipmentId: results[0].id, status: "PENDING" },
		}),
		1,
	);
	await assert.rejects(
		() => ShipmentService.createShipment(f.sender.id, { ...body, weight: 2 }),
		(e: any) => e.statusCode === 409,
	);
	await assert.rejects(
		() =>
			ShipmentService.createShipment(f.sender.id, {
				...f.input,
				requestId: randomUUID(),
				quotedDeliveryCharge: 1,
			}),
		(e: any) => e.statusCode === 409,
	);
});

test("changed rate versions and inactive pricing cannot be booked", async () => {
	const f = await fixtures();
	await prisma.ratePlan.update({
		where: { id: f.rate.id },
		data: { baseCharge: 140 },
	});
	await assert.rejects(
		() =>
			ShipmentService.createShipment(f.sender.id, {
				...f.input,
				requestId: randomUUID(),
			}),
		(e: any) => e.statusCode === 409,
	);
	await prisma.ratePlan.update({
		where: { id: f.rate.id },
		data: { active: false },
	});
	await assert.rejects(
		() =>
			OperationsService.quote({
				pickupAreaId: f.pickup.id,
				receiverAreaId: f.receiver.id,
				weight: 1,
			}),
		(e: any) => e.statusCode === 409,
	);
});

test("bulk booking is atomic and safely retryable", async () => {
	const f = await fixtures();
	const good = { ...f.input, requestId: randomUUID() };
	const unauthorizedCod = {
		...f.input,
		requestId: randomUUID(),
		codAmount: 100,
		declaredValue: 100,
		quotedCodFee: 1,
	};
	await assert.rejects(() =>
		ShipmentService.bulkCreate(f.sender.id, [good, unauthorizedCod]),
	);
	assert.equal(
		await prisma.shipment.count({ where: { senderId: f.sender.id } }),
		1,
	);
	const rows = [good, { ...f.input, requestId: randomUUID() }];
	const result = await ShipmentService.bulkCreate(f.sender.id, rows);
	shipmentIds.push(...result.map((row) => row.id));
	const retry = await ShipmentService.bulkCreate(f.sender.id, rows);
	assert.deepEqual(
		result.map((row) => row.id),
		retry.map((row) => row.id),
	);
	assert.equal(
		await prisma.shipment.count({ where: { senderId: f.sender.id } }),
		3,
	);
});

test("courier application cannot self-approve and approval revokes customer token version", async () => {
	const f = await fixtures(),
		a = actor(f.sender);
	const application = await OperationsService.apply(
		{ contactNumber: phone, area: "Integration area", vehicleType: "BICYCLE" },
		a,
	);
	assert.equal(
		(await prisma.user.findUniqueOrThrow({ where: { id: f.sender.id } })).role,
		"CUSTOMER",
	);
	await assert.rejects(
		() =>
			OperationsService.review(
				"application",
				application.id,
				{ approved: true, hubId: f.hub.id, note: "Self approve" },
				a,
			),
		(e: any) => e.statusCode === 403,
	);
	await assert.rejects(
		() =>
			OperationsService.review(
				"application",
				application.id,
				{ approved: true, hubId: f.hub.id, note: "Verified applicant" },
				actor(f.admin),
			),
		(e: any) => e.statusCode === 409,
	);
	await ShipmentService.cancelShipment(f.shipment.id, f.sender.id);
	await OperationsService.review(
		"application",
		application.id,
		{ approved: true, hubId: f.hub.id, note: "Verified applicant" },
		actor(f.admin),
	);
	const changed = await prisma.user.findUniqueOrThrow({
		where: { id: f.sender.id },
	});
	assert.equal(changed.role, "COURIER");
	assert.equal(changed.tokenVersion, 1);
});

test("delivery proof and exact COD are required and concurrent completion records money once", async () => {
	const f = await fixtures();
	await approveBusiness(f);
	const shipment = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		codAmount: 100,
		declaredValue: 100,
		quotedCodFee: 1,
	});
	shipmentIds.push(shipment.id);
	await prepareDelivery(f, shipment.id);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			shipment.id,
			"DELIVERED",
			f.couriers[0].id,
			"COURIER",
		),
	);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			shipment.id,
			"DELIVERED",
			f.couriers[0].id,
			"COURIER",
			undefined,
			undefined,
			evidence,
			99,
		),
	);
	assert.equal(
		await prisma.cashCollection.count({ where: { shipmentId: shipment.id } }),
		0,
	);
	const completed = await Promise.allSettled(
		[1, 2].map(() =>
			ShipmentService.updateShipmentStatus(
				shipment.id,
				"DELIVERED",
				f.couriers[0].id,
				"COURIER",
				undefined,
				undefined,
				evidence,
				100,
			),
		),
	);
	assert.equal(completed.filter((row) => row.status === "fulfilled").length, 1);
	assert.equal(
		await prisma.deliveryProof.count({ where: { shipmentId: shipment.id } }),
		1,
	);
	const collection = await prisma.cashCollection.findUniqueOrThrow({
		where: { shipmentId: shipment.id },
	});
	assert.equal(collection.amount.toString(), "100");
	assert.equal(collection.fee.toString(), "1");
	assert.equal(collection.payable.toString(), "99");
	const tracking = await ShipmentService.trackShipment(shipment.trackingId);
	for (const key of [
		"receiverPhone",
		"receiverAddress",
		"deliveryProof",
		"collection",
		"pickupAddress",
	])
		assert.equal(key in tracking, false);
});

test("COD receipt and manual payout have ordered transitions and no duplicate cash action", async () => {
	const f = await fixtures();
	const business = await approveBusiness(f);
	const shipment = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		codAmount: 100,
		declaredValue: 100,
		quotedCodFee: 1,
	});
	shipmentIds.push(shipment.id);
	await prepareDelivery(f, shipment.id);
	await ShipmentService.updateShipmentStatus(
		shipment.id,
		"DELIVERED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		undefined,
		evidence,
		100,
	);
	const collection = await prisma.cashCollection.findUniqueOrThrow({
		where: { shipmentId: shipment.id },
	});
	await assert.rejects(() =>
		OperationsService.settle(
			collection.id,
			{ action: "PAY", reference: "OUTSIDE-TRANSFER-" + randomUUID() },
			actor(f.admin),
		),
	);
	await OperationsService.settle(
		collection.id,
		{ action: "RECEIVE", reference: "CASH-RECEIPT-" + randomUUID() },
		actor(f.admin),
	);
	await OperationsService.business(businessInput, actor(f.sender));
	await assert.rejects(() =>
		OperationsService.settle(
			collection.id,
			{ action: "PAY", reference: "OUTSIDE-TRANSFER-" + randomUUID() },
			actor(f.admin),
		),
	);
	await OperationsService.review(
		"business",
		business.id,
		{ approved: true, note: "Verified account again" },
		actor(f.admin),
	);
	const reference = "OUTSIDE-TRANSFER-" + randomUUID();
	const accountVersion = (
		await prisma.businessAccount.findUniqueOrThrow({
			where: { id: business.id },
		})
	).updatedAt.toISOString();
	const result = await Promise.allSettled(
		[1, 2].map(() =>
			OperationsService.settle(
				collection.id,
				{ action: "PAY", reference, accountVersion },
				actor(f.admin),
			),
		),
	);
	assert.equal(result.filter((row) => row.status === "fulfilled").length, 1);
	const mine = await OperationsService.mine(actor(f.sender));
	assert.equal(mine.collections[0].status, "PAID");
	assert.equal(mine.totals.pending, "0");
	assert.equal(mine.totals.paid, "99");
});

test("failed deliveries require a reason, can retry, and return is terminal", async () => {
	const f = await fixtures();
	await prepareDelivery(f);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			f.shipment.id,
			"DELIVERY_FAILED",
			f.couriers[0].id,
			"COURIER",
		),
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"DELIVERY_FAILED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		"Receiver unavailable",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"OUT_FOR_DELIVERY",
		f.couriers[0].id,
		"COURIER",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"DELIVERY_FAILED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		"Receiver declined parcel",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"RETURNED",
		f.couriers[0].id,
		"COURIER",
		undefined,
		"Returned to sender",
	);
	await assert.rejects(() =>
		ShipmentService.updateShipmentStatus(
			f.shipment.id,
			"OUT_FOR_DELIVERY",
			f.couriers[0].id,
			"COURIER",
		),
	);
});

test("hub handover checks hub, worker load, and removes former worker access", async () => {
	const f = await fixtures();
	await ShipmentService.assignCourier(
		f.shipment.id,
		f.couriers[0].id,
		f.admin.id,
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"PICKED_UP",
		f.couriers[0].id,
		"COURIER",
	);
	await ShipmentService.updateShipmentStatus(
		f.shipment.id,
		"AT_ORIGIN_HUB",
		f.couriers[0].id,
		"COURIER",
	);
	await prisma.courier.update({
		where: { userId: f.couriers[1].id },
		data: { currentHubId: f.destination.id },
	});
	await assert.rejects(() =>
		ShipmentService.handoffCourier(f.shipment.id, f.couriers[1].id, f.admin.id),
	);
	await prisma.courier.update({
		where: { userId: f.couriers[1].id },
		data: { currentHubId: f.hub.id },
	});
	await ShipmentService.handoffCourier(
		f.shipment.id,
		f.couriers[1].id,
		f.admin.id,
	);
	await assert.rejects(
		() =>
			ShipmentService.getSingleShipment(f.shipment.id, actor(f.couriers[0])),
		(e: any) => e.statusCode === 403,
	);
	assert.equal(
		(
			await ShipmentService.getSingleShipment(
				f.shipment.id,
				actor(f.couriers[1]),
			)
		).courierId,
		f.couriers[1].id,
	);
	assert.equal(
		(
			await ShipmentService.getAllShipments(
				{ task: "PICKUP" },
				actor(f.couriers[0]),
			)
		).data.length,
		0,
	);
});

test("branch-only coverage rejects home pickup and permits an approved dropoff booking", async () => {
	const f = await fixtures();
	await prisma.serviceArea.update({
		where: { id: f.pickup.id },
		data: { pickupEnabled: false, dropoffEnabled: true },
	});
	const input = {
		pickupAreaId: f.pickup.id,
		receiverAreaId: f.receiver.id,
		weight: 1,
		codAmount: 0,
		serviceType: "STANDARD",
		pickupMode: "HOME",
	};
	await assert.rejects(() => OperationsService.quote(input));
	const quote = await OperationsService.quote({
		...input,
		pickupMode: "BRANCH",
	});
	assert.equal(quote.deliveryCharge, "120");
	const saved = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		pickupMode: "BRANCH",
		quoteVersion: quote.rateUpdatedAt.toISOString(),
	});
	shipmentIds.push(saved.id);
	assert.equal(saved.pickupMode, "BRANCH");
});
test("same-day fallback is shown before booking and cannot silently change the accepted service", async () => {
	const f = await fixtures();
	for (const serviceType of ["SAME_DAY", "NEXT_DAY"]) {
		const rate = await prisma.ratePlan.create({
			data: {
				pickupAreaId: f.pickup.id,
				receiverAreaId: f.receiver.id,
				serviceType,
				baseWeight: 1,
				baseCharge: 120,
				extraPerKg: 20,
				pickupFee: 0,
				codPercent: 1,
				deliveryDays: serviceType === "SAME_DAY" ? 0 : 1,
				cutoffMinutes: serviceType === "SAME_DAY" ? 720 : null,
				active: true,
			},
		});
		rateIds.push(rate.id);
	}
	const quote = await OperationsService.quote({
		pickupAreaId: f.pickup.id,
		receiverAreaId: f.receiver.id,
		weight: 1,
		codAmount: 0,
		serviceType: "SAME_DAY",
		pickupMode: "HOME",
		requestedPickupAt: f.input.requestedPickupAt,
	});
	assert.equal(quote.serviceType, "NEXT_DAY");
	assert.equal(quote.deliveryDays, 1);
	await assert.rejects(() =>
		ShipmentService.createShipment(f.sender.id, {
			...f.input,
			requestId: randomUUID(),
			serviceType: "SAME_DAY",
			quotedServiceType: "SAME_DAY",
			quoteVersion: quote.rateUpdatedAt.toISOString(),
		}),
	);
	const saved = await ShipmentService.createShipment(f.sender.id, {
		...f.input,
		requestId: randomUUID(),
		serviceType: "SAME_DAY",
		quotedServiceType: "NEXT_DAY",
		quoteVersion: quote.rateUpdatedAt.toISOString(),
	});
	shipmentIds.push(saved.id);
	assert.equal(saved.serviceType, "NEXT_DAY");
});

test("task filters separate urgent, late, failed and pickup work", async () => {
	const f = await fixtures();
	await ShipmentService.assignCourier(
		f.shipment.id,
		f.couriers[0].id,
		f.admin.id,
	);
	await prisma.shipment.update({
		where: { id: f.shipment.id },
		data: {
			serviceType: "EXPRESS",
			estimatedDelivery: new Date(Date.now() - 86400000),
		},
	});
	for (const task of ["URGENT", "LATE", "PICKUP"])
		assert.equal(
			(await ShipmentService.getAllShipments({ task }, actor(f.couriers[0])))
				.data.length,
			1,
		);
	assert.equal(
		(
			await ShipmentService.getAllShipments(
				{ task: "FAILED" },
				actor(f.couriers[0]),
			)
		).data.length,
		0,
	);
});
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\security.test.ts

```ts
import "./environment";
import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { mock } from "node:test";
import jwt from "jsonwebtoken";
import { Prisma, Role, ShipmentStatus } from "@prisma/client";
import type { Request, Response } from "express";
import auth from "../src/app/middlewares/auth";
import validateRequest from "../src/app/middlewares/validateRequest";
import { csrfProtection } from "../src/app/middlewares/csrf";
import { prisma } from "../src/app/utils/prisma";
import { redisClient } from "../src/app/utils/redis";
import { listQuerySchema } from "../src/app/utils/query";
import { buildSessionTokens, rotateSession, safeUser } from "../src/app/utils/session";
import { UserValidation } from "../src/app/modules/user/user.validation";
import { ShipmentValidation } from "../src/app/modules/shipment/shipment.validation";
import { ALLOWED_TRANSITIONS, ACTIVE_SHIPMENT_STATUSES, nextShipmentStatuses } from "../src/app/modules/shipment/shipment.rules";
import { assertBkashPayment, assertStripePayment } from "../src/app/modules/payment/payment.gateway";
import { AuthService } from "../src/app/modules/auth/auth.service";
import { stripeWebhook } from "../src/app/modules/payment/payment.webhook";

const originalFindUser = prisma.user.findUnique;
afterEach(() => { mock.restoreAll(); prisma.user.findUnique = originalFindUser; });
const user = {
  id: "11111111-1111-4111-8111-111111111111", email: "customer@example.test", name: "Customer", role: Role.CUSTOMER,
  status: "ACTIVE", emailVerified: true, isDeleted: false, tokenVersion: 0, password: "secret-hash",
  googleId: "private-google-id", imagePublicId: "private-image-id",
} as any;

test("profile validation rejects role escalation", () => {
  assert.throws(() => UserValidation.UpdateProfileSchema.parse({ body: { name: "Customer", role: "ADMIN" } }));
});

test("shipment input cannot inject sender, price, status or nested writes", () => {
  assert.throws(() => ShipmentValidation.CreateShipmentSchema.parse({ body: {
    receiverName: "Receiver", receiverPhone: "01712345678", receiverAddress: "Dhaka address", weight: 1,
    senderId: "someone-else", price: 0, status: "DELIVERED", payment: { create: { status: "PAID" } },
  } }));
});

test("request validation replaces untrusted input with parsed output", async () => {
  const { z } = await import("zod");
  const req = { body: { name: "Customer", role: "ADMIN" } } as Request;
  let error: unknown;
  await validateRequest(z.object({ body: z.object({ name: z.string() }) }))(req, {} as Response, value => { error = value; });
  assert.equal(error, undefined);
  assert.deepEqual(req.body, { name: "Customer" });
});

test("current database role defeats a stale administrator token", async () => {
  prisma.user.findUnique = (async () => user) as typeof prisma.user.findUnique;
  mock.method(redisClient, "exists", async () => 1);
  const token = jwt.sign({ userId: user.id, role: "ADMIN", sessionId: "session", tokenVersion: 0 }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
  let error: any;
  await auth("ADMIN")({ cookies: { accessToken: token }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 403);
});

test("password reset version rejects old access tokens", async () => {
  prisma.user.findUnique = (async () => ({ ...user, tokenVersion: 1 })) as typeof prisma.user.findUnique;
  const token = buildSessionTokens(user).accessToken;
  let error: any;
  await auth("CUSTOMER")({ cookies: { accessToken: token }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 401);
});

test("an expired token returns an authentication error", async () => {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -1 });
  let error: any;
  await auth("CUSTOMER")({ cookies: { accessToken: token }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.name, "TokenExpiredError");
});

test("refresh tokens rotate atomically and a replay is rejected", async () => {
  let used = false;
  mock.method(redisClient, "eval", async () => { if (used) return 0; used = true; return 1; });
  const tokens = buildSessionTokens(user);
  const result = await rotateSession(user, tokens.refreshToken, tokens.sessionId);
  assert.notEqual(result.refreshToken, tokens.refreshToken);
  await assert.rejects(() => rotateSession(user, tokens.refreshToken, tokens.sessionId), (error: any) => error.statusCode === 401);
});

test("missing refresh cookies cannot create a session", async () => {
  await assert.rejects(() => AuthService.refreshToken(undefined), (error: any) => error.statusCode === 401);
});

test("safe user output removes authentication and storage secrets", () => {
  const output = safeUser(user) as Record<string, unknown>;
  for (const key of ["password", "tokenVersion", "googleId", "imagePublicId"]) assert.equal(key in output, false);
});

test("cookie writes reject cross-origin requests and missing verification headers", () => {
  const req = { method: "PATCH", headers: { origin: "https://attacker.test" }, cookies: { accessToken: "token" }, get: () => undefined } as unknown as Request;
  let error: any;
  csrfProtection(req, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 403);
  req.headers.origin = "http://localhost:3000";
  csrfProtection(req, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 403);
});

test("pagination rejects unbounded and invalid values", () => {
  for (const query of [{ limit: 100000 }, { page: -1 }, { page: "abc" }, { sortOrder: "sideways" }]) assert.throws(() => listQuerySchema.parse(query));
  assert.equal(listQuerySchema.parse({}).limit, 10);
});

test("shipment transitions never skip a hub and terminal states cannot change", () => {
  assert.deepEqual(ALLOWED_TRANSITIONS.PICKED_UP, [ShipmentStatus.AT_ORIGIN_HUB]);
  assert.deepEqual(ALLOWED_TRANSITIONS.IN_TRANSIT, [ShipmentStatus.AT_DESTINATION_HUB]);
  for (const status of ["DELIVERED", "RETURNED", "CANCELLED"] as ShipmentStatus[]) assert.deepEqual(ALLOWED_TRANSITIONS[status], []);
  assert.equal(nextShipmentStatuses(ShipmentStatus.ASSIGNED, "COURIER").includes(ShipmentStatus.CANCELLED), false);
  assert.equal(ACTIVE_SHIPMENT_STATUSES.includes(ShipmentStatus.IN_TRANSIT), true);
});

const expected = { transactionId: "provider-session", amount: new Prisma.Decimal("120.00"), currency: "BDT", paymentId: "payment" };
const bkash = { statusCode: "0000", transactionStatus: "Completed", paymentID: "provider-session", currency: "BDT", trxID: "verified-transaction", amount: "120.00" };

test("bKash rejects incomplete success, wrong amount, currency and transaction", () => {
  assert.doesNotThrow(() => assertBkashPayment(bkash, expected));
  for (const change of [{ statusCode: undefined }, { amount: "1" }, { currency: "USD" }, { paymentID: "other" }, { transactionStatus: "Pending" }, { trxID: "" }]) {
    assert.throws(() => assertBkashPayment({ ...bkash, ...change }, expected));
  }
});

test("Stripe requires paid status, matching metadata, amount and currency", () => {
  const session = { id: "provider-session", metadata: { shipmentId: "shipment", attemptId: "attempt" }, mode: "payment", payment_status: "paid", currency: "bdt", amount_total: 12000 } as any;
  assert.doesNotThrow(() => assertStripePayment(session, expected, "shipment", "attempt"));
  for (const change of [{ payment_status: "unpaid" }, { amount_total: 1 }, { currency: "usd" }, { metadata: { shipmentId: "other", attemptId: "attempt" } }]) {
    assert.throws(() => assertStripePayment({ ...session, ...change }, expected, "shipment", "attempt"));
  }
});

test("unsigned Stripe webhooks never reach payment confirmation", async () => {
  let error: any;
  await stripeWebhook({ get: () => undefined, body: Buffer.from("{}") } as unknown as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 400);
});

test("logout revokes its session and the old access token is rejected", async () => {
  const tokens = buildSessionTokens(user);
  let revokedKey = "";
  mock.method(redisClient, "del", async (key: string) => { revokedKey = key; return 1; });
  await AuthService.logoutUser(tokens.refreshToken);
  assert.equal(revokedKey, "session:" + tokens.sessionId);
  prisma.user.findUnique = (async () => user) as typeof prisma.user.findUnique;
  mock.method(redisClient, "exists", async () => 0);
  let error: any;
  await auth("CUSTOMER")({ cookies: { accessToken: tokens.accessToken }, headers: {} } as Request, {} as Response, value => { error = value; });
  assert.equal(error?.statusCode, 401);
});
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node10",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tsup.config.ts

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
});
```

নথির সমাপ্তি।


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\staging-integration.mjs

```javascript
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
const stagingUrl = process.env.STAGING_DATABASE_URL;
const redisUrl = process.env.INTEGRATION_REDIS_URL;
if (!stagingUrl || !redisUrl)
	throw new Error(
		"STAGING_DATABASE_URL and INTEGRATION_REDIS_URL are required",
	);
const schema = `courier_integration_${randomUUID().replaceAll("-", "")}_test`;
const target = new URL(stagingUrl);
target.searchParams.set("schema", schema);
const client = new pg.Client({
	connectionString: stagingUrl,
	connectionTimeoutMillis: 15000,
	query_timeout: 15000,
});
const environment = {
	...process.env,
	DATABASE_URL: target.toString(),
	INTEGRATION_DATABASE_URL: target.toString(),
	INTEGRATION_OWNED_SCHEMA: schema,
	NODE_ENV: "test",
};
let ownedOid;
let connected = false;
let failed = false;
function run(task, args) {
	const result = spawnSync(process.execPath, args, {
		cwd: root,
		env: environment,
		encoding: "utf8",
		timeout: task === "integration_tests" ? 900000 : 300000,
		windowsHide: true,
	});
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	const summary = {
		task,
		exitCode: result.status,
		errorCode: result.error?.code,
		prismaErrorCodes: [...new Set(output.match(/\bP\d{4}\b/g) ?? [])],
	};
	if (task === "integration_tests") {
		summary.results = output
			.split(/\r?\n/)
			.filter((line) =>
				/^(?:ok \d+ - |not ok \d+ - |# (?:tests|pass|fail|cancelled|skipped|duration_ms) )/.test(
					line,
				),
			);
		let safeOutput = output;
		for (const [key, value] of Object.entries(process.env)) {
			if (
				value &&
				value.length > 3 &&
				/SECRET|PASSWORD|URL|KEY|EMAIL|TOKEN/.test(key)
			)
				safeOutput = safeOutput.replaceAll(value, "[REDACTED]");
		}
		safeOutput = safeOutput.replace(
			/(?:https?|postgres(?:ql)?|rediss?):\/\/\S+/g,
			"[REDACTED_URL]",
		);
		const lines = safeOutput.split(/\r?\n/);
		summary.diagnostics = [];
		for (let index = 0; index < lines.length; index++) {
			if (/^\s+error:/.test(lines[index])) {
				summary.diagnostics.push(
					...lines
						.slice(index, index + 22)
						.filter((line) => !/^\s*(?:stack:|at )/.test(line)),
				);
			}
		}
		summary.diagnostics = summary.diagnostics.slice(0, 60);
	} else {
		summary.migrationsApplied = output.includes(
			"All migrations have been successfully applied",
		);
	}
	console.log(JSON.stringify(summary));
	if (result.status !== 0) throw new Error(`${task} failed`);
}
try {
	await client.connect();
	connected = true;
	await client.query(`CREATE SCHEMA "${schema}"`);
	const created = await client.query(
		"SELECT oid FROM pg_namespace WHERE nspname = $1",
		[schema],
	);
	ownedOid = created.rows[0]?.oid;
	if (!ownedOid)
		throw new Error("Cannot verify ownership of the temporary schema");
	console.log(
		JSON.stringify({ task: "isolated_staging_schema", created: true }),
	);
	run("isolated_schema_migrations", [
		"node_modules/prisma/build/index.js",
		"migrate",
		"deploy",
	]);
	run("integration_tests", [
		"--import",
		"tsx",
		"--test",
		"--test-reporter=tap",
		"tests/integration/transactions.test.ts",
	]);
} catch (error) {
	failed = true;
	console.log(
		JSON.stringify({
			task: "staging_integration_runner",
			success: false,
			errorCode: error.code ?? error.name,
		}),
	);
} finally {
	if (connected && ownedOid) {
		try {
			const current = await client.query(
				"SELECT oid FROM pg_namespace WHERE nspname = $1",
				[schema],
			);
			if (current.rows[0]?.oid !== ownedOid)
				throw new Error("Temporary schema ownership changed");
			await client.query(`DROP SCHEMA "${schema}" CASCADE`);
			console.log(
				JSON.stringify({ task: "isolated_schema_cleanup", success: true }),
			);
		} catch (error) {
			failed = true;
			console.log(
				JSON.stringify({
					task: "isolated_schema_cleanup",
					success: false,
					errorCode: error.code ?? error.name,
					schema,
				}),
			);
		}
	}
	await client.end().catch(() => undefined);
}
if (failed) process.exitCode = 1;
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\provider-smoke.mjs

```javascript
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { v2 as cloudinary } from "cloudinary";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
const env = process.env;
const runId = randomUUID();
const results = [];
const onlyIndex = process.argv.indexOf("--only");
const selectedProvider = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1];
if (onlyIndex !== -1 && !["stripe", "bkash", "email", "image"].includes(selectedProvider)) throw new Error("--only requires stripe, bkash, email, or image");
async function run(provider, operation) {
  if (selectedProvider && provider !== selectedProvider) return;
  try {
    const result = await operation();
    results.push({ provider, ...result });
  } catch (error) {
    const code = typeof error.code === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(error.code) ? error.code : undefined;
    results.push({ provider, status: "failed", errorType: error.type ?? error.name, code, httpStatus: error.statusCode ?? error.http_code, smtpResponseCode: error.responseCode });
  }
  console.log(JSON.stringify(results.at(-1)));
}

await run("stripe", async () => {
  if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return { status: "blocked", reason: "test_key_required" };
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 0 });
  const balance = await stripe.balance.retrieve();
  assert.equal(balance.livemode, false);
  const payment = await stripe.paymentIntents.create({
    amount: 12000, currency: "bdt", payment_method: "pm_card_visa", automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    confirm: true, metadata: { purpose: "courier_provider_smoke", runId }, description: "Courier staging provider smoke test",
  }, { idempotencyKey: `courier-smoke-${runId}` });
  assert.equal(payment.livemode, false);
  assert.equal(payment.status, "succeeded");
  const verified = await stripe.paymentIntents.retrieve(payment.id);
  assert.equal(verified.amount_received, 12000);
  assert.equal(verified.currency, "bdt");
  let signatureCheck = false;
  if (env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) {
    const payload = JSON.stringify({ id: `evt_smoke_${runId}`, object: "event", type: "payment_intent.succeeded", data: { object: verified } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
    const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    signatureCheck = event.data.object.id === payment.id;
  }
  return { status: "passed", scope: "direct_provider_api", paymentId: payment.id, currency: "BDT", amount: "120.00", retrievedStatus: verified.status, localSignatureCheck: signatureCheck, externalWebhookDelivery: "not_tested", applicationCheckoutSettlement: "not_tested" };
});

await run("bkash", async () => {
  if (!env.BKASH_BASE_URL || new URL(env.BKASH_BASE_URL).hostname !== "tokenized.sandbox.bka.sh") return { status: "blocked", reason: "sandbox_url_required" };
  const base = env.BKASH_BASE_URL.replace(/\/$/, "");
  async function request(route, body, token) {
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) { headers.Authorization = token; headers["X-App-Key"] = env.BKASH_APP_KEY; }
    else { headers.username = env.BKASH_USERNAME; headers.password = env.BKASH_PASSWORD; }
    const response = await fetch(`${base}/tokenized/checkout/${route}`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!response.ok) { const error = new Error("bKash HTTP error"); error.statusCode = response.status; throw error; }
    return response.json();
  }
  const grant = await request("token/grant", { app_key: env.BKASH_APP_KEY, app_secret: env.BKASH_APP_SECRET });
  if (grant.statusCode !== "0000" || typeof grant.id_token !== "string") return { status: "failed", stage: "authentication", providerCode: grant.statusCode };
  if (!env.BKASH_CALLBACK_URL) return { status: "blocked", stage: "create", reason: "callback_required" };
  const payment = await request("create", { mode: "0011", payerReference: `courier-smoke-${runId}`, callbackURL: env.BKASH_CALLBACK_URL, amount: "120.00", currency: "BDT", intent: "sale", merchantInvoiceNumber: runId }, grant.id_token);
  if (payment.statusCode !== "0000" || typeof payment.paymentID !== "string") return { status: "failed", stage: "create", providerCode: payment.statusCode };
  const state = await request("payment/status", { paymentID: payment.paymentID }, grant.id_token);
  return { status: "incomplete", stage: "customer_authorization_required", authentication: "passed", create: "passed", paymentId: payment.paymentID, transactionStatus: state.transactionStatus, providerCode: state.statusCode, callbackLocal: ["localhost", "127.0.0.1"].includes(new URL(env.BKASH_CALLBACK_URL).hostname), execution: "not_tested" };
});

await run("email", async () => {
  if (!env.EMAIL_SENDER || !env.SMTP_PASSWORD) return { status: "blocked", reason: "sender_and_password_required" };
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: env.EMAIL_SENDER, pass: env.SMTP_PASSWORD }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 });
  try {
    await transport.verify();
    const sent = await transport.sendMail({ from: env.EMAIL_SENDER, to: env.EMAIL_SENDER, subject: "Courier staging email test", text: `এটি কুরিয়ার প্রকল্পের পরীক্ষামূলক ইমেইল। পরীক্ষার পরিচয়: ${runId}`, html: `<p>এটি কুরিয়ার প্রকল্পের পরীক্ষামূলক ইমেইল।</p><p>পরীক্ষার পরিচয়: ${runId}</p>` });
    assert.equal(sent.accepted.length, 1);
    assert.equal(sent.rejected.length, 0);
    return { status: "passed", scope: "smtp_acceptance", authentication: "passed", acceptedRecipients: sent.accepted.length, rejectedRecipients: sent.rejected.length, recipient: "EMAIL_SENDER", inboxDelivery: "requires_recipient_confirmation", runId };
  } finally { transport.close(); }
});

await run("image", async () => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return { status: "blocked", reason: "cloudinary_credentials_required" };
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
  const publicId = `courier-provider-tests/${runId}`;
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNoYGj4DwAEBAIAgyQ7+wAAAABJRU5ErkJggg==";
  let uploaded;
  let result;
  try {
    uploaded = await cloudinary.uploader.upload(`data:image/png;base64,${png}`, { public_id: publicId, overwrite: false, resource_type: "image", allowed_formats: ["jpg", "png", "webp"], transformation: [{ width: 512, height: 512, crop: "limit" }], timeout: 20000 });
    assert.equal(uploaded.public_id, publicId);
    assert.ok(uploaded.secure_url.startsWith("https://"));
    const response = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type")?.startsWith("image/"));
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.length > 8);
    assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
    result = { status: "passed", scope: "signed_provider_upload_and_download", format: uploaded.format, width: uploaded.width, height: uploaded.height, downloadedBytes: bytes.length, applicationProfilePersistence: "not_tested" };
  } finally {
    if (uploaded) {
      const cleanup = await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true, timeout: 20000 });
      assert.equal(cleanup.result, "ok");
      console.log(JSON.stringify({ provider: "image_cleanup", status: "passed", removedOnlyRunFixture: true }));
    }
  }
  return result;
});

console.log(JSON.stringify({ task: "provider_smoke_summary", passed: results.filter(result => result.status === "passed").length, incomplete: results.filter(result => result.status === "incomplete").length, failed: results.filter(result => result.status === "failed").length, blocked: results.filter(result => result.status === "blocked").length }));
if (results.some(result => result.status !== "passed")) process.exitCode = 1;
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\database-config.test.ts

```ts
import "./environment";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function configuration(overrides: Record<string, string>) {
	return spawnSync(
		process.execPath,
		[
			"--import",
			"tsx",
			"--eval",
			"try { const config = require('./src/app/config').default; console.log(JSON.stringify({ maxWait: config.prisma_transaction_max_wait_ms, timeout: config.prisma_transaction_timeout_ms })); } catch { process.exitCode = 1; }",
		],
		{
			cwd: process.cwd(),
			env: { ...process.env, ...overrides },
			encoding: "utf8",
			timeout: 15000,
			windowsHide: true,
		},
	);
}

test("database transaction limits accept bounded explicit configuration", () => {
	const result = configuration({
		PRISMA_TRANSACTION_MAX_WAIT_MS: "10000",
		PRISMA_TRANSACTION_TIMEOUT_MS: "20000",
	});
	assert.equal(result.status, 0);
	assert.deepEqual(JSON.parse(result.stdout.trim()), {
		maxWait: 10000,
		timeout: 20000,
	});
});

test("database transaction timeout rejects zero", () => {
	assert.equal(configuration({ PRISMA_TRANSACTION_TIMEOUT_MS: "0" }).status, 1);
});

test("database transaction timeout rejects excessive lock duration", () => {
	assert.equal(
		configuration({ PRISMA_TRANSACTION_TIMEOUT_MS: "60001" }).status,
		1,
	);
});

test("database transaction acquisition wait rejects excessive duration", () => {
	assert.equal(
		configuration({ PRISMA_TRANSACTION_MAX_WAIT_MS: "30001" }).status,
		1,
	);
});

test("SMTP send deadlines accept a bounded value", () => {
	assert.equal(configuration({ SMTP_SEND_TIMEOUT_MS: "25000" }).status, 0);
});

test("SMTP send deadlines reject zero and excessive duration", () => {
	for (const value of ["0", "60001", "invalid"])
		assert.equal(configuration({ SMTP_SEND_TIMEOUT_MS: value }).status, 1);
});
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\integration-guard.test.ts

```ts
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const schema = "courier_integration_0123456789abcdef0123456789abcdef_test";
function guard(databaseUrl: string, ownedSchema = "") {
  return spawnSync(process.execPath, ["--import", "tsx", "--eval", "try { require('./tests/integration/environment'); } catch { process.exitCode = 1; }"], {
    env: { ...process.env, INTEGRATION_DATABASE_URL: databaseUrl, INTEGRATION_OWNED_SCHEMA: ownedSchema, INTEGRATION_REDIS_URL: "redis://127.0.0.1:6379/15" },
    cwd: process.cwd(), encoding: "utf8", timeout: 15000, windowsHide: true,
  }).status;
}

test("integration guard rejects a shared public schema", () => {
  assert.equal(guard("postgresql://test:test@localhost:5432/courier?schema=public", "public"), 1);
});

test("integration guard rejects a staging schema without runner ownership", () => {
  assert.equal(guard(`postgresql://test:test@localhost:5432/courier?schema=${schema}`), 1);
});

test("integration guard accepts the exact runner-owned isolated schema", () => {
  assert.equal(guard(`postgresql://test:test@localhost:5432/courier?schema=${schema}`, schema), 0);
});

test("integration guard retains dedicated test database support", () => {
  assert.equal(guard("postgresql://test:test@localhost:5432/courier_test"), 0);
});
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\row-locks.test.ts

```ts
import "./environment";
import assert from "node:assert/strict";
import { test } from "node:test";
import { rowLockQuery } from "../src/app/utils/rowLocks";

test("row locks qualify the configured schema and bind record identifiers", () => {
  const query = rowLockQuery("shipments", "id", "record-id", "isolated_test");
  assert.equal(query.sql, 'SELECT "id" FROM "isolated_test"."shipments" WHERE "id" = ? FOR UPDATE');
  assert.deepEqual(query.values, ["record-id"]);
});

test("row locks escape schema identifiers without interpolating user values", () => {
  const query = rowLockQuery("couriers", "userId", "'; DROP TABLE users; --", 'tenant"schema');
  assert.equal(query.sql, 'SELECT "id" FROM "tenant""schema"."couriers" WHERE "userId" = ? FOR UPDATE');
  assert.deepEqual(query.values, ["'; DROP TABLE users; --"]);
});
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\utils\rowLocks.ts

```ts
import { Prisma } from "@prisma/client";
import config from "../config";

const schema = new URL(config.database_url).searchParams.get("schema") ?? "public";
export function rowLockQuery(table: "shipments" | "couriers", column: "id" | "userId", id: string, databaseSchema = schema) {
  const qualifiedTable = Prisma.raw(`"${databaseSchema.replace(/"/g, '""')}"."${table}"`);
  const field = Prisma.raw(`"${column}"`);
  return Prisma.sql`SELECT "id" FROM ${qualifiedTable} WHERE ${field} = ${id} FOR UPDATE`;
}

export const lockShipment = (tx: Prisma.TransactionClient, id: string) => tx.$queryRaw(rowLockQuery("shipments", "id", id));
export const lockCourier = (tx: Prisma.TransactionClient, userId: string) => tx.$queryRaw(rowLockQuery("couriers", "userId", userId));
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\bkash-interactive.mjs

```javascript
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
const env = process.env;
if (!env.BKASH_BASE_URL || new URL(env.BKASH_BASE_URL).hostname !== "tokenized.sandbox.bka.sh") throw new Error("Only bKash sandbox is allowed");
const callback = new URL(env.BKASH_CALLBACK_URL);
if (callback.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(callback.hostname)) throw new Error("Interactive testing requires a local HTTP callback");
const state = randomUUID();
callback.searchParams.set("state", state);
let token;
let paymentId;
let handling = false;
let timer;
async function request(route, body, grant = false) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (grant) { headers.username = env.BKASH_USERNAME; headers.password = env.BKASH_PASSWORD; }
  else { headers.Authorization = token; headers["X-App-Key"] = env.BKASH_APP_KEY; }
  const response = await fetch(`${env.BKASH_BASE_URL.replace(/\/$/, "")}/tokenized/checkout/${route}`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) { const error = new Error("bKash request failed"); error.statusCode = response.status; throw error; }
  return response.json();
}
function reply(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(text);
}
function stop(success) {
  clearTimeout(timer);
  process.exitCode = success ? 0 : 1;
  server.close();
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (req.method !== "GET" || url.pathname !== callback.pathname || url.searchParams.get("state") !== state || url.searchParams.get("paymentID") !== paymentId) return reply(res, 404, "পরীক্ষার ঠিকানাটি সঠিক নয়।");
  if (handling) return reply(res, 409, "এই লেনদেনটি যাচাই করা হচ্ছে।");
  handling = true;
  const callbackStatus = url.searchParams.get("status");
  console.log(JSON.stringify({ provider: "bkash", stage: "callback", status: ["success", "failure", "cancel"].includes(callbackStatus) ? callbackStatus : "unknown" }));
  try {
    let result;
    if (url.searchParams.get("status") === "success") {
      try { result = await request("execute", { paymentID: paymentId }); }
      catch { result = await request("payment/status", { paymentID: paymentId }); }
      console.log(JSON.stringify({ provider: "bkash", stage: "execute_response", providerCode: result.statusCode, transactionStatus: result.transactionStatus }));
    } else { result = await request("payment/status", { paymentID: paymentId }); }
    if (result.transactionStatus !== "Completed") result = await request("payment/status", { paymentID: paymentId });
    if (result.transactionStatus === "Completed") {
      const verified = await request("payment/status", { paymentID: paymentId });
      assert.equal(verified.statusCode, "0000");
      assert.equal(verified.paymentID, paymentId);
      assert.equal(verified.transactionStatus, "Completed");
      assert.equal(verified.currency, "BDT");
      assert.equal(Number(verified.amount), 120);
      assert.ok(typeof verified.trxID === "string" && verified.trxID.length > 0);
      console.log(JSON.stringify({ provider: "bkash", status: "passed", scope: "direct_sandbox_provider", paymentId, transactionId: verified.trxID, amount: "120.00", currency: "BDT", retrievedStatus: verified.transactionStatus, applicationSettlement: "not_tested" }));
      reply(res, 200, "বিকাশের ১২০ টাকার পরীক্ষামূলক লেনদেন সফল হয়েছে। প্রদানকারীর কাছ থেকে পরিমাণ, মুদ্রা ও লেনদেনের পরিচয় আবার যাচাই করা হয়েছে। কোনো প্রকৃত অর্থপ্রদান করা হয়নি।");
      stop(true);
    } else {
      console.log(JSON.stringify({ provider: "bkash", status: "incomplete", paymentId, providerCode: result.statusCode, transactionStatus: result.transactionStatus }));
      reply(res, 409, "লেনদেনটি এখনো সফল বলে যাচাই হয়নি। কডেক্সে ফিরে পরীক্ষার অবস্থা জানান।");
      if (["Cancelled", "Failed"].includes(result.transactionStatus)) stop(false);
    }
  } catch (error) {
    console.log(JSON.stringify({ provider: "bkash", status: "failed", errorType: error.name, httpStatus: error.statusCode }));
    reply(res, 502, "পরীক্ষামূলক লেনদেনের যাচাইয়ে সমস্যা হয়েছে। কডেক্সে ফিরে জানান।");
  } finally { handling = false; }
});
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(Number(callback.port || 80), "127.0.0.1", resolve); });
  const grant = await request("token/grant", { app_key: env.BKASH_APP_KEY, app_secret: env.BKASH_APP_SECRET }, true);
  assert.equal(grant.statusCode, "0000");
  assert.ok(typeof grant.id_token === "string");
  token = grant.id_token;
  const created = await request("create", { mode: "0011", payerReference: `courier-interactive-${state}`, callbackURL: callback.toString(), amount: "120.00", currency: "BDT", intent: "sale", merchantInvoiceNumber: state });
  assert.equal(created.statusCode, "0000");
  assert.ok(typeof created.paymentID === "string");
  const checkout = new URL(created.bkashURL);
  assert.equal(checkout.protocol, "https:");
  assert.ok(checkout.hostname.endsWith(".bka.sh") || checkout.hostname.endsWith(".bkash.com"));
  paymentId = created.paymentID;
  console.log(JSON.stringify({ task: "bkash_interactive_checkout", paymentId, checkoutUrl: created.bkashURL, expiresInMinutes: 10 }));
  timer = setTimeout(() => {
    console.log(JSON.stringify({ provider: "bkash", status: "incomplete", paymentId, reason: "customer_authorization_timeout" }));
    stop(false);
  }, 600000);
} catch (error) {
  console.log(JSON.stringify({ provider: "bkash", status: "failed", errorType: error.name, code: error.code, httpStatus: error.statusCode }));
  stop(false);
}
process.once("SIGINT", () => stop(false));
process.once("SIGTERM", () => stop(false));
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\recovery-guard.mjs

```javascript
export function assertOwnedRecoverySchema(schema, expectedOid, currentOid) {
	if (!/^courier_recovery_[a-f0-9]{32}_test$/.test(schema))
		throw new Error("Recovery requires a runner-owned schema");
	if (
		!Number.isInteger(expectedOid) ||
		expectedOid <= 0 ||
		currentOid !== expectedOid
	)
		throw new Error("Recovery schema ownership changed");
}
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\staging-recovery.mjs

```javascript
import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { assertOwnedRecoverySchema } from "./recovery-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
if (!process.env.STAGING_DATABASE_URL)
	throw new Error("Explicit STAGING_DATABASE_URL is required");
const runId = randomUUID();
const schema = `courier_recovery_${runId.replaceAll("-", "")}_test`;
const target = new URL(process.env.STAGING_DATABASE_URL);
target.searchParams.set("schema", schema);
const nativeUrl = new URL(process.env.STAGING_DATABASE_URL);
for (const key of ["schema", "connection_limit", "pool_timeout", "pgbouncer"])
	nativeUrl.searchParams.delete(key);
const databaseName = decodeURIComponent(nativeUrl.pathname.slice(1));
if (!databaseName || !["postgres:", "postgresql:"].includes(nativeUrl.protocol))
	throw new Error("Invalid staging database target");
const environment = {
	...process.env,
	DATABASE_URL: target.toString(),
	PGDATABASE: databaseName,
	PGHOST: nativeUrl.hostname,
	PGPORT: nativeUrl.port || "5432",
	PGUSER: decodeURIComponent(nativeUrl.username),
	PGPASSWORD: decodeURIComponent(nativeUrl.password),
	PGSSLMODE:
		nativeUrl.searchParams.get("sslmode") || process.env.PGSSLMODE || "prefer",
	PGCHANNELBINDING: nativeUrl.searchParams.get("channel_binding") || "prefer",
	PGCONNECT_TIMEOUT: "15",
};
const client = new pg.Client({
	connectionString: process.env.STAGING_DATABASE_URL,
	connectionTimeoutMillis: 15000,
	query_timeout: 20000,
});
let ownedOid;
let archive;
let directory;
let failed = false;
let restoreStarted = false;
const started = Date.now();

function run(task, binary, args) {
	const result = spawnSync(binary, args, {
		cwd: root,
		env: environment,
		encoding: "utf8",
		timeout: 180000,
		windowsHide: true,
	});
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	console.log(
		JSON.stringify({
			task,
			exitCode: result.status,
			errorCode: result.error?.code,
			prismaErrorCodes: [...new Set(output.match(/\bP\d{4}\b/g) ?? [])],
			databaseErrorCodes: [
				...new Set(
					[
						...output.matchAll(
							/(?:Database error code|SQLSTATE):\s*([A-Z0-9]{5})/g,
						),
					].map((match) => match[1]),
				),
			],
			migrationNames: [
				...new Set(
					[...output.matchAll(/Migration name:\s*([a-z0-9_]+)/g)].map(
						(match) => match[1],
					),
				),
			],
		}),
	);
	if (result.status !== 0) throw new Error(`${task} failed`);
}
async function oid() {
	return (
		await client.query("SELECT oid FROM pg_namespace WHERE nspname = $1", [
			schema,
		])
	).rows[0]?.oid;
}
async function snapshot() {
	await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
	try {
		await client.query("SET LOCAL search_path TO pg_catalog");
		const columns = await client.query(
			"SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 ORDER BY table_name, ordinal_position",
			[schema],
		);
		const indexes = await client.query(
			"SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 ORDER BY indexname",
			[schema],
		);
		const constraints = await client.query(
			"SELECT c.conname, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = $1 ORDER BY c.conname",
			[schema],
		);
		const user = await client.query(
			`SELECT "id", "email", "tokenVersion" FROM "${schema}"."users" WHERE "id" = $1`,
			[runId],
		);
		const shipment = await client.query(
			`SELECT "trackingId", "senderId", "price", "status" FROM "${schema}"."shipments" WHERE "senderId" = $1 ORDER BY "trackingId"`,
			[runId],
		);
		const marker = await client.query(
			`SELECT run_id FROM "${schema}"."recovery_marker"`,
		);
		const result = JSON.stringify({
			columns: columns.rows,
			indexes: indexes.rows,
			constraints: constraints.rows,
			user: user.rows,
			shipment: shipment.rows,
			marker: marker.rows,
		});
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}
try {
	run("pg_dump_available", process.env.PG_DUMP_BIN || "pg_dump", ["--version"]);
	run("pg_restore_available", process.env.PG_RESTORE_BIN || "pg_restore", [
		"--version",
	]);
	await client.connect();
	await client.query(`CREATE SCHEMA "${schema}"`);
	ownedOid = await oid();
	assertOwnedRecoverySchema(schema, ownedOid, ownedOid);
	run("recovery_schema_migrations", process.execPath, [
		"node_modules/prisma/build/index.js",
		"migrate",
		"deploy",
	]);
	await client.query(
		`CREATE TABLE "${schema}"."recovery_marker" (run_id uuid PRIMARY KEY)`,
	);
	await client.query(`INSERT INTO "${schema}"."recovery_marker" VALUES ($1)`, [
		runId,
	]);
	run("recovery_owned_fixture", process.execPath, [
		"--input-type=module",
		"--eval",
		`import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); try { await p.user.create({ data: { id: '${runId}', name: 'Recovery fixture only', email: '${runId}@recovery.test', emailVerified: true, customer: { create: {} }, sentShipments: { create: { trackingId: 'RECOVERY-${runId}', receiverName: 'Recovery fixture', receiverPhone: '00000000000', receiverAddress: 'Recovery fixture only', weight: 1, price: 120 } } } }); } catch { process.exitCode = 1; } finally { await p.$disconnect(); }`,
	]);
	const before = await snapshot();
	directory = await mkdtemp(path.join(os.tmpdir(), "courier-recovery-"));
	archive = path.join(directory, "owned-schema.dump");
	run("owned_schema_backup", process.env.PG_DUMP_BIN || "pg_dump", [
		"--format=custom",
		"--no-owner",
		"--no-acl",
		`--schema=${schema}`,
		`--file=${archive}`,
	]);
	const archiveBytes = await readFile(archive);
	if (!archiveBytes.subarray(0, 5).equals(Buffer.from("PGDMP")))
		throw new Error("Invalid custom archive");
	const digest = createHash("sha256").update(archiveBytes).digest("hex");
	assertOwnedRecoverySchema(schema, ownedOid, await oid());
	restoreStarted = true;
	run("owned_schema_restore", process.env.PG_RESTORE_BIN || "pg_restore", [
		"--dbname",
		databaseName,
		"--clean",
		"--if-exists",
		"--no-owner",
		"--no-acl",
		"--exit-on-error",
		`--schema=${schema}`,
		archive,
	]);
	const marker = await client.query(
		`SELECT run_id FROM "${schema}"."recovery_marker"`,
	);
	if (marker.rows.length !== 1 || marker.rows[0].run_id !== runId)
		throw new Error("Restored ownership marker mismatch");
	ownedOid = await oid();
	assertOwnedRecoverySchema(schema, ownedOid, ownedOid);
	const after = await snapshot();
	if (before !== after) {
		const expected = JSON.parse(before);
		const actual = JSON.parse(after);
		for (const key of Object.keys(expected)) {
			if (JSON.stringify(expected[key]) === JSON.stringify(actual[key]))
				continue;
			const index = expected[key].findIndex(
				(row, position) =>
					JSON.stringify(row) !== JSON.stringify(actual[key][position]),
			);
			console.log(
				JSON.stringify({
					task: "recovery_comparison_mismatch",
					section: key,
					expectedCount: expected[key].length,
					actualCount: actual[key].length,
					index,
					...(["columns", "indexes", "constraints"].includes(key)
						? { expected: expected[key][index], actual: actual[key][index] }
						: {}),
				}),
			);
		}
		throw new Error(
			"Restored schema, indexes, constraints or fixture data mismatch",
		);
	}
	console.log(
		JSON.stringify({
			task: "backup_restore_drill",
			success: true,
			scope: "runner_owned_schema_only",
			archiveBytes: archiveBytes.length,
			archiveSha256: digest,
			elapsedMs: Date.now() - started,
		}),
	);
} catch (error) {
	failed = true;
	console.log(
		JSON.stringify({
			task: "backup_restore_drill",
			success: false,
			errorCode: error.code ?? error.name,
		}),
	);
} finally {
	if (ownedOid) {
		try {
			const currentOid = await oid();
			if (restoreStarted && currentOid !== ownedOid) {
				const marker = await client.query(
					`SELECT run_id FROM "${schema}"."recovery_marker"`,
				);
				if (marker.rows.length !== 1 || marker.rows[0].run_id !== runId)
					throw new Error("Recovery cleanup ownership mismatch");
				ownedOid = currentOid;
			}
			assertOwnedRecoverySchema(schema, ownedOid, currentOid);
			await client.query(`DROP SCHEMA "${schema}" CASCADE`);
			console.log(
				JSON.stringify({ task: "recovery_schema_cleanup", success: true }),
			);
		} catch (error) {
			failed = true;
			console.log(
				JSON.stringify({
					task: "recovery_schema_cleanup",
					success: false,
					errorCode: error.code ?? error.name,
					schema,
				}),
			);
		}
	}
	await client.end().catch(() => undefined);
	if (archive)
		await unlink(archive).catch(() => {
			failed = true;
		});
	if (directory)
		await rmdir(directory).catch(() => {
			failed = true;
		});
}
if (failed) process.exitCode = 1;
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\email.test.ts

```typescript
import "./environment";
import assert from "node:assert/strict";
import { test, afterEach, mock } from "node:test";
import nodemailer from "nodemailer";
import { emailSender } from "../src/app/utils/emailSender";
import config from "../src/app/config";

afterEach(() => mock.restoreAll());

test("email delivery has bounded timeouts and cannot fetch files or URLs", async () => {
	let options: any;
	let message: any;
	let closed = false;
	mock.method(nodemailer, "createTransport", (input: any) => {
		options = input;
		return {
			sendMail: async (value: any) => {
				message = value;
			},
			close: () => {
				closed = true;
			},
		};
	});
	await emailSender("recipient@example.test", "Test", "<p>Test</p>");
	assert.equal(options.socketTimeout, config.smtp_send_timeout_ms);
	for (const field of ["connectionTimeout", "greetingTimeout", "dnsTimeout"])
		assert.equal(options[field], 10000);
	assert.equal(options.requireTLS, true);
	assert.equal(options.disableFileAccess, true);
	assert.equal(options.disableUrlAccess, true);
	assert.equal(message.to, "recipient@example.test");
	assert.equal(closed, true);
});

test("SMTP failures expose a generic service error without provider credentials", async () => {
	let closed = false;
	mock.method(nodemailer, "createTransport", () => ({
		sendMail: async () => {
			throw new Error("private SMTP server diagnostic");
		},
		close: () => {
			closed = true;
		},
	}));
	await assert.rejects(
		() => emailSender("recipient@example.test", "Test", "Test"),
		(error: any) =>
			error.statusCode === 502 &&
			error.message === "Email service is temporarily unavailable",
	);
	assert.equal(closed, true);
});

test("a stalled SMTP send is closed at the total deadline", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	let closed = false;
	mock.method(nodemailer, "createTransport", () => ({
		sendMail: () => new Promise(() => undefined),
		close: () => {
			closed = true;
		},
	}));
	const result = emailSender("recipient@example.test", "Test", "Test");
	t.mock.timers.tick(config.smtp_send_timeout_ms);
	await assert.rejects(result, (error: any) => error.statusCode === 502);
	assert.equal(closed, true);
});
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\recovery-guard.test.ts

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { assertOwnedRecoverySchema } from "../scripts/recovery-guard.mjs";

const owned = "courier_recovery_" + "a".repeat(32) + "_test";
test("recovery only accepts a generated schema with matching ownership", () => {
	assert.doesNotThrow(() => assertOwnedRecoverySchema(owned, 42, 42));
});
test("recovery rejects public, integration, quoted and arbitrary schema names", () => {
	for (const schema of [
		"public",
		"courier_test",
		owned + '"',
		owned.replace("recovery", "integration"),
	]) {
		assert.throws(() => assertOwnedRecoverySchema(schema, 42, 42));
	}
});
test("recovery refuses missing or replaced schema ownership", () => {
	for (const [expected, current] of [
		[0, 0],
		[42, 43],
		[42, undefined],
		[undefined, 42],
	]) {
		assert.throws(() => assertOwnedRecoverySchema(owned, expected, current));
	}
});
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\prisma\migrations\20261009000000_courier_operations\migration.sql

```sql
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
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\operations\operations.route.ts

```typescript
import express from "express";
import { z } from "zod";
import auth from "../../middlewares/auth";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { OperationsService as service } from "./operations.service";
const router = express.Router();
const id = (value: string) => z.string().uuid().parse(value);
const action = (fn: (req: express.Request) => Promise<unknown>) =>
	catchAsync(async (req, res) => {
		const data = await fn(req);
		sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Operation completed",
			data,
		});
	});
router.get(
	"/coverage",
	action(() => service.coverage()),
);
router.post(
	"/quote",
	action((req) => service.quote(req.body)),
);
router.post(
	"/quotes",
	auth("CUSTOMER"),
	action((req) => service.quotes(req.body)),
);
router.get(
	"/mine",
	auth("CUSTOMER", "COURIER"),
	action((req) => service.mine(req.user)),
);
router.put(
	"/business",
	auth("CUSTOMER"),
	action((req) => service.business(req.body, req.user)),
);
router.post(
	"/applications",
	auth("CUSTOMER"),
	action((req) => service.apply(req.body, req.user)),
);
router.get(
	"/admin",
	auth("ADMIN"),
	action(() => service.admin()),
);
router.post(
	"/areas",
	auth("ADMIN"),
	action((req) => service.configure("area", req.body, req.user)),
);
router.patch(
	"/areas/:id",
	auth("ADMIN"),
	action((req) =>
		service.configure("area", req.body, req.user, id(req.params.id)),
	),
);
router.post(
	"/rates",
	auth("ADMIN"),
	action((req) => service.configure("rate", req.body, req.user)),
);
router.patch(
	"/rates/:id",
	auth("ADMIN"),
	action((req) =>
		service.configure("rate", req.body, req.user, id(req.params.id)),
	),
);
router.patch(
	"/business/:id/review",
	auth("ADMIN"),
	action((req) =>
		service.review("business", id(req.params.id), req.body, req.user),
	),
);
router.patch(
	"/applications/:id/review",
	auth("ADMIN"),
	action((req) =>
		service.review("application", id(req.params.id), req.body, req.user),
	),
);
router.patch(
	"/collections/:id",
	auth("ADMIN"),
	action((req) => service.settle(id(req.params.id), req.body, req.user)),
);
export const OperationsRoutes = router;
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\operations\operations.rules.ts

```typescript
import { Prisma } from "@prisma/client";
export function calculateQuote(
	rate: {
		baseWeight: Prisma.Decimal | number;
		baseCharge: Prisma.Decimal | number;
		extraPerKg: Prisma.Decimal | number;
		pickupFee: Prisma.Decimal | number;
		codPercent: Prisma.Decimal | number;
	},
	weight: number,
	codAmount: number,
	pickupMode: string,
) {
	const extraUnits = Prisma.Decimal.max(
		new Prisma.Decimal(weight).minus(rate.baseWeight),
		0,
	).ceil();
	const base = new Prisma.Decimal(rate.baseCharge);
	const extra = extraUnits.mul(rate.extraPerKg);
	const pickup = new Prisma.Decimal(pickupMode === "HOME" ? rate.pickupFee : 0);
	const codFee = new Prisma.Decimal(codAmount)
		.mul(rate.codPercent)
		.div(100)
		.toDecimalPlaces(2);
	return {
		baseCharge: base.toString(),
		extraWeightCharge: extra.toString(),
		pickupFee: pickup.toString(),
		deliveryCharge: base.add(extra).add(pickup).toDecimalPlaces(2).toString(),
		codFee: codFee.toString(),
		merchantPayable: new Prisma.Decimal(codAmount)
			.minus(codFee)
			.toDecimalPlaces(2)
			.toString(),
	};
}

export function collectionAvailable(
	area: { pickupEnabled: boolean; dropoffEnabled: boolean },
	mode: string,
) {
	return mode === "BRANCH" ? area.dropoffEnabled : area.pickupEnabled;
}
export function deliveryServiceAtCutoff(
	serviceType: string,
	cutoffMinutes: number | null,
	now: Date,
	requestedPickupAt?: string,
) {
	if (serviceType !== "SAME_DAY") return serviceType;
	if (!cutoffMinutes || cutoffMinutes < 1 || cutoffMinutes > 1439)
		throw new Error("Same-day cutoff is not configured");
	const local = new Date(now.getTime() + 6 * 3600000);
	const requested = new Date(
		(requestedPickupAt ? Date.parse(requestedPickupAt) : now.getTime()) +
			6 * 3600000,
	);
	const sameDate =
		local.toISOString().slice(0, 10) === requested.toISOString().slice(0, 10);
	return !sameDate ||
		local.getUTCHours() * 60 + local.getUTCMinutes() >= cutoffMinutes
		? "NEXT_DAY"
		: "SAME_DAY";
}
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\operations\operations.service.ts

```typescript
import { Prisma, type ServiceArea, type RatePlan } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../errors/AppError";
import {
	calculateQuote,
	collectionAvailable,
	deliveryServiceAtCutoff,
} from "./operations.rules";
import {
	areaSchema,
	rateSchema,
	quoteSchema,
	businessSchema,
	applicationSchema,
} from "./operations.validation";
type Actor = { userId: string; role: string };
export async function operationsActor(
	tx: Prisma.TransactionClient,
	actor: Actor,
	requiredRole?: string,
) {
	const user = await tx.user.findUnique({ where: { id: actor.userId } });
	if (
		!user ||
		user.role !== actor.role ||
		(requiredRole && user.role !== requiredRole) ||
		user.status !== "ACTIVE" ||
		user.isDeleted ||
		!user.emailVerified
	)
		throw new AppError(403, "Account access changed");
	return user;
}
export const operationsLock = (tx: Prisma.TransactionClient) =>
	tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(704529)`;
export async function quoteInTransaction(
	tx: Prisma.TransactionClient,
	input: z.infer<typeof quoteSchema>,
) {
	const data = quoteSchema.parse(input);
	const areas = await tx.serviceArea.findMany({
		where: { id: { in: [data.pickupAreaId, data.receiverAreaId] } },
	});
	const from = areas.find((area) => area.id === data.pickupAreaId);
	const to = areas.find((area) => area.id === data.receiverAreaId);
	if (
		!from ||
		!to?.deliveryEnabled ||
		!collectionAvailable(from, data.pickupMode)
	)
		throw new AppError(409, "Delivery area is not available");
	const hubs = await tx.hub.findMany({
		where: {
			id: { in: [...new Set([from.hubId, to.hubId])] },
			isDeleted: false,
		},
		select: { id: true, name: true, address: true },
	});
	if (hubs.length !== new Set([from.hubId, to.hubId]).size)
		throw new AppError(409, "Active route hubs are required");
	let rate = await tx.ratePlan.findUnique({
		where: {
			pickupAreaId_receiverAreaId_serviceType: {
				pickupAreaId: from.id,
				receiverAreaId: to.id,
				serviceType: data.serviceType,
			},
		},
	});
	if (!rate?.active)
		throw new AppError(409, "Approved pricing is not available");
	const effectiveService = deliveryServiceAtCutoff(
		data.serviceType,
		rate.cutoffMinutes,
		new Date(),
		data.requestedPickupAt,
	);
	if (effectiveService !== data.serviceType) {
		rate = await tx.ratePlan.findUnique({
			where: {
				pickupAreaId_receiverAreaId_serviceType: {
					pickupAreaId: from.id,
					receiverAreaId: to.id,
					serviceType: effectiveService,
				},
			},
		});
		if (!rate?.active)
			throw new AppError(
				409,
				"Approved next-day pricing is required after cutoff",
			);
	}
	const price = calculateQuote(
		rate,
		data.weight,
		data.codAmount,
		data.pickupMode,
	);
	if (new Prisma.Decimal(price.deliveryCharge).gt(1000000))
		throw new AppError(
			409,
			"Calculated delivery charge exceeds supported limit",
		);
	return {
		...price,
		serviceType: effectiveService,
		requestedServiceType: data.serviceType,
		originHubId: from.hubId,
		destinationHubId: to.hubId,
		originHub: hubs.find((hub) => hub.id === from.hubId),
		deliveryDays: rate.deliveryDays,
		ratePlanId: rate.id,
		rateUpdatedAt: rate.updatedAt,
	};
}
const coverage = () =>
	prisma.serviceArea.findMany({
		select: {
			id: true,
			name: true,
			district: true,
			upazila: true,
			pickupEnabled: true,
			dropoffEnabled: true,
			deliveryEnabled: true,
		},
		orderBy: { name: "asc" },
		take: 2000,
	});
const quote = (input: unknown) =>
	prisma.$transaction((tx) => quoteInTransaction(tx, quoteSchema.parse(input)));
const quotes = (input: unknown) =>
	prisma.$transaction(async (tx) => {
		const rows = z.array(quoteSchema).min(1).max(100).parse(input);
		const cache = new Map<
			string,
			Awaited<ReturnType<typeof quoteInTransaction>>
		>();
		const results = [];
		for (const row of rows) {
			const key = JSON.stringify(row);
			const value = cache.get(key) ?? (await quoteInTransaction(tx, row));
			cache.set(key, value);
			results.push(value);
		}
		return results;
	});
const configure = (kind: string, input: unknown, actor: Actor, id?: string) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "ADMIN");
		let result: ServiceArea | RatePlan;
		if (kind === "area") {
			const data = areaSchema.parse(input);
			if (
				!(await tx.hub.findUnique({
					where: { id: data.hubId, isDeleted: false },
				}))
			)
				throw new AppError(400, "Active hub not found");
			result = id
				? await tx.serviceArea.update({ where: { id }, data })
				: await tx.serviceArea.create({ data });
		} else {
			const data = rateSchema.parse(input);
			if (
				(await tx.serviceArea.count({
					where: {
						id: { in: [...new Set([data.pickupAreaId, data.receiverAreaId])] },
					},
				})) !== new Set([data.pickupAreaId, data.receiverAreaId]).size
			)
				throw new AppError(400, "Service area not found");
			result = id
				? await tx.ratePlan.update({ where: { id }, data })
				: await tx.ratePlan.create({ data });
		}
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: "CONFIGURE_OPERATIONS",
				entityId: result.id,
				entityType: kind.toUpperCase(),
				details: { changed: true },
			},
		});
		return result;
	});
const business = (input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "CUSTOMER");
		const data = businessSchema.parse(input);
		const result = await tx.businessAccount.upsert({
			where: { userId: actor.userId },
			create: { userId: actor.userId, ...data },
			update: { ...data, approved: false, reviewNote: null },
		});
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: "SUBMIT_BUSINESS",
				entityId: result.id,
				entityType: "BUSINESS",
			},
		});
		return result;
	});
const apply = (input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "CUSTOMER");
		const existing = await tx.courierApplication.findUnique({
			where: { userId: actor.userId },
		});
		if (existing && existing.status !== "REJECTED")
			throw new AppError(409, "Application already exists");
		return tx.courierApplication.upsert({
			where: { userId: actor.userId },
			create: { userId: actor.userId, ...applicationSchema.parse(input) },
			update: {
				...applicationSchema.parse(input),
				status: "PENDING",
				reviewNote: null,
			},
		});
	});
const review = (kind: string, id: string, input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(702045)`;
		await operationsLock(tx);
		await operationsActor(tx, actor, "ADMIN");
		const data = z
			.object({
				approved: z.boolean(),
				hubId: z.string().uuid().optional(),
				note: z.string().trim().min(2).max(500),
			})
			.strict()
			.parse(input);
		if (kind === "business") {
			const result = await tx.businessAccount.update({
				where: { id },
				data: { approved: data.approved, reviewNote: data.note },
			});
			await tx.auditLog.create({
				data: {
					userId: actor.userId,
					action: "REVIEW_BUSINESS",
					entityId: id,
					entityType: "BUSINESS",
					details: { approved: data.approved },
				},
			});
			return result;
		}
		const application = await tx.courierApplication.findUnique({
			where: { id },
		});
		if (!application || application.status !== "PENDING")
			throw new AppError(409, "Pending application required");
		const user = await tx.user.findUnique({
			where: { id: application.userId },
		});
		if (
			!user ||
			user.role !== "CUSTOMER" ||
			user.isDeleted ||
			user.status !== "ACTIVE" ||
			!user.emailVerified
		)
			throw new AppError(409, "Verified customer account required");
		if (data.approved) {
			if (
				!data.hubId ||
				!(await tx.hub.findUnique({
					where: { id: data.hubId, isDeleted: false },
				}))
			)
				throw new AppError(400, "Active hub is required");
			const active = await tx.shipment.count({
				where: {
					senderId: user.id,
					status: { notIn: ["DELIVERED", "RETURNED", "CANCELLED"] },
					isDeleted: false,
				},
			});
			if (active)
				throw new AppError(409, "Finish existing customer shipments first");
			if (await tx.businessAccount.findUnique({ where: { userId: user.id } }))
				throw new AppError(409, "Business accounts cannot become couriers");
			await tx.courier.upsert({
				where: { userId: user.id },
				create: {
					userId: user.id,
					contactNumber: application.contactNumber,
					vehicleType: application.vehicleType,
					currentHubId: data.hubId,
				},
				update: {
					contactNumber: application.contactNumber,
					currentHubId: data.hubId,
					vehicleType: application.vehicleType,
					isDeleted: false,
				},
			});
			await tx.user.update({
				where: { id: user.id },
				data: { role: "COURIER", tokenVersion: { increment: 1 } },
			});
		}
		const result = await tx.courierApplication.update({
			where: { id },
			data: {
				status: data.approved ? "APPROVED" : "REJECTED",
				reviewNote: data.note,
			},
		});
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: "REVIEW_COURIER_APPLICATION",
				entityId: id,
				entityType: "APPLICATION",
				details: { approved: data.approved },
			},
		});
		return result;
	});

const mine = async (actor: Actor) => {
	const owner =
		actor.role === "COURIER"
			? { courierId: actor.userId }
			: { merchantId: actor.userId };
	const parcelOwner =
		actor.role === "COURIER"
			? { courierId: actor.userId }
			: { senderId: actor.userId };
	const [business, application, collections, expected, collected, paid, held] =
		await prisma.$transaction(
			[
				actor.role === "CUSTOMER"
					? prisma.businessAccount.findUnique({
							where: { userId: actor.userId },
						})
					: prisma.businessAccount.findFirst({ where: { id: "never-match" } }),
				prisma.courierApplication.findUnique({
					where: { userId: actor.userId },
				}),
				prisma.cashCollection.findMany({
					where: owner,
					orderBy: { createdAt: "desc" },
					take: 200,
				}),
				prisma.shipment.aggregate({
					where: {
						...parcelOwner,
						isDeleted: false,
						status: { notIn: ["RETURNED", "CANCELLED"] },
					},
					_sum: { codAmount: true },
				}),
				prisma.cashCollection.aggregate({
					where: owner,
					_sum: { amount: true, payable: true },
				}),
				prisma.cashCollection.aggregate({
					where: { ...owner, status: "PAID" },
					_sum: { payable: true },
				}),
				prisma.cashCollection.aggregate({
					where: { ...owner, status: "COLLECTED" },
					_sum: { amount: true },
				}),
			],
			{ isolationLevel: "RepeatableRead" },
		);
	const zero = new Prisma.Decimal(0);
	const amount = collected._sum.amount ?? zero;
	const payable = collected._sum.payable ?? zero;
	const paidAmount = paid._sum.payable ?? zero;
	const expectedAmount = expected._sum.codAmount ?? zero;
	return {
		business,
		application,
		collections,
		totals: {
			expected: expectedAmount.toString(),
			collected: amount.toString(),
			payable: payable.toString(),
			paid: paidAmount.toString(),
			pending: payable.minus(paidAmount).toString(),
			awaitingCollection: Prisma.Decimal.max(
				expectedAmount.minus(amount),
				0,
			).toString(),
			heldByWorker: (held._sum.amount ?? zero).toString(),
		},
	};
};
const admin = async () => ({
	payoutAccounts: await prisma.businessAccount.findMany({
		where: { approved: true, user: { status: "ACTIVE", isDeleted: false } },
		take: 2000,
	}),
	couriers: await prisma.courier.findMany({
		where: {
			isDeleted: false,
			user: { role: "COURIER", status: "ACTIVE", isDeleted: false },
		},
		select: {
			userId: true,
			currentHubId: true,
			isAvailable: true,
			user: {
				select: {
					name: true,
					_count: {
						select: {
							deliveries: {
								where: {
									isDeleted: false,
									status: {
										notIn: ["PENDING", "DELIVERED", "RETURNED", "CANCELLED"],
									},
								},
							},
						},
					},
				},
			},
		},
		take: 2000,
	}),
	areas: await prisma.serviceArea.findMany({
		orderBy: { name: "asc" },
		take: 2000,
	}),
	rates: await prisma.ratePlan.findMany({ take: 2000 }),
	applications: await prisma.courierApplication.findMany({
		where: { status: "PENDING" },
		include: { user: { select: { name: true, email: true } } },
		take: 200,
	}),
	businesses: await prisma.businessAccount.findMany({
		where: { approved: false },
		include: { user: { select: { name: true, email: true } } },
		take: 200,
	}),
	collections: await prisma.cashCollection.findMany({
		where: { status: { not: "PAID" } },
		orderBy: { createdAt: "asc" },
		take: 200,
	}),
});
const settle = (id: string, input: unknown, actor: Actor) =>
	prisma.$transaction(async (tx) => {
		await operationsLock(tx);
		await operationsActor(tx, actor, "ADMIN");
		const data = z
			.object({
				action: z.enum(["RECEIVE", "PAY"]),
				reference: z.string().trim().min(6).max(100),
				accountVersion: z.string().datetime().optional(),
			})
			.strict()
			.parse(input);
		const record = await tx.cashCollection.findUnique({ where: { id } });
		if (
			!record ||
			record.status !== (data.action === "RECEIVE" ? "COLLECTED" : "RECEIVED")
		)
			throw new AppError(409, "Collection state changed");
		let payoutAccount: Record<string, string> | undefined;
		if (data.action === "PAY") {
			const business = await tx.businessAccount.findUnique({
				where: {
					userId: record.merchantId,
					user: { status: "ACTIVE", isDeleted: false },
				},
			});
			if (
				!business?.approved ||
				data.accountVersion !== business.updatedAt.toISOString()
			)
				throw new AppError(409, "Approved payout account required");
			payoutAccount = {
				id: business.id,
				version: business.updatedAt.toISOString(),
				method: business.payoutMethod,
				accountName: business.accountName,
				accountLast4: business.accountNumber.slice(-4),
			};
		}
		const result = await tx.cashCollection.update({
			where: { id },
			data:
				data.action === "RECEIVE"
					? {
							status: "RECEIVED",
							receiptReference: data.reference,
							receivedAt: new Date(),
						}
					: {
							status: "PAID",
							payoutReference: data.reference,
							paidAt: new Date(),
						},
		});
		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action:
					data.action === "RECEIVE"
						? "RECEIVE_COD_CASH"
						: "RECORD_MANUAL_COD_PAYOUT",
				entityId: id,
				entityType: "COLLECTION",
				details: {
					reference: data.reference,
					...(payoutAccount ? { payoutAccount } : {}),
					amount:
						data.action === "PAY"
							? record.payable.toString()
							: record.amount.toString(),
				},
			},
		});
		return result;
	});
export const OperationsService = {
	coverage,
	quote,
	quotes,
	configure,
	business,
	apply,
	review,
	mine,
	admin,
	settle,
};
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\operations\operations.validation.ts

```typescript
import { z } from "zod";
const text = z.string().trim().min(2).max(255);
const phone = z.string().regex(/^(?:\+88|88)?01[3-9]\d{8}$/);
const money = z.number().min(0).max(1000000).multipleOf(0.01);
export const areaSchema = z
	.object({
		name: text,
		district: text,
		upazila: text,
		hubId: z.string().uuid(),
		pickupEnabled: z.boolean(),
		dropoffEnabled: z.boolean().default(false),
		deliveryEnabled: z.boolean(),
	})
	.strict();
export const rateSchema = z
	.object({
		pickupAreaId: z.string().uuid(),
		receiverAreaId: z.string().uuid(),
		serviceType: z.enum(["STANDARD", "EXPRESS", "SAME_DAY", "NEXT_DAY"]),
		baseWeight: z.number().min(0.01).max(100),
		baseCharge: money.refine((value) => value > 0),
		extraPerKg: money,
		pickupFee: money,
		codPercent: z.number().min(0).max(100).multipleOf(0.01),
		deliveryDays: z.number().int().min(0).max(30),
		cutoffMinutes: z.number().int().min(0).max(1439).nullable().optional(),
		active: z.boolean(),
	})
	.strict()
	.refine(
		(value) =>
			value.serviceType === "SAME_DAY"
				? value.deliveryDays === 0 && !!value.cutoffMinutes
				: value.deliveryDays >= 1,
		{ message: "Delivery days and same-day cutoff are required" },
	);
export const quoteSchema = z
	.object({
		pickupAreaId: z.string().uuid(),
		receiverAreaId: z.string().uuid(),
		weight: z.number().min(0.01).max(100).multipleOf(0.01),
		codAmount: money.default(0),
		serviceType: z
			.enum(["STANDARD", "EXPRESS", "SAME_DAY", "NEXT_DAY"])
			.default("STANDARD"),
		pickupMode: z.enum(["HOME", "BRANCH"]).default("HOME"),
		requestedPickupAt: z.string().datetime({ offset: true }).optional(),
	})
	.strict();
export const businessSchema = z
	.object({
		shopName: text,
		pickupAddress: z.string().trim().min(5).max(500),
		contactNumber: phone,
		payoutMethod: z.enum(["BANK", "BKASH"]),
		accountName: text,
		accountNumber: z
			.string()
			.trim()
			.min(8)
			.max(40)
			.regex(/^[0-9+ -]+$/),
	})
	.strict();
export const applicationSchema = z
	.object({
		contactNumber: phone,
		area: text,
		vehicleType: z.enum(["BICYCLE", "MOTORBIKE", "VAN"]),
	})
	.strict();
export const proofSchema = z
	.object({
		receiverName: text,
		signature: z
			.string()
			.max(100000)
			.regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
		acknowledged: z.literal(true),
	})
	.strict()
	.refine(
		(value) => {
			const bytes = Buffer.from(value.signature.split(",")[1], "base64");
			return (
				bytes.length >= 100 &&
				bytes.length <= 65000 &&
				bytes
					.subarray(0, 8)
					.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
			);
		},
		{ message: "Valid recipient signature is required", path: ["signature"] },
	);
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\operations.test.ts

```typescript
import "./environment";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
	calculateQuote,
	collectionAvailable,
	deliveryServiceAtCutoff,
} from "../src/app/modules/operations/operations.rules";
import {
	areaSchema,
	rateSchema,
	quoteSchema,
	businessSchema,
	applicationSchema,
	proofSchema,
} from "../src/app/modules/operations/operations.validation";
import { ShipmentValidation } from "../src/app/modules/shipment/shipment.validation";
const rate = {
	baseWeight: 1,
	baseCharge: 80.25,
	extraPerKg: 20.15,
	pickupFee: 10.1,
	codPercent: 1.25,
};
const booking = {
	requestId: randomUUID(),
	quoteVersion: new Date().toISOString(),
	quotedDeliveryCharge: 90.35,
	quotedCodFee: 0,
	pickupAreaId: randomUUID(),
	receiverAreaId: randomUUID(),
	senderPhone: "01712345678",
	pickupAddress: "Sender test address",
	receiverName: "Receiver",
	receiverPhone: "01812345678",
	receiverAddress: "Receiver test address",
	weight: 1,
	productType: "PARCEL",
	declaredValue: 0,
	codAmount: 0,
	requestedPickupAt: new Date(Date.now() + 86400000).toISOString(),
};
test("approved tariff calculation uses exact decimals and rounds extra weight upwards", () => {
	const q = calculateQuote(rate, 1.01, 1000, "HOME");
	assert.deepEqual(q, {
		baseCharge: "80.25",
		extraWeightCharge: "20.15",
		pickupFee: "10.1",
		deliveryCharge: "110.5",
		codFee: "12.5",
		merchantPayable: "987.5",
	});
	assert.equal(
		calculateQuote(rate, 3.01, 0, "HOME").extraWeightCharge,
		"60.45",
	);
});
test("branch dropoff removes only the approved pickup fee", () => {
	const q = calculateQuote(rate, 1, 0, "BRANCH");
	assert.equal(q.pickupFee, "0");
	assert.equal(q.deliveryCharge, "80.25");
	assert.equal(q.codFee, "0");
});
test("operation inputs reject privilege, money and hub injection", () => {
	assert.throws(() =>
		quoteSchema.parse({
			pickupAreaId: randomUUID(),
			receiverAreaId: randomUUID(),
			weight: 1,
			price: 0,
		}),
	);
	assert.throws(() =>
		applicationSchema.parse({
			contactNumber: "01712345678",
			area: "Dhaka",
			vehicleType: "VAN",
			status: "APPROVED",
		}),
	);
	assert.throws(() =>
		businessSchema.parse({
			shopName: "Shop",
			pickupAddress: "Test address",
			contactNumber: "01712345678",
			payoutMethod: "BANK",
			accountName: "Test Name",
			accountNumber: "1234567890",
			approved: true,
		}),
	);
	assert.throws(() =>
		areaSchema.parse({
			name: "Area",
			district: "Dhaka",
			upazila: "Mirpur",
			hubId: "invalid",
			pickupEnabled: true,
			deliveryEnabled: true,
		}),
	);
});
test("bookings require future pickup, supported precision and valid declared COD", () => {
	assert.doesNotThrow(() =>
		ShipmentValidation.CreateShipmentSchema.parse({ body: booking }),
	);
	for (const change of [
		{ requestedPickupAt: new Date(0).toISOString() },
		{ requestedPickupAt: new Date(Date.now() + 31 * 86400000).toISOString() },
		{ weight: 0 },
		{ weight: 1.001 },
		{ codAmount: 1 },
		{ senderPhone: "123" },
	])
		assert.throws(() =>
			ShipmentValidation.CreateShipmentSchema.parse({
				body: { ...booking, ...change },
			}),
		);
});
test("customer bookings cannot select hubs or override sender and state", () => {
	for (const change of [
		{ originHubId: randomUUID() },
		{ senderId: randomUUID() },
		{ price: 1 },
		{ status: "DELIVERED" },
		{ payment: { create: { status: "PAID" } } },
	])
		assert.throws(() =>
			ShipmentValidation.CreateShipmentSchema.parse({
				body: { ...booking, ...change },
			}),
		);
});
test("approval tariffs reject impossible rates and unsupported service classes", () => {
	const input = {
		pickupAreaId: randomUUID(),
		receiverAreaId: randomUUID(),
		serviceType: "STANDARD",
		...rate,
		deliveryDays: 2,
		active: true,
	};
	assert.doesNotThrow(() => rateSchema.parse(input));
	for (const change of [
		{ codPercent: 101 },
		{ baseCharge: -1 },
		{ deliveryDays: 0 },
		{ serviceType: "WAREHOUSE" },
	])
		assert.throws(() => rateSchema.parse({ ...input, ...change }));
});
test("delivery acknowledgment rejects missing, oversized and non-PNG evidence", () => {
	for (const proof of [
		undefined,
		{
			receiverName: "Receiver",
			signature: "data:image/svg+xml;base64,AAAA",
			acknowledged: true,
		},
		{
			receiverName: "Receiver",
			signature: "data:image/png;base64,AAAA",
			acknowledged: true,
		},
		{
			receiverName: "Receiver",
			signature: "data:image/png;base64," + "A".repeat(100001),
			acknowledged: true,
		},
	])
		assert.throws(() => proofSchema.parse(proof));
});

test("branch availability never grants doorstep collection", () => {
	assert.equal(
		collectionAvailable(
			{ pickupEnabled: false, dropoffEnabled: true },
			"BRANCH",
		),
		true,
	);
	assert.equal(
		collectionAvailable({ pickupEnabled: false, dropoffEnabled: true }, "HOME"),
		false,
	);
});
test("Dhaka noon cutoff converts same-day requests to next-day and rejects an unset cutoff", () => {
	assert.equal(
		deliveryServiceAtCutoff("SAME_DAY", 720, new Date("2026-10-09T05:59:59Z")),
		"SAME_DAY",
	);
	assert.equal(
		deliveryServiceAtCutoff("SAME_DAY", 720, new Date("2026-10-09T06:00:00Z")),
		"NEXT_DAY",
	);
	assert.equal(
		deliveryServiceAtCutoff(
			"SAME_DAY",
			720,
			new Date("2026-10-09T04:00:00Z"),
			"2026-10-10T04:00:00Z",
		),
		"NEXT_DAY",
	);
	assert.throws(() => deliveryServiceAtCutoff("SAME_DAY", null, new Date()));
});
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\prisma\migrations\20261009010000_dropoff_and_delivery_cutoff\migration.sql

```sql
ALTER TABLE "service_areas" ADD COLUMN "dropoffEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rate_plans" ADD COLUMN "cutoffMinutes" INTEGER;
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\apply-approved-launch-config.mjs

```javascript
import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import dotenv from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
dotenv.config();
const config = JSON.parse(
	await readFile(
		new URL("./approved-launch-config.json", import.meta.url),
		"utf8",
	),
);
const target = process.env.STAGING_DATABASE_URL;
if (!target || process.env.DATABASE_URL !== target)
	throw new Error("Explicit matching staging target required");
const prisma = new PrismaClient({ datasources: { db: { url: target } } });
try {
	const ready =
		await prisma.$queryRaw`SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL AND migration_name IN ('20261009000000_courier_operations','20261009010000_dropoff_and_delivery_cutoff')`;
	if (ready.length !== 2)
		throw new Error("Both approved migrations must be applied first");
	if (!process.argv.includes("--apply")) {
		console.log(
			JSON.stringify({
				task: "approved_launch_config",
				dryRun: true,
				hubs: 3,
				areas: 9,
				rates: 161,
			}),
		);
	} else {
		const result = await prisma.$transaction(
			async (tx) => {
				await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(704529)`;
				const selected = [];
				for (const h of config.hubs) {
					const existing = await tx.hub.findUnique({ where: { name: h.name } });
					if (existing?.isDeleted)
						throw new Error("Review deleted hub before activation");
					const hub = await tx.hub.upsert({
						where: { name: h.name },
						create: { name: h.name, location: h.location, address: h.address },
						update: { location: h.location, address: h.address },
					});
					selected.push({ hub, h });
				}
				const tuples = selected.flatMap(({ hub, h }) =>
					h.areas.map(
						(a) =>
							Prisma.sql`(${randomUUID()},${a.name},${a.district},${a.upazila},${hub.id},${h.pickupEnabled},${h.dropoffEnabled},${h.deliveryEnabled},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
					),
				);
				await tx.$executeRaw(
					Prisma.sql`INSERT INTO public.service_areas (id,name,district,upazila,"hubId","pickupEnabled","dropoffEnabled","deliveryEnabled","createdAt","updatedAt") VALUES ${Prisma.join(tuples)} ON CONFLICT (name) DO UPDATE SET district=EXCLUDED.district,upazila=EXCLUDED.upazila,"hubId"=EXCLUDED."hubId","pickupEnabled"=EXCLUDED."pickupEnabled","dropoffEnabled"=EXCLUDED."dropoffEnabled","deliveryEnabled"=EXCLUDED."deliveryEnabled","updatedAt"=CURRENT_TIMESTAMP`,
				);
				const areas = await tx.serviceArea.findMany({
					where: {
						name: {
							in: config.hubs.flatMap((h) => h.areas.map((a) => a.name)),
						},
					},
				});
				const dhaka = areas.filter((a) => a.district === "ঢাকা"),
					bogura = areas.filter((a) => a.district === "বগুড়া"),
					plans = [];
				for (const from of dhaka)
					for (const to of [...dhaka, ...bogura]) {
						const tariff =
							to.district === "ঢাকা" ? config.withinDhaka : config.dhakaToBogura;
						for (const service of tariff.services)
							plans.push(
								Prisma.sql`(${randomUUID()},${from.id},${to.id},${service.type},${tariff.baseWeight},${tariff.baseCharge},${tariff.extraPerKg},${tariff.pickupFee},${tariff.codPercent},${service.days},${service.cutoffMinutes ?? null},true,CURRENT_TIMESTAMP)`,
							);
					}
				await tx.$executeRaw(
					Prisma.sql`INSERT INTO public.rate_plans (id,"pickupAreaId","receiverAreaId","serviceType","baseWeight","baseCharge","extraPerKg","pickupFee","codPercent","deliveryDays","cutoffMinutes",active,"updatedAt") VALUES ${Prisma.join(plans)} ON CONFLICT ("pickupAreaId","receiverAreaId","serviceType") DO UPDATE SET "baseWeight"=EXCLUDED."baseWeight","baseCharge"=EXCLUDED."baseCharge","extraPerKg"=EXCLUDED."extraPerKg","pickupFee"=EXCLUDED."pickupFee","codPercent"=EXCLUDED."codPercent","deliveryDays"=EXCLUDED."deliveryDays","cutoffMinutes"=EXCLUDED."cutoffMinutes",active=true,"updatedAt"=CURRENT_TIMESTAMP`,
				);
				await tx.auditLog.create({
					data: {
						action: "APPLY_HUMAN_APPROVED_LAUNCH_CONFIGURATION",
						entityId: config.approvedOn,
						entityType: "OPERATIONS",
						details: {
							approvedOn: config.approvedOn,
							hubs: selected.map((s) => s.hub.id),
							areas: areas.map((a) => a.id),
							rateCount: plans.length,
							configSha256: createHash("sha256")
								.update(JSON.stringify(config))
								.digest("hex"),
							reverseAndBoguraLocalTariffsNotApproved: true,
						},
					},
				});
				return {
					hubs: selected.length,
					areas: areas.length,
					rates: plans.length,
				};
			},
			{ timeout: 120000, maxWait: 20000 },
		);
		console.log(
			JSON.stringify({
				task: "approved_launch_config",
				applied: true,
				...result,
			}),
		);
	}
} finally {
	await prisma.$disconnect();
}
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\approved-launch-config.json

```json
{
	"approvedOn": "2026-10-09",
	"hubs": [
		{
			"key": "dhaka-north",
			"name": "ঢাকা নর্থ হাব",
			"location": "ঢাকা",
			"address": "Dropzo ঢাকা নর্থ হাব, লাভ রোড, মিরপুর ২, ঢাকা-১২১৬।",
			"areas": [
				{
					"name": "সাভার — দত্তপাড়া",
					"district": "ঢাকা",
					"upazila": "সাভার"
				},
				{
					"name": "সাভার — বিরুলিয়া",
					"district": "ঢাকা",
					"upazila": "সাভার"
				},
				{
					"name": "মিরপুর",
					"district": "ঢাকা",
					"upazila": "ঢাকা মহানগর"
				},
				{
					"name": "উত্তরা",
					"district": "ঢাকা",
					"upazila": "ঢাকা মহানগর"
				}
			],
			"pickupEnabled": true,
			"dropoffEnabled": true,
			"deliveryEnabled": true
		},
		{
			"key": "bogura",
			"name": "বগুড়া সদর হাব",
			"location": "বগুড়া",
			"address": "Dropzo বগুড়া সদর হাব, শেরপুর রোড (সাতমাথার কাছে), সদর, বগুড়া-৫৮০০।",
			"areas": [
				{
					"name": "বগুড়া সদর",
					"district": "বগুড়া",
					"upazila": "বগুড়া সদর"
				},
				{
					"name": "শিবগঞ্জ",
					"district": "বগুড়া",
					"upazila": "শিবগঞ্জ"
				}
			],
			"pickupEnabled": false,
			"dropoffEnabled": true,
			"deliveryEnabled": true
		},
		{
			"key": "dhaka-south",
			"name": "ঢাকা সাউথ হাব",
			"location": "ঢাকা",
			"address": "Dropzo ঢাকা সাউথ হাব, রোড নং ২৭ (পুরাতন), ধানমন্ডি, ঢাকা-১২০৯।",
			"areas": [
				{
					"name": "ধানমন্ডি",
					"district": "ঢাকা",
					"upazila": "ঢাকা মহানগর"
				},
				{
					"name": "মোহাম্মদপুর",
					"district": "ঢাকা",
					"upazila": "ঢাকা মহানগর"
				},
				{
					"name": "গুলশান",
					"district": "ঢাকা",
					"upazila": "ঢাকা মহানগর"
				}
			],
			"pickupEnabled": true,
			"dropoffEnabled": true,
			"deliveryEnabled": true
		}
	],
	"withinDhaka": {
		"baseWeight": 1,
		"baseCharge": 60,
		"extraPerKg": 15,
		"pickupFee": 0,
		"codPercent": 1,
		"services": [
			{
				"type": "STANDARD",
				"days": 2
			},
			{
				"type": "NEXT_DAY",
				"days": 1
			},
			{
				"type": "SAME_DAY",
				"days": 0,
				"cutoffMinutes": 720
			}
		]
	},
	"dhakaToBogura": {
		"baseWeight": 1,
		"baseCharge": 120,
		"extraPerKg": 25,
		"pickupFee": 10,
		"codPercent": 1.5,
		"services": [
			{
				"type": "STANDARD",
				"days": 3
			}
		]
	}
}
```


## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\scripts\deploy-migrations.mjs

```javascript
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config();
const runtimeUrl = process.env.DATABASE_URL;
if (!runtimeUrl) throw new Error("DATABASE_URL is required");
const requested = new URL(runtimeUrl),
	direct = new URL(runtimeUrl);
if (direct.hostname.endsWith(".neon.tech"))
	direct.hostname = direct.hostname.replace("-pooler.", ".");
const schema = requested.searchParams.get("schema") || "public";
direct.searchParams.set("schema", schema);
direct.searchParams.set("connect_timeout", "30");
const clients = [runtimeUrl, direct.toString()].map(
	(connectionString) =>
		new pg.Client({
			connectionString,
			connectionTimeoutMillis: 15000,
			query_timeout: 20000,
		}),
);
try {
	const identity = await Promise.all(
		clients.map(async (client) => {
			await client.connect();
			return (
				await client.query(
					"SELECT current_database() AS name,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid",
				)
			).rows[0];
		}),
	);
	if (
		identity[0].name !== identity[1].name ||
		identity[0].oid !== identity[1].oid
	)
		throw new Error("Migration database identity differs");
	const migrationTable =
		'"' + schema.replaceAll('"', '""') + '"."_prisma_migrations"';
	let current = false;
	const exists = (
		await clients[1].query("SELECT to_regclass($1) IS NOT NULL AS present", [
			migrationTable,
		])
	).rows[0].present;
	if (exists) {
		const records = (
			await clients[1].query(
				"SELECT migration_name,checksum,finished_at,rolled_back_at FROM " +
					migrationTable,
			)
		).rows;
		const files = (
			await readdir("prisma/migrations", { withFileTypes: true })
		).filter((entry) => entry.isDirectory());
		current = !records.some((row) => !row.finished_at && !row.rolled_back_at);
		for (const file of files) {
			const hash = createHash("sha256")
				.update(
					await readFile("prisma/migrations/" + file.name + "/migration.sql"),
				)
				.digest("hex");
			if (
				!records.some(
					(row) =>
						row.migration_name === file.name &&
						row.finished_at &&
						!row.rolled_back_at &&
						row.checksum === hash,
				)
			)
				current = false;
		}
	}
	if (current) {
		console.log(
			JSON.stringify({
				task: "deploy_migrations",
				success: true,
				upToDate: true,
				checksumsVerified: true,
			}),
		);
	} else {
		const result = spawnSync(
			process.execPath,
			["node_modules/prisma/build/index.js", "migrate", "deploy"],
			{
				env: { ...process.env, DATABASE_URL: direct.toString() },
				encoding: "utf8",
				timeout: 300000,
				windowsHide: true,
			},
		);
		const output = (result.stdout || "") + "\n" + (result.stderr || "");
		console.log(
			JSON.stringify({
				task: "deploy_migrations",
				exitCode: result.status,
				errorCode: result.error?.code,
				prismaCodes: [...new Set(output.match(/\bP\d{4}\b/g) || [])],
				success:
					/All migrations have been successfully applied|No pending migrations to apply/.test(
						output,
					),
			}),
		);
		if (result.status !== 0) process.exitCode = 1;
	}
} catch {
	console.log(JSON.stringify({ task: "deploy_migrations", failed: true }));
	process.exitCode = 1;
} finally {
	await Promise.all(clients.map((client) => client.end().catch(() => {})));
}
```
