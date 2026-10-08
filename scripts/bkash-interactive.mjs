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
