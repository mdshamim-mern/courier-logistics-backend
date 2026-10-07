# পরিবর্তিত কোড: সম্পূর্ণ পথসহ

মূল কাঠামো রেখে সংশোধিত ফাইলের বর্তমান কোড নিচে আছে। প্রতিটি কোডের আগে সম্পূর্ণ স্থানীয় পথ দেওয়া হয়েছে। বাস্তব শংসাপত্রের ফাইল অন্তর্ভুক্ত করা হয়নি। যেগুলোতে কার্যকর পরিবর্তনের বদলে টাইপের আমদানি, ভাষা-সচেতন লিংক বা প্রবেশযোগ্যতার সংশোধন হয়েছে, সেগুলোও অন্তর্ভুক্ত।

মোট কোড ফাইল: 62।

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
    "lint": "biome lint src",
    "db:deploy": "prisma migrate deploy"
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
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  COURIER_COMMISSION_RATE: z.preprocess(value => value === "" ? undefined : value, z.coerce.number().min(0).max(1).optional()),
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
}
const environment = parsed.data;
if (environment.JWT_ACCESS_SECRET === environment.JWT_REFRESH_SECRET) {
  throw new Error("Access and refresh secrets must be different");
}
if (environment.COOKIE_SAME_SITE === "none" && environment.NODE_ENV !== "production") {
  throw new Error("Cross-site cookies require production HTTPS");
}

export default {
  env: environment.NODE_ENV,
  port: environment.PORT,
  database_url: environment.DATABASE_URL,
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
import { listQuerySchema } from "../../utils/query";
import { ACTIVE_SHIPMENT_STATUSES } from "../shipment/shipment.rules";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError";

async function lockAdminMutation(tx: Prisma.TransactionClient, userId: string, adminId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(702045)`;
  const actor = await tx.user.findUnique({ where: { id: adminId } });
  if (!actor || actor.role !== Role.ADMIN || actor.status !== UserStatus.ACTIVE || actor.isDeleted || !actor.emailVerified) throw new AppError(403, "Administrator access is no longer valid");
  const user = await tx.user.findUnique({ where: { id: userId, isDeleted: false } });
  if (!user) throw new AppError(404, "User not found");
  return user;
}

async function assertAnotherAdmin(tx: Prisma.TransactionClient) {
  const count = await tx.user.count({ where: { role: Role.ADMIN, status: UserStatus.ACTIVE, isDeleted: false, emailVerified: true } });
  if (count <= 1) throw new AppError(409, "At least one active administrator must remain");
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

  const totalRevenue = revenueResult._sum.amount ? Number(revenueResult._sum.amount) : 0;

  return {
    totalCustomers,
    totalCouriers,
    totalShipments,
    totalRevenue,
    shipmentsByStatus,
  };
};

const getAllUsers = async (query: unknown) => {
  const { role, status, searchTerm, page, limit, sortBy, sortOrder } = listQuerySchema.parse(query);
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
  const validSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";

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

const updateUserStatus = async (userId: string, status: UserStatus, adminId: string) => {
  if (userId === adminId && status !== "ACTIVE") throw new AppError(400, "Cannot block or delete your own account");
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentUser = await lockAdminMutation(tx, userId, adminId);
    if (currentUser.role === Role.ADMIN && status !== UserStatus.ACTIVE) await assertAnotherAdmin(tx);
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { status, tokenVersion: { increment: 1 }, isDeleted: status === "DELETED", deletedAt: status === "DELETED" ? new Date() : null },
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
    if (currentUser.role === Role.ADMIN && role !== Role.ADMIN) await assertAnotherAdmin(tx);
    await tx.$queryRaw`SELECT "id" FROM "couriers" WHERE "userId" = ${userId} FOR UPDATE`;
    if (currentUser.role === Role.COURIER && role !== Role.COURIER) {
      const active = await tx.shipment.count({ where: { courierId: userId, isDeleted: false, status: { in: ACTIVE_SHIPMENT_STATUSES } } });
      if (active) throw new AppError(409, "Complete or reassign the courier deliveries before changing role");
    }
    if (role === Role.COURIER) {
      const customer = await tx.customer.findUnique({ where: { userId } });
      const contactNumber = currentUser.contactNumber ?? customer?.contactNumber;
      if (!contactNumber) throw new AppError(400, "A contact number is required before creating a courier profile");
      await tx.courier.upsert({ where: { userId }, create: { userId, contactNumber }, update: { isDeleted: false, deletedAt: null } });
    }
    if (role === Role.CUSTOMER) {
      await tx.customer.upsert({ where: { userId }, create: { userId, contactNumber: currentUser.contactNumber }, update: { isDeleted: false, deletedAt: null } });
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
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${shipmentId} FOR UPDATE`;
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
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${lookup.payment.shipmentId} FOR UPDATE`;
  const attempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { payment: true } });
  if (attempt.status === PaymentStatus.PAID) return attempt.payment;
  const paidAt = new Date();
  await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: PaymentStatus.PAID, providerTransactionId, paidAt, gatewayResponse: summary } });
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
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${attempt.payment.shipmentId} FOR UPDATE`;
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
  const result = await ShipmentService.createShipment(req.user.userId, req.body);

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
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Shipment summary retrieved", data: result });
});

const getSingleShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.getSingleShipment(req.params.id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment retrieved successfully",
    data: result,
  });
});

const trackShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.trackShipment(req.params.trackingId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Tracking retrieved successfully", data: result });
});

const assignCourier = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.assignCourier(req.params.id, req.body.courierId, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier assigned successfully",
    data: result,
  });
});

const updateShipmentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.updateShipmentStatus(req.params.id, req.body.status, req.user.userId, req.user.role, req.body.hubId, req.body.note);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment status updated successfully",
    data: result,
  });
});

const cancelShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await ShipmentService.cancelShipment(req.params.id, req.user.userId);

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

const router = express.Router();

router.get("/summary", auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER), ShipmentController.getShipmentSummary);

router.get("/track/:trackingId", validateRequest(z.object({ params: z.object({ trackingId: z.string().trim().min(8).max(80).regex(/^TRK-[A-Z0-9-]+$/).transform(value => value.toUpperCase()) }) })), ShipmentController.trackShipment);

router.post(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER),
  validateRequest(ShipmentValidation.CreateShipmentSchema),
  ShipmentController.createShipment
);

router.get(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  ShipmentController.getAllShipments
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  ShipmentController.getSingleShipment
);

router.patch(
  "/:id/assign",
  auth(Role.ADMIN),
  validateRequest(ShipmentValidation.AssignCourierSchema),
  ShipmentController.assignCourier
);

router.patch(
  "/:id/status",
  auth(Role.ADMIN, Role.COURIER),
  validateRequest(ShipmentValidation.UpdateShipmentStatusSchema),
  ShipmentController.updateShipmentStatus
);

