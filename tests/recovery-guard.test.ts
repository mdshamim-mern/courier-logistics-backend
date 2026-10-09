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
