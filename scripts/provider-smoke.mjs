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
