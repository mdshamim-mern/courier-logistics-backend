# Dropzo — Courier & Logistics API

A TypeScript/Express backend for the Dropzo courier assignment and its extended booking, hub routing, worker allocation, payment verification and COD ledger workflows.

## Links

| Resource | URL |
| --- | --- |
| Live API | https://courier-logistics-backend-lake.vercel.app/api/v1 |
| Public documentation | https://courier-logistics-backend-lake.vercel.app/docs |
| Postman collection | https://courier-logistics-backend-lake.vercel.app/docs/postman/collection |
| Postman environment | https://courier-logistics-backend-lake.vercel.app/docs/postman/environment |
| Frontend | https://courier-frontend-sigma.vercel.app |
| Backend repository | https://github.com/mdshamim-mern/courier-logistics-backend |
| Frontend repository | https://github.com/mdshamim-mern/courier-frontend |

The [source-aligned API reference](docs/api-reference.md) documents contracts, access rules and evaluation boundaries. The updated collection covers 58 versioned endpoints plus root/liveness/readiness, with 67 request examples. Public documentation/download routes are additional read-only endpoints.

## Evaluation credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@courier.com | Admin@12345 |
| Customer | customer@courier.com | Customer@1234 |
| Courier | courier@courier.com | Courier@1234 |

Use these dedicated shared accounts only with test records. Do not place private data in them. Retire shared credentials before real commercial operation.

## Core capabilities

- JWT-backed HttpOnly access/refresh cookies; token rotation, Redis session revocation, current-database role/status checks and email verification.
- Customer, Courier and Admin authorization; parsed Zod payloads, bounded pagination and safe output projection.
- Approved area/service configuration, exact-decimal route tariffs, quote version checking and idempotent bookings.
- Customer/merchant pickup data, administrator-controlled hubs, worker assignment, hub handoffs and guarded parcel transitions.
- Failed delivery/retry/return workflow and recipient acknowledgment with evidence.
- Stripe Checkout and bKash sandbox initiation, signed/correlated verification and payment reconciliation.
- Separate product COD collection, worker cash receipt and manually recorded merchant remittance.
- Soft archive safeguards for linked resources, audit history and database-backed dashboard totals/charts.
- Public tracking without private receiver contacts; printable labels and validated bulk booking.

## Architecture

Routes → authentication / request validation → controllers → transactional services → Prisma/PostgreSQL.

Redis supports sessions, verification/recovery codes and provider caching. Cloudinary supports configured image uploads. Nodemailer supplies email delivery. Vercel hosts the application; public documentation assets are included in the server bundle.

## Authentication and Postman

1. Import Courier-Logistics-Updated.postman_collection.json and Courier-Logistics-Live.postman_environment.json.
2. Select the evaluation environment, keep the cookie jar enabled and enter the demo password locally.
3. Login sets HttpOnly cookies. Login JSON does not expose an access token; do not follow old token-copy instructions.
4. Cookie-authenticated writes require X-Courier-Client: 1 and, when supplied, an allowed frontend Origin.
5. Keep allow_mutations=false and allow_provider_callbacks=false until a particular write is authorized. Do not Run All with writes enabled.
6. Logout before changing roles. Never export cookies, OTPs, tokens, webhook secrets or payment credentials.

## Setup

Requirements: Node.js 22–26, npm, PostgreSQL and Redis. Provider, SMTP, OAuth and storage integrations require your own configuration.

```bash
npm ci
npx prisma generate
```

Copy .env.example to .env, set real connection values and distinct strong JWT secrets, then apply migrations to the intended database:

```bash
npm run db:deploy
npm run dev
```

The local API is http://localhost:5000/api/v1. Optional demo seeding requires deliberate ALLOW_DEMO_SEED=true; do not seed a populated production database.

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm start
```

Integration tests require isolated INTEGRATION_DATABASE_URL and INTEGRATION_REDIS_URL. Read the isolation guards before running. Staging/provider scripts may create records or contact configured services; review their inputs and obtain authorization first.

## Security and payment integrity

Never expose server secrets through frontend public variables. Production cookies require HTTPS. Rate limits, allowed origins, CSRF-style client-header checks, database role verification and audit trails supplement role authorization.

A success redirect is not payment proof. Only verified provider amount/currency/reference and matching shipment establish PAID. Unsigned webhook payloads cannot establish payment success. Definitive failed attempts can retry; ambiguous provider results are reconciled to avoid duplicate charges.

## Operational limitations

This is an evaluation deployment, not a verified licensed logistics business. Use Stripe test mode/bKash sandbox only. COD and delivery fees are different ledgers. Administrator remittance records document transfers already performed externally; the app does not automatically send money.

Paid cancellation refunds, automatic withdrawal, 30-day account purging, 90-day archival and guaranteed payout/compensation schedules are not implemented. Coverage and pricing are administrator-approved database configuration; unapproved routes must remain blocked. Soft deletion is recoverable archival, not permanent erasure.

Demo/test records retained in the database may affect aggregate statistics. Do not present them as verified commercial volume.

## Deployment and submission

Pushes to main run configured checks and trigger the connected Vercel project. Apply required Prisma migrations before enabling affected features. Verify /health/live, /health/ready, /docs and role-based flows on the deployed commit.

Submit the repositories, live URLs, public API documentation, demo credentials and a genuine 5–10 minute shareable video. The [frontend recording guide](https://github.com/mdshamim-mern/courier-frontend/blob/main/docs/demo-recording.bn.md) supplies a script; a video URL is still required.

Developed by [Md Shamim](https://github.com/mdshamim-mern).
