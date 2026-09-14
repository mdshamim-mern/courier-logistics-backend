# 📦 Courier & Logistics Platform — Backend API

A production-style, role-based backend REST API for a courier and logistics management system. Built with Node.js, TypeScript, Express, and PostgreSQL (Prisma ORM), it covers end-to-end shipment tracking, courier assignment, real payment processing, and audit logging.

---

## 🚀 Live API

**Base URL:** `https://courier-logistics-backend-lake.vercel.app/api/v1`

### 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@courier.com` | `Admin@12345` |
| Courier | `courier@courier.com` | `Courier@1234` |
| Customer | `customer@courier.com` | `Customer@1234` |

> ⚠️ These are dedicated demo accounts created only for evaluation — no personal credentials are used.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Runtime & Framework | Node.js, TypeScript, Express.js |
| Database & ORM | PostgreSQL (Neon), Prisma |
| Authentication | JWT (access + refresh), bcryptjs, Google OAuth (GCP Social Login) |
| Validation | Zod |
| Caching / Session State | Redis |
| File Storage | Multer + Cloudinary |
| Email | Nodemailer |
| Payments | bKash (Tokenized Checkout API) |
| Security | Helmet, CORS, express-rate-limit |
| Deployment | Vercel (Serverless Functions) |

---

## ✨ Key Features

- **3-role RBAC** — Customer, Courier, Admin, each with strictly enforced permissions
- **Full authentication suite** — email/password, email OTP verification, Google Social Login, access/refresh tokens, blacklist-based logout, forgot/reset password
- **Shipment lifecycle engine** — enforced state-machine transitions with a full tracking timeline per shipment
- **Origin-to-destination hub routing** — every shipment is tied to an origin and destination hub, with each hub arrival recorded in the tracking timeline
- **Smart courier assignment** — checks availability, current hub match, and active-load limit before assigning
- **Real payment processing** — bKash Tokenized Checkout integration (initiate → callback → verify → status update), not a simulated flow
- **Soft deletes everywhere** — no hard deletes on core resources
- **Audit trail** — key sensitive actions (status change, role change, logout, payment) are logged
- **Search, filter, sort & pagination** — on shipment, hub, user, and courier list endpoints (payments list supports pagination)
- **Admin analytics dashboard** — live counts and revenue stats

---

## 🏗️ Architecture

```
Request → Routes → Middlewares (auth / validateRequest) → Controllers → Services → Prisma → PostgreSQL
```

```
src/
 ├── app/
 │   ├── config/        # env config loader
 │   ├── errors/         # AppError + Zod/Prisma/Cast/Duplicate error handlers
 │   ├── middlewares/    # auth, validateRequest, rateLimiter, multer, notFound, globalErrorHandler
 │   ├── modules/        # auth, user, hub, shipment, courier, payment, admin, auditLog
 │   ├── routes/         # /api/v1 route aggregator
 │   └── utils/          # sendResponse, catchAsync, redis, cloudinary, emailSender
 ├── app.ts
 └── server.ts
```

---

## 📦 Shipment Lifecycle

```
PENDING → ASSIGNED → PICKED_UP → AT_ORIGIN_HUB → IN_TRANSIT
        → AT_DESTINATION_HUB → OUT_FOR_DELIVERY → DELIVERED

Alternate paths:
PENDING/ASSIGNED → CANCELLED
OUT_FOR_DELIVERY → DELIVERY_FAILED → RETURNED
```

Every transition is validated against an allowed-transitions map (no skipping steps, no going backward) and automatically written to the shipment's tracking timeline.

---

## 📡 API Endpoints

All routes are versioned under `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/verify-email` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/google` | Public (GCP Social Login) |
| POST | `/auth/refresh-token` | Public |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/reset-password` | Public |
| POST | `/auth/logout` | Authenticated |

### Users
| Method | Endpoint | Access |
|---|---|---|
| GET | `/users/me` | Authenticated |
| PATCH | `/users/me` | Authenticated |
| PATCH | `/users/profile-image` | Authenticated |

### Hubs
| Method | Endpoint | Access |
|---|---|---|
| POST | `/hubs` | Admin |
| GET | `/hubs` | Authenticated *(search, pagination)* |
| GET | `/hubs/:id` | Authenticated |
| PATCH | `/hubs/:id` | Admin |
| DELETE | `/hubs/:id` | Admin *(soft delete)* |