router.patch(
  "/:id/cancel",
  auth(Role.CUSTOMER),
  ShipmentController.cancelShipment
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
  DELIVERY_FAILED: [ShipmentStatus.RETURNED],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export const ACTIVE_SHIPMENT_STATUSES = Object.values(ShipmentStatus).filter(status => ![
  ShipmentStatus.PENDING, ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.CANCELLED,
].includes(status as "PENDING" | "DELIVERED" | "RETURNED" | "CANCELLED"));

export function nextShipmentStatuses(status: ShipmentStatus, role: string) {
  if (role === Role.CUSTOMER) return status === ShipmentStatus.PENDING ? [ShipmentStatus.CANCELLED] : [];
  return ALLOWED_TRANSITIONS[status].filter(next => next !== ShipmentStatus.ASSIGNED && (role === Role.ADMIN || next !== ShipmentStatus.CANCELLED));
}
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.service.ts

```ts
import { Prisma, ShipmentStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import config from "../../config";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../utils/prisma";
import { listQuerySchema } from "../../utils/query";
import { ACTIVE_SHIPMENT_STATUSES, nextShipmentStatuses } from "./shipment.rules";
import { ShipmentValidation } from "./shipment.validation";

type Actor = { userId: string; role: string };
const publicPaymentSelect = { id: true, status: true, amount: true, currency: true, paymentGateway: true, paidAt: true } as const;

async function assertActiveHub(tx: Prisma.TransactionClient, id?: string | null) {
  if (id && !(await tx.hub.findUnique({ where: { id, isDeleted: false } }))) throw new AppError(400, "Active hub not found");
}

async function assertCancellationSafe(tx: Prisma.TransactionClient, shipmentId: string, paymentStatus?: string) {
  if (paymentStatus === "PAID") throw new AppError(409, "Paid shipments require a refund before cancellation");
  const pending = await tx.paymentAttempt.count({ where: { payment: { shipmentId }, status: "UNPAID" } });
  if (pending) throw new AppError(409, "Payment must be verified before cancelling this shipment");
}

const createShipment = async (userId: string, input: z.infer<typeof ShipmentValidation.CreateShipmentSchema>["body"]) => {
  const payload = ShipmentValidation.CreateShipmentSchema.shape.body.parse(input);
  const trackingId = `TRK-${randomUUID().replace(/-/g, "").toUpperCase()}`;
  const price = new Prisma.Decimal(payload.weight).mul(120).toDecimalPlaces(2);
  return prisma.$transaction(async tx => {
    await assertActiveHub(tx, payload.originHubId);
    await assertActiveHub(tx, payload.destinationHubId);
    const shipment = await tx.shipment.create({ data: {
      receiverName: payload.receiverName, receiverPhone: payload.receiverPhone, receiverAddress: payload.receiverAddress,
      weight: payload.weight, originHubId: payload.originHubId, destinationHubId: payload.destinationHubId,
      senderId: userId, trackingId, price, status: ShipmentStatus.PENDING,
    } });
    await tx.shipmentTracking.create({ data: { shipmentId: shipment.id, status: ShipmentStatus.PENDING, updatedById: userId, note: "Shipment created" } });
    await tx.auditLog.create({ data: { userId, action: "CREATE_SHIPMENT", entityId: shipment.id, entityType: "SHIPMENT", details: { trackingId, status: shipment.status } } });
    return shipment;
  });
};

const getAllShipments = async (query: unknown, user: Actor) => {
  const { searchTerm, status, page, limit, sortBy, sortOrder } = listQuerySchema.parse(query);
  const conditions: Prisma.ShipmentWhereInput[] = [{ isDeleted: false }];
  if (user.role === "CUSTOMER") conditions.push({ senderId: user.userId });
  if (user.role === "COURIER") conditions.push({ courierId: user.userId });
  if (status) conditions.push({ status: z.nativeEnum(ShipmentStatus).parse(status) });
  if (searchTerm) conditions.push({ OR: [
    { trackingId: { contains: searchTerm, mode: "insensitive" } },
    { receiverName: { contains: searchTerm, mode: "insensitive" } },
    { receiverPhone: { contains: searchTerm, mode: "insensitive" } },
  ] });
  const validSortBy = ["createdAt", "price", "weight", "status"].includes(sortBy) ? sortBy : "createdAt";
  const [shipments, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where: { AND: conditions }, skip: (page - 1) * limit, take: limit, orderBy: { [validSortBy]: sortOrder },
      include: {
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
    data: shipments.map(shipment => ({
      ...shipment, paymentStatus: shipment.payment?.status ?? "UNPAID",
      allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role),
    })),
  };
};

const getShipmentSummary = async (user: Actor) => {
  const where: Prisma.ShipmentWhereInput = { isDeleted: false, ...(user.role === "CUSTOMER" ? { senderId: user.userId } : user.role === "COURIER" ? { courierId: user.userId } : {}) };
  const groups = await prisma.shipment.groupBy({ by: ["status"], where, _count: { _all: true } });
  return groups.reduce((summary, group) => {
    summary.totalShipments += group._count._all;
    if (group.status === "PENDING" || ACTIVE_SHIPMENT_STATUSES.includes(group.status)) summary.activeShipments += group._count._all;
    if (group.status === "DELIVERED") summary.deliveredShipments += group._count._all;
    return summary;
  }, { totalShipments: 0, activeShipments: 0, deliveredShipments: 0 });
};

const getSingleShipment = async (id: string, user: Actor) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id, isDeleted: false },
    include: {
      sender: { select: { name: true, email: true, contactNumber: true } },
      courier: { select: { name: true, email: true, contactNumber: true } },
      originHub: true, destinationHub: true, payment: { select: publicPaymentSelect },
      trackings: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if ((user.role === "CUSTOMER" && shipment.senderId !== user.userId) || (user.role === "COURIER" && shipment.courierId !== user.userId)) {
    throw new AppError(403, "You do not have permission to view this shipment");
  }
  return { ...shipment, paymentStatus: shipment.payment?.status ?? "UNPAID", allowedNextStatuses: nextShipmentStatuses(shipment.status, user.role) };
};

const trackShipment = async (trackingId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingId, isDeleted: false },
    select: {
      trackingId: true, status: true, estimatedDelivery: true,
      trackings: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, createdAt: true, hub: { select: { name: true, location: true } } } },
    },
  });
  if (!shipment) throw new AppError(404, "Tracking information not found");
  return shipment;
};

const assignCourier = async (shipmentId: string, courierId: string, adminId: string) => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT "id" FROM "couriers" WHERE "userId" = ${courierId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${shipmentId} FOR UPDATE`;
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.status !== ShipmentStatus.PENDING || shipment.courierId) throw new AppError(409, "Shipment is no longer available for assignment");
  const courier = await tx.courier.findUnique({ where: { userId: courierId, isDeleted: false }, include: { user: true } });
  if (!courier || courier.user.isDeleted || courier.user.status !== "ACTIVE" || courier.user.role !== "COURIER") throw new AppError(404, "Active courier not found");
  if (!courier.isAvailable) throw new AppError(400, "Courier is currently unavailable");
  if (!shipment.originHubId || shipment.originHubId !== courier.currentHubId) throw new AppError(400, "Courier must belong to the shipment origin hub");
  await assertActiveHub(tx, shipment.originHubId);
  const active = await tx.shipment.count({ where: { courierId, isDeleted: false, status: { in: ACTIVE_SHIPMENT_STATUSES } } });
  if (active >= 5) throw new AppError(409, "Courier has reached the active delivery limit");
  const changed = await tx.shipment.updateMany({ where: { id: shipmentId, status: ShipmentStatus.PENDING, courierId: null, isDeleted: false }, data: { courierId, status: ShipmentStatus.ASSIGNED } });
  if (changed.count !== 1) throw new AppError(409, "Shipment changed, please reload");
  await tx.shipmentTracking.create({ data: { shipmentId, status: ShipmentStatus.ASSIGNED, updatedById: adminId, note: "Courier assigned" } });
  await tx.auditLog.create({ data: { userId: adminId, action: "ASSIGN_COURIER", entityId: shipmentId, entityType: "SHIPMENT", details: { courierId, previousStatus: shipment.status, newStatus: ShipmentStatus.ASSIGNED } } });
  return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
});

