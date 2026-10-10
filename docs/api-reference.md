# Dropzo Courier & Logistics API reference

Updated for the assignment completion release on 10 October 2026. This is source-aligned documentation, not a claim that every write endpoint was exercised on live records.

## Files and base URLs

- Collection: `../Courier-Logistics-Updated.postman_collection.json` (Postman v2.1, 67 request examples).
- Environment: `../Courier-Logistics-Live.postman_environment.json`.
- Server: https://courier-logistics-backend-lake.vercel.app
- API: https://courier-logistics-backend-lake.vercel.app/api/v1
- Frontend: https://courier-frontend-sigma.vercel.app
- Public Postman-style reference: https://courier-logistics-backend-lake.vercel.app/docs (read-only; not a Postman-hosted publication or Swagger UI).
- Downloads: `/docs/postman/collection` and `/docs/postman/environment` on the server host.
- The collection covers all 58 unique versioned endpoints plus root/liveness/readiness (61 unique endpoints).
- Includes 131 sanitized illustrative success/error responses, request-level contract assertions and existing quote/booking variable capture. Examples show representative fields, not recorded live transaction evidence.
- Earlier publication: https://documenter.getpostman.com/view/56161283/2sBYB1P8Wz. The supplied cleaned export contains 37 requests and no saved response examples; it is historical and does not include current operations/Stripe endpoints.
- Bangla import/publication instructions: https://courier-logistics-backend-lake.vercel.app/docs/postman/publishing. Importing a new collection does not automatically replace an earlier Documenter publication.

## Import and authentication

1. Import both JSON files into a recent Postman desktop version. Select **Dropzo Live - Evaluation (writes disabled)**.
2. Keep the cookie jar enabled. Fill the dedicated evaluation account password locally; exports intentionally have blank password fields.
3. Send the appropriate **admin/customer/courier login** request. Successful login sets HttpOnly `accessToken` and `refreshToken` cookies. The JSON response contains safe user/role information, not accessToken.
4. Send **Current account and profiles** to confirm the role. Log out before switching roles because all roles use the same API host and cookie jar.
5. All generated requests include `X-Courier-Client: 1`. Cookie-authenticated writes require this header. If an Origin header is sent, it must match the configured frontend origin.
6. `POST /auth/refresh-token` reads the refresh cookie, not a JSON token property. Logout revokes the current session and clears its cookies.
7. Bearer tokens remain accepted by protected API routes, but the old README instruction to extract a token from login JSON is obsolete.

Dedicated Admin, Customer and Courier credentials documented in the existing backend README were individually verified by live login, GET /users/me and logout (all 200). No accounts, roles, parcels or payments were changed by that check.

## Safety defaults

