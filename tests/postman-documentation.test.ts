import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { documentationScript, renderDocumentation } from "../src/app/documentation-view";

const collection = JSON.parse(readFileSync("Courier-Logistics-Updated.postman_collection.json", "utf8"));
const environment = JSON.parse(readFileSync("Courier-Logistics-Live.postman_environment.json", "utf8"));
const requests = collection.item.flatMap((folder: { item: unknown[] }) => folder.item);
const normalized = (url: string) => url.split("?")[0].replace("{{base_url}}", "").replace("{{server_url}}", "").replace(/\{\{tracking_id\}\}/g, ":trackingId").replace(/\{\{[^}]+\}\}/g, ":id");

test("Postman documents every current versioned and root/health route", () => {
  const documented = new Set(requests.map((item: { request: { method: string; url: string } }) => item.request.method + " " + normalized(item.request.url)));
  const source = new Set(["GET /", "GET /health/live", "GET /health/ready", "POST /payments/stripe/webhook"]);
  for (const [module, prefix] of [["auth", "auth"], ["user", "users"], ["hub", "hubs"], ["shipment", "shipments"], ["courier", "couriers"], ["payment", "payments"], ["admin", "admin"], ["auditLog", "audit-logs"], ["operations", "operations"]]) {
    const route = readFileSync(`src/app/modules/${module}/${module}.route.ts`, "utf8");
    for (const match of route.matchAll(/router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g)) source.add(match[1].toUpperCase() + " /" + prefix + (match[2] === "/" ? "" : match[2]));
  }
  assert.equal(requests.length, 67);
  assert.equal(documented.size, 61);
  assert.deepEqual([...documented].sort(), [...source].sort());
});

test("every request has sanitized examples and executable positive contract assertions", () => {
  let assertions = 0;
  for (const item of requests) {
    assert.ok(item.response.length, item.name);
    for (const response of item.response) {
      assert.match(response.name, /Illustrative/);
      if (response._postman_previewlanguage === "json") JSON.parse(response.body);
      assert.equal(response.cookie.length, 0);
      assert.ok(!response.header.some((header: { key: string }) => header.key.toLowerCase() === "set-cookie"));
    }
    const sample = item.response[0];
    const values = new Map();
    const expect = (value: unknown) => {
      const property = (key: string) => assert.ok(Object.hasOwn(value as object, key), item.name + ": " + key);
      const type = (name: string) => assert.ok(name === "array" ? Array.isArray(value) : typeof value === name, item.name + ": " + name);
      return { not: { to: { have: { property: (key: string) => assert.ok(!Object.hasOwn(value as object, key)) } } }, to: { be: { a: type, an: type }, have: { property }, not: { have: { property: (key: string) => assert.ok(!Object.hasOwn(value as object, key)) } }, eql: (other: unknown) => assert.equal(value, other), include: (other: unknown) => assert.ok((value as string | unknown[]).includes(other as never)), match: (pattern: RegExp) => assert.match(value as string, pattern) } };
    };
    const pm = {
      response: { code: sample.code, json: () => JSON.parse(sample.body), headers: { get: (key: string) => sample.header.find((row: { key: string }) => row.key.toLowerCase() === key.toLowerCase())?.value }, to: { have: { status: (status: number) => assert.equal(sample.code, status) } } },
      environment: { set: (key: string, value: unknown) => values.set(key, value), get: (key: string) => values.get(key) },
      expect,
      test: (name: string, fn: () => void) => { fn(); assertions++; },
    };
    const script = item.event.find((event: { listen: string }) => event.listen === "test").script.exec.join("\n");
    vm.runInNewContext(script, { pm }, { timeout: 1000 });
  }
  assert.ok(assertions >= 200);
  assert.equal(requests.reduce((sum: number, item: { response: unknown[] }) => sum + item.response.length, 0), 131);
});

test("default collection guards skip writes and provider callbacks but allow reads and quotes", () => {
  const script = collection.event.find((event: { listen: string }) => event.listen === "prerequest").script.exec.join("\n");
  for (const item of requests) {
    let skipped = false;
    const values = new Map(environment.values.map((row: { key: string; value: string }) => [row.key, row.value]));
    vm.runInNewContext(script, { pm: { request: { method: item.request.method, url: { toString: () => item.request.url } }, environment: { get: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value) }, variables: { replaceIn: () => "00000000-0000-4000-8000-000000000001" }, execution: { skipRequest: () => { skipped = true; } } } }, { timeout: 1000 });
    const path = normalized(item.request.url);
    const provider = path.includes("/callback") || path.endsWith("/webhook");
    const safe = item.request.method === "GET" || ["/auth/login", "/auth/logout", "/auth/refresh-token", "/operations/quote", "/operations/quotes"].includes(path);
    assert.equal(skipped, provider || !safe, item.name);
  }
  for (const row of environment.values) if (row.type === "secret") assert.equal(row.value, "", row.key);
});

test("documentation uses CSP-compatible external assets, escapes content and never sends API requests", () => {
  const page = renderDocumentation(collection, "# Workflow\n<script>alert(1)</script>");
  assert.equal((page.match(/class="endpoint"/g) || []).length, 67);
  assert.match(page, /67 request examples · 61 unique endpoints · 12 folders/);
  assert.match(page, /script src="\/docs\/assets\/documentation.js" defer/);
  assert.match(page, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.ok(!page.includes("<script>alert"));
  assert.ok(!/on(click|load|error)=/.test(page));
  assert.ok(!/fetch\(|XMLHttpRequest|eval\(/.test(documentationScript));
  new vm.Script(documentationScript);
});