const updateShipmentStatus = async (shipmentId: string, status: ShipmentStatus, userId: string, role: string, hubId?: string, note?: string) => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${shipmentId} FOR UPDATE`;
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, include: { payment: { select: { status: true } } } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (role === "COURIER" && shipment.courierId !== userId) throw new AppError(403, "You can only update assigned shipments");
  if (!["ADMIN", "COURIER"].includes(role) || !nextShipmentStatuses(shipment.status, role).includes(status)) throw new AppError(400, "Invalid shipment status transition");
  if (status === ShipmentStatus.CANCELLED) await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
  const effectiveHub = status === ShipmentStatus.AT_ORIGIN_HUB ? shipment.originHubId : status === ShipmentStatus.AT_DESTINATION_HUB ? shipment.destinationHubId : hubId;
  if (hubId && effectiveHub && hubId !== effectiveHub) throw new AppError(400, "Hub does not match the shipment route");
  if ([ShipmentStatus.AT_ORIGIN_HUB, ShipmentStatus.AT_DESTINATION_HUB].includes(status as "AT_ORIGIN_HUB" | "AT_DESTINATION_HUB") && !effectiveHub) throw new AppError(400, "Shipment hub is required");
  await assertActiveHub(tx, effectiveHub);
  const earning = status === ShipmentStatus.DELIVERED && config.courier_commission_rate !== undefined
    ? shipment.price.mul(config.courier_commission_rate).toDecimalPlaces(2) : undefined;
  const changed = await tx.shipment.updateMany({
    where: { id: shipmentId, status: shipment.status, courierId: shipment.courierId, isDeleted: false },
    data: { status, courierEarning: earning },
  });
  if (changed.count !== 1) throw new AppError(409, "Shipment changed, please reload");
  await tx.shipmentTracking.create({ data: { shipmentId, status, updatedById: userId, hubId: effectiveHub, note } });
  if (status === ShipmentStatus.IN_TRANSIT && shipment.originHubId && shipment.destinationHubId) {
    await tx.shipmentTransfer.create({ data: { shipmentId, fromHubId: shipment.originHubId, toHubId: shipment.destinationHubId, transferredById: userId, departureAt: new Date() } });
  }
  if (status === ShipmentStatus.AT_DESTINATION_HUB) {
    await tx.shipmentTransfer.updateMany({ where: { shipmentId, arrivalAt: null }, data: { arrivalAt: new Date(), status } });
  }
  await tx.auditLog.create({ data: { userId, action: "UPDATE_STATUS", entityId: shipmentId, entityType: "SHIPMENT", details: { previousStatus: shipment.status, newStatus: status } } });
  return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
});

const cancelShipment = async (shipmentId: string, userId: string) => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT "id" FROM "shipments" WHERE "id" = ${shipmentId} FOR UPDATE`;
  const shipment = await tx.shipment.findUnique({ where: { id: shipmentId, isDeleted: false }, include: { payment: { select: { status: true } } } });
  if (!shipment) throw new AppError(404, "Shipment not found");
  if (shipment.senderId !== userId) throw new AppError(403, "You cannot cancel this shipment");
  if (shipment.status !== ShipmentStatus.PENDING) throw new AppError(409, "Only pending shipments can be cancelled");
  await assertCancellationSafe(tx, shipmentId, shipment.payment?.status);
  const changed = await tx.shipment.updateMany({ where: { id: shipmentId, senderId: userId, status: ShipmentStatus.PENDING, isDeleted: false }, data: { status: ShipmentStatus.CANCELLED } });
  if (changed.count !== 1) throw new AppError(409, "Shipment changed, please reload");
  await tx.shipmentTracking.create({ data: { shipmentId, status: ShipmentStatus.CANCELLED, updatedById: userId, note: "Cancelled by customer" } });
  await tx.auditLog.create({ data: { userId, action: "CANCEL_SHIPMENT", entityId: shipmentId, entityType: "SHIPMENT", details: { previousStatus: shipment.status, newStatus: ShipmentStatus.CANCELLED } } });
  return tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
});