### Shipments
| Method | Endpoint | Access |
|---|---|---|
| POST | `/shipments` | Customer, Admin |
| GET | `/shipments` | Authenticated *(filter, search, sort, pagination)* |
| GET | `/shipments/:id` | Authenticated *(includes full tracking timeline)* |
| PATCH | `/shipments/:id/assign` | Admin |
| PATCH | `/shipments/:id/status` | Admin, Courier |
| PATCH | `/shipments/:id/cancel` | Customer (owner, PENDING only) |

### Couriers
| Method | Endpoint | Access |
|---|---|---|
| POST | `/couriers` | Admin |
| GET | `/couriers` | Admin *(filter by availability, search, pagination)* |
| GET | `/couriers/:id` | Admin, Courier (own record only) |
| PATCH | `/couriers/:id` | Admin, Courier (own record only) |
| GET | `/couriers/:id/history-earnings` | Admin, Courier (own record only) |

### Payments
| Method | Endpoint | Access |
|---|---|---|
| POST | `/payments/initiate` | Customer |
| GET | `/payments/bkash/callback` | Public (bKash redirect/webhook) |
| GET | `/payments/:id` | Authenticated |
| GET | `/payments` | Authenticated *(pagination)* |

### Admin & Audit
| Method | Endpoint | Access |
|---|---|---|
| GET | `/admin/dashboard-stats` | Admin |
| GET | `/admin/users` | Admin *(filter, search, pagination)* |
| PATCH | `/admin/users/:id/status` | Admin |
| PATCH | `/admin/users/:id/role` | Admin |
| GET | `/audit-logs` | Admin |

---

## 📄 API Documentation (Postman)

A complete Postman collection and environment are provided with this submission:

- Collection: `courier-backend_postman_collection.json`
- Environment: `Courier-Logistics-Environment.postman_environment.json`

**Import both files into Postman**, select the **Courier Live** environment, log in with any role first, then paste the returned `accessToken` into the matching `admin_access_token` / `customer_access_token` / `courier_access_token` variable.

---

## 🧠 Why Redis?

Redis is used for real, functional purposes — not just to check a box:

- **OTP storage** during email verification (auto-expiring)
- **bKash access token caching** (avoids re-authenticating with bKash on every payment)
- **JWT blacklist** for both access and refresh tokens on logout, so a logged-out session can't be reused

---

## 💻 Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL database (e.g. [Neon](https://neon.tech))
- Redis instance (e.g. [Upstash](https://upstash.com))
- Cloudinary account
- bKash sandbox credentials
- Google OAuth Client ID

### 1. Clone the repository
```bash
git clone https://github.com/mdshamim-mern/courier-logistics-backend.git
cd courier-logistics-backend
```

### 2. Install dependencies
```bash
npm install
# or
bun install
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in your own values:
```bash
cp .env.example .env
```

```env
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

DATABASE_URL="postgresql://user:password@localhost:5432/courier_db?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_ACCESS_SECRET="your_access_secret_key"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your_refresh_secret_key"
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
```

### 4. Generate Prisma Client & apply migrations
```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Seed demo Admin, Courier & Customer accounts
```bash
npx prisma db seed
```

### 6. Start the development server
```bash
npm run dev
```

The API will be available at `http://localhost:5000/api/v1`

### Production build
```bash
npm run build
npm start
```

---

## 🔐 Security

- Passwords hashed with bcrypt, never returned in any response
- Helmet for secure HTTP headers
- CORS restricted to configured origins
- Global + auth-route rate limiting (`express-rate-limit`)
- JWT access + refresh tokens, both blacklisted in Redis on logout
- Role-based middleware on every protected route (`403 Forbidden` on role mismatch, `401 Unauthorized` on missing/invalid token)
- Server-side Zod validation on every applicable endpoint

---

## 📌 Known Tech Decisions

- **Soft deletes** (`isDeleted` / `deletedAt`) instead of hard deletes across all core models
- **Database transactions** wrap every multi-table write (shipment status change + tracking + audit log, courier assignment, payment confirmation, etc.)
- **Payment gateway:** bKash Tokenized Checkout Sandbox — a real gateway integration, not a simulated/manual status update

---

*Developed by [Md Shamim](https://github.com/mdshamim-mern).*