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
