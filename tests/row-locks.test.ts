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