- `allow_mutations=false` skips resource writes and OTP/email/account-changing requests.
- `allow_provider_callbacks=false` skips both provider callback GET requests and Stripe webhook POST.
- Session login/refresh/logout and quote calculations are allowed with writes disabled.
- The collection uses the official [Postman skipRequest pre-request mechanism](https://learning.postman.com/v11/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-execution).
- These are client safeguards, not server authorization. Never **Run All** with write flags enabled. Enable only a specific, authorized evaluation operation against records you own.
- Provider callback/webhook entries are reference contracts, not fake-payment tools. A real Stripe-signed raw payload is required for the webhook.
- Do not export/share live session cookies, bearer tokens, OAuth tokens, OTPs, signatures, payment secrets or personal passwords.

## Endpoint inventory

Paths below are relative to /api/v1 except /, /health/live and /health/ready. `:id` represents the matching environment UUID variable.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | API root |
| GET | `/health/live` | Public | Liveness |
| GET | `/health/ready` | Public | Database and Redis readiness |
| POST | `/auth/login` | Public | Sign in with the selected account role |
| POST | `/auth/register` | Public | Register customer and send email OTP |
| POST | `/auth/verify-email` | Public | Verify registration email |
| POST | `/auth/google` | Public | Google identity login |
| POST | `/auth/refresh-token` | Refresh cookie | Refresh cookie session |
| POST | `/auth/forgot-password` | Public | Request password reset |
| POST | `/auth/reset-password` | Public | Complete password reset |
| POST | `/auth/logout` | Current session | Logout current session |
| GET | `/users/me` | ADMIN / CUSTOMER / COURIER | Current account and profiles |
| PATCH | `/users/me` | ADMIN / CUSTOMER / COURIER | Update own profile |
| PATCH | `/users/profile-image` | ADMIN / CUSTOMER / COURIER | Upload own avatar |
| GET | `/operations/coverage` | Public | List approved service areas |
| POST | `/operations/quote` | Public | Quote one parcel |
| POST | `/operations/quotes` | CUSTOMER | Quote 1-100 parcels |
| GET | `/operations/mine` | CUSTOMER / COURIER | Own operations and COD ledger |
| PUT | `/operations/business` | CUSTOMER | Submit or update merchant business |
| POST | `/operations/applications` | CUSTOMER | Submit worker application |
| GET | `/operations/admin` | ADMIN | Configuration, reviews and cash records |
| POST | `/operations/areas` | ADMIN | Create service area |
| PATCH | `/operations/areas/:id` | ADMIN | Update service area |
| POST | `/operations/rates` | ADMIN | Create approved tariff |
| PATCH | `/operations/rates/:id` | ADMIN | Update approved tariff |
| PATCH | `/operations/business/:id/review` | ADMIN | Review merchant business |
| PATCH | `/operations/applications/:id/review` | ADMIN | Review worker application |
| PATCH | `/operations/collections/:id` | ADMIN | Record merchant transfer already completed |
| GET | `/hubs` | ADMIN / CUSTOMER / COURIER | List active hubs |
| GET | `/hubs/:id` | ADMIN / CUSTOMER / COURIER | Hub detail |
| POST | `/hubs` | ADMIN | Create hub |
| PATCH | `/hubs/:id` | ADMIN | Update hub |
| DELETE | `/hubs/:id` | ADMIN | Soft archive unused hub |
| POST | `/shipments` | ADMIN / CUSTOMER | Create booking from reviewed quote |
| POST | `/shipments/bulk` | CUSTOMER | Create 1-100 bookings atomically |
| GET | `/shipments` | ADMIN / CUSTOMER / COURIER | List scoped shipments |
| GET | `/shipments/summary` | ADMIN / CUSTOMER / COURIER | Full scoped shipment totals |
| GET | `/shipments/track/:trackingId` | Public | Public status-only tracking |
| GET | `/shipments/:id` | ADMIN / owning CUSTOMER / assigned COURIER | Shipment detail, proof and printable-label data |
| PATCH | `/shipments/:id/assign` | ADMIN | Assign first pickup worker |
| PATCH | `/shipments/:id/handoff` | ADMIN | Hand over to destination-hub worker |
| PATCH | `/shipments/:id/status` | ADMIN / assigned COURIER | Recipient-acknowledged delivery and product cash |
| PATCH | `/shipments/:id/cancel` | owning CUSTOMER | Cancel own eligible parcel |
| GET | `/couriers` | ADMIN | List couriers |
| POST | `/couriers` | ADMIN | Create verified courier account |
| GET | `/couriers/:id` | ADMIN / own COURIER | Courier profile |
| PATCH | `/couriers/:id` | ADMIN / own COURIER | Update courier and availability |
| GET | `/couriers/:id/history-earnings` | ADMIN / own COURIER | Actual history and configured earnings |
| POST | `/payments/stripe/initiate` | owning CUSTOMER | Stripe test checkout for delivery fee |
| POST | `/payments/initiate` | owning CUSTOMER | bKash sandbox checkout for delivery fee |
| POST | `/payments/reconcile` | owning CUSTOMER | Reconcile provider-verified payment |
| GET | `/payments` | ADMIN / owning CUSTOMER | Payment history |
| GET | `/payments/:id` | ADMIN / owning CUSTOMER | Payment detail |
| GET | `/payments/stripe/callback` | Provider redirect | Stripe success redirect verification |
| GET | `/payments/bkash/callback` | Provider redirect | bKash result redirect |
| POST | `/payments/stripe/webhook` | Valid Stripe signature | Stripe signed raw-body webhook |
| GET | `/admin/dashboard-stats` | ADMIN | Live dashboard statistics |
| GET | `/admin/users` | ADMIN | List accounts |
| PATCH | `/admin/users/:id/status` | ADMIN | Update account status |
| PATCH | `/admin/users/:id/role` | ADMIN | Update account role |
| GET | `/audit-logs` | ADMIN | Paginated raw audit events |

## Response and errors

Most API responses use `{ success, message, data, meta? }`. Lists carry pagination metadata. Health responses use `{ status }`. Stripe webhook success uses `{ received: true }`. Validation/auth/server errors carry `success: false`, a message and optional validation sources; do not rely on provider or database internals being exposed.

Typical status meanings: 400 invalid request, 401 missing/expired credentials, 403 role/account/email verification denied, 404 missing resource, 409 business/workflow conflict, 429 rate limit, 503 unavailable infrastructure/provider configuration.

All resource IDs must be UUIDs. Public tracking accepts a real `TRK-` tracking ID and returns status/timestamps without receiver identity/address. List parameters include page (>=1), limit (1-100), supported sortBy, sortOrder (asc/desc), searchTerm and resource-specific role/status/isAvailable/task filters. Shipment tasks: PICKUP, DELIVERY, FAILED, LATE, URGENT, TODAY, UNASSIGNED.

## Booking and quotation

1. Read approved coverage and choose actual pickup/delivery area IDs. Do not submit arbitrary hub IDs: route hubs are resolved server-side.
2. Set pickup_area_id, receiver_area_id, weight, cod_amount and declared_value. Defaults represent a 1 kg test parcel with no COD. Illustrative test addresses/numbers in request bodies are not a claim of live commercial customers.
3. Set pickup_at to an ISO timestamp with offset, after now and within 30 days. If left blank, the pre-request script sets it to 24 hours after the current Postman time; inspect it before confirming a booking.
4. **Quote one parcel** uses the approved NEXT_DAY route by default. Change serviceType/pickupMode to an actually approved route when needed. Supported services: STANDARD, EXPRESS, SAME_DAY, NEXT_DAY; collection modes: HOME or BRANCH.
5. A successful quote automatically saves quote_version (rateUpdatedAt), quoted_delivery_charge, quoted_cod_fee and quoted_service_type. Booking posts these exact values. A stale/changed quote returns 409: request a new quote and review again.
6. **Create booking** generates booking_request_id once if empty and saves shipment_id/tracking_id on 201. Keep the same request ID for identical retries. Clear it and request a fresh quote before a different new booking.
7. COD cannot exceed declaredValue and requires an administrator-approved merchant account. Doorstep collection/drop-off/delivery availability and active route hubs are enforced server-side.
8. Bulk quotes and bulk bookings accept arrays of 1-100 items, not an `items` object. Each bulk booking needs its own request UUID and exact per-row quote. The sample contains only one row; prepare additional rows individually.
9. Monetary numeric fields remain JSON numbers, not quoted strings. Weight is 0.01-100 kg. Money is capped at 1,000,000 with two-decimal precision.
10. Same-day cutoff is interpreted in Bangladesh time. A request after the approved cutoff can become NEXT_DAY and must be re-reviewed at the effective approved price. Branch drop-off requires explicit area capability.

## Parcel work and proof

Assignment/handover request field `courierId` is the worker's **User ID**, not the Courier profile ID. Courier profile URLs use the **Courier profile ID**. Inspect users/me, courier lists and operation data carefully.

Allowed normal flow: PENDING -> ASSIGNED -> PICKED_UP -> AT_ORIGIN_HUB -> IN_TRANSIT -> AT_DESTINATION_HUB -> OUT_FOR_DELIVERY -> DELIVERED. Failure/return/cancel transitions are validated separately by the state machine; do not skip steps.

Hub-arrival changes require the correct hubId. Worker availability, hub match, maximum load, payment eligibility and assigned-worker ownership are checked. Delivery requires receiverName, a valid recipient-drawn PNG data URL signature and acknowledged=true. This records recipient acknowledgment, not OTP identity verification. Exact product collectedAmount is checked for COD deliveries. Never use a dummy signature to assert delivery of an actual parcel.

A live hub with linked service areas/workers/parcels/transfers/tracking history cannot be deleted; the unused-hub endpoint soft archives only. Hub name/location/address are trimmed and bounded at 120/120/500 characters. Reassigning a courier with active parcels is blocked. Public applications do not automatically grant COURIER privileges.

## Merchant reviews and manual cash settlement

Business submission uses shopName, pickupAddress, contactNumber, payoutMethod (BANK/BKASH), accountName and accountNumber. Changing payout details removes prior approval until reviewed.

Worker applications use contactNumber, area and vehicleType (BICYCLE/MOTORBIKE/VAN). Administrator approval records an explicit review note and assigns a valid hub.

Collections RECEIVE/PAY are ledger records for transfers already completed outside this app, not automatic money transfers. RECEIVE requires an existing cash receipt reference. PAY requires an existing payout reference and the current approved payout account updatedAt as accountVersion. Never mark PAY based only on pressing a button or a successful delivery-fee payment.

## Real test payments

Stripe `/payments/stripe/initiate` and bKash `/payments/initiate` take only shipmentId. The backend derives the payable delivery fee from the owned shipment; the client cannot select a price or assert PAID. Product COD is separate.

Use Stripe test mode or bKash sandbox only for evaluation. Follow the provider checkout URL. Success/cancel/failure redirect pages are not payment proof by themselves: provider verification/webhook/reconciliation determines status.

An approved quote below Stripe's supported minimum is correctly rejected with an actionable error. Demonstrate payment using a genuinely eligible approved route/parcel, not an invented fee or deliberately incorrect weight. The previous source verification notes record a successful provider-paid Stripe test session, but a fresh customer-browser booking/payment walkthrough is still needed for submission.

bKash sandbox wallet/provider availability can block evaluation. bKash does not replace the assignment's required Stripe or SSLCommerz integration. Webhook signatures and raw bodies must come from the provider; manual synthetic PAID updates are not supported.

## Verification boundary

Endpoint coverage was checked against every route module and the top-level Stripe webhook. JSON parses, request scripts compile, and default mutation/callback guards were tested without sending writes. Publishing documentation does not seed data, approve merchants or perform physical dispatch. Any browser checkout evidence is recorded separately.

The backend verification suite contains 63 passing tests after this documentation update, including complete route coverage, example/script contracts, safe guards, public documentation/download checks and chart aggregation. Type checking, lint and production build also pass. The earlier six-month revenue SQL check used a read-only query against the configured database. Browser regressions use test fixtures; they are not proof of live payment settlement. Check GitHub CI for the published commit and the frontend release checklist for current browser results.

## How to interpret verification evidence

| Evidence | What it demonstrates | What it does not demonstrate |
|---|---|---|
| Route inventory regression | Every current route appears in the 67-request collection | Every route was executed against live records |
| Postman script/example regression | Scripts compile, assertions accept documented positive examples, default write/callback guards work | A saved example is a live capture |
| Backend automated tests | Session, validation, pricing, ownership, state/payment safeguards under controlled tests | Physical delivery or real-money settlement |
| Historical live three-role login/read/logout smoke | Dedicated accounts authenticated and authorized reads worked at that time | Live write coverage or a current provider checkout |
| Frontend CI: 134 browser tests | UI behavior using loopback/intercepted fixtures; run https://github.com/mdshamim-mern/courier-frontend/actions/runs/38058462505 | Live Stripe/bKash payment success |
| Provider checkout/reconciliation evidence | Only a separately verified provider test transaction proves its payment state | Commercial delivery, recipient identity or automatic COD payout |

Request assertions target successful authorized inputs. Missing variables, expired sessions, inactive coverage, stale quotes or invalid transitions correctly fail those assertions. Fix prerequisites rather than treating an arbitrary HTTP response as a passing test. Do not run the entire mixed-role collection with writes enabled.