export const ShipmentService = { createShipment, getAllShipments, getShipmentSummary, getSingleShipment, trackShipment, assignCourier, updateShipmentStatus, cancelShipment };
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\src\app\modules\shipment\shipment.validation.ts

```ts
import { z } from "zod";

const CreateShipmentSchema = z.object({
  body: z.object({
    receiverName: z.string().trim().min(1).max(255),
    receiverPhone: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/),
    receiverAddress: z.string().trim().min(5).max(500),
    weight: z.number().min(0.01).max(100).multipleOf(0.01),
    originHubId: z.string().uuid().optional(),
    destinationHubId: z.string().uuid().optional(),
  }).strict().refine((data) => {
    if (data.originHubId && data.destinationHubId) {
      return data.originHubId !== data.destinationHubId;
    }
    return true;
  }, {
    message: "Origin Hub and Destination Hub cannot be the same",
    path: ["destinationHubId"],
  }),
});

const UpdateShipmentStatusSchema = z.object({
  body: z.object({
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
  }).strict(),
});

const AssignCourierSchema = z.object({
  body: z.object({
    courierId: z.string().uuid(),
  }).strict(),
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

const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalDatabase.prisma ?? new PrismaClient();

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
});

export const idParamsSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
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
process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-at-least-32-characters";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.COOKIE_SAME_SITE = "lax";
process.env.STRIPE_SECRET_KEY = "sk_test_local_fixture";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
```



## D:\NEXT_LEVEL_WEB_DEV\assignment\courier-backend\tests\integration\environment.ts

```ts
const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) throw new Error("INTEGRATION_DATABASE_URL must point to a dedicated database ending in _test");
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
import { createSession, rotateSession, revokeSession } from "../../src/app/utils/session";
import { ShipmentService } from "../../src/app/modules/shipment/shipment.service";
import { UserService } from "../../src/app/modules/user/user.service";
import { PaymentService } from "../../src/app/modules/payment/payment.service";

const userIds: string[] = [];
const hubIds: string[] = [];
const shipmentIds: string[] = [];
before(async () => { await prisma.$connect(); await connectRedis(); });
after(async () => {
  await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ entityId: { in: shipmentIds } }, { userId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.hub.deleteMany({ where: { id: { in: hubIds } } });
  await prisma.$disconnect();
  if (redisClient.isOpen) await redisClient.quit();
});

async function fixtures() {
  const suffix = randomUUID();
  const sender = await prisma.user.create({ data: { name: "Integration Customer", email: suffix + "@integration.test", role: Role.CUSTOMER, emailVerified: true, customer: { create: {} } } });
  userIds.push(sender.id);
  const admin = await prisma.user.create({ data: { name: "Integration Admin", email: "admin-" + suffix + "@integration.test", role: Role.ADMIN, emailVerified: true } });
  userIds.push(admin.id);
  const hub = await prisma.hub.create({ data: { name: "Integration-" + suffix, location: "Dhaka", address: "Integration address" } });
  hubIds.push(hub.id);
  const destination = await prisma.hub.create({ data: { name: "Destination-" + suffix, location: "Savar", address: "Integration address" } });
  hubIds.push(destination.id);
  const couriers = [];
  for (const number of [1, 2]) {
    const courier = await prisma.user.create({ data: { name: "Integration Courier", email: "courier-" + number + "-" + suffix + "@integration.test", role: Role.COURIER, emailVerified: true, courier: { create: { contactNumber: "01712345678", currentHubId: hub.id } } } });
    userIds.push(courier.id);
    couriers.push(courier);
  }
  const shipment = await ShipmentService.createShipment(sender.id, {
    receiverName: "Receiver", receiverPhone: "01712345678", receiverAddress: "Integration destination",
    weight: 1, originHubId: hub.id, destinationHubId: destination.id,
  });
  shipmentIds.push(shipment.id);
  return { sender, admin, couriers, shipment };
}

test("concurrent courier assignment succeeds once and records one tracking event", async () => {
  const { admin, couriers, shipment } = await fixtures();
  const results = await Promise.allSettled(couriers.map(courier => ShipmentService.assignCourier(shipment.id, courier.id, admin.id)));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(await prisma.shipmentTracking.count({ where: { shipmentId: shipment.id, status: "ASSIGNED" } }), 1);
});

test("concurrent status changes cannot append duplicate tracking events", async () => {
  const { admin, couriers, shipment } = await fixtures();
  await ShipmentService.assignCourier(shipment.id, couriers[0].id, admin.id);
  const results = await Promise.allSettled([1, 2].map(() => ShipmentService.updateShipmentStatus(shipment.id, "PICKED_UP", couriers[0].id, "COURIER")));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(await prisma.shipmentTracking.count({ where: { shipmentId: shipment.id, status: "PICKED_UP" } }), 1);
});

test("profile address and phone update together without changing role", async () => {
  const { sender } = await fixtures();
  const result = await UserService.updateMyProfile(sender.id, { name: "Updated Customer", address: "Updated integration address", contactNumber: "01812345678" });
  assert.equal(result.role, "CUSTOMER");
  assert.equal(result.customer?.address, "Updated integration address");
  assert.equal(result.customer?.contactNumber, result.contactNumber);
});

test("verified repeated Stripe events record money and audit once", async () => {
  const { shipment } = await fixtures();
  const payment = await prisma.payment.create({ data: { shipmentId: shipment.id, amount: shipment.price, paymentGateway: PaymentGateway.STRIPE } });
  const reference = "cs_test_" + randomUUID();
  const attempt = await prisma.paymentAttempt.create({ data: { paymentId: payment.id, paymentGateway: PaymentGateway.STRIPE, amount: payment.amount, transactionId: reference } });
  const event = {
    id: "evt_" + randomUUID(), type: "checkout.session.completed",
    data: { object: { id: reference, mode: "payment", payment_status: "paid", currency: "bdt", amount_total: 12000,
      payment_intent: "pi_" + randomUUID(), metadata: { shipmentId: shipment.id, attemptId: attempt.id } } },
  } as unknown as Stripe.Event;
  await Promise.all([PaymentService.handleStripeEvent(event), PaymentService.handleStripeEvent(event)]);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "PAID");
  assert.equal(await prisma.auditLog.count({ where: { entityId: shipment.id, action: "PAYMENT_SUCCESS" } }), 1);
  const expired = { ...event, type: "checkout.session.expired" } as Stripe.Event;
  await PaymentService.handleStripeEvent(expired);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "PAID");
});

test("Redis refresh rotation allows exactly one concurrent use", async () => {
  const { sender } = await fixtures();
  const tokens = await createSession(sender);
  try {
    const results = await Promise.allSettled([1, 2].map(() => rotateSession(sender, tokens.refreshToken, tokens.sessionId)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  } finally {
    await revokeSession(tokens.sessionId);
  }
});

test("pending payment attempts prevent cancellation", async () => {
  const { sender, shipment } = await fixtures();
  const payment = await prisma.payment.create({ data: { shipmentId: shipment.id, amount: shipment.price } });
  await prisma.paymentAttempt.create({ data: { paymentId: payment.id, amount: shipment.price, paymentGateway: PaymentGateway.BKASH } });
  await assert.rejects(() => ShipmentService.cancelShipment(shipment.id, sender.id), (error: any) => error.statusCode === 409);
  assert.equal((await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status, "PENDING");
});

test("payment reconciliation rejects a different customer", async () => {
  const { admin, shipment } = await fixtures();
  await assert.rejects(() => PaymentService.reconcilePayment(shipment.id, admin.id), (error: any) => error.statusCode === 403);
});

test("shipment summary counts every matching shipment without a page limit", async () => {
  const { sender, shipment } = await fixtures();
  const extra = Array.from({ length: 104 }, () => ({ id: randomUUID(), trackingId: "TRK-" + randomUUID(), senderId: sender.id,
    receiverName: "Receiver", receiverPhone: "01712345678", receiverAddress: "Integration address", weight: 1, price: 120 }));
  shipmentIds.push(...extra.map(item => item.id));
  await prisma.shipment.createMany({ data: extra });
  await prisma.shipment.update({ where: { id: shipment.id }, data: { status: "DELIVERED" } });
  const summary = await ShipmentService.getShipmentSummary({ userId: sender.id, role: "CUSTOMER" });
  assert.deepEqual(summary, { totalShipments: 105, activeShipments: 104, deliveredShipments: 1 });
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
