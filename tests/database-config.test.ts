import "./environment";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function configuration(overrides: Record<string, string>) {
	return spawnSync(
		process.execPath,
		[
			"--import",
			"tsx",
			"--eval",
			"try { const config = require('./src/app/config').default; console.log(JSON.stringify({ maxWait: config.prisma_transaction_max_wait_ms, timeout: config.prisma_transaction_timeout_ms })); } catch { process.exitCode = 1; }",
		],
		{
			cwd: process.cwd(),
			env: { ...process.env, ...overrides },
			encoding: "utf8",
			timeout: 15000,
			windowsHide: true,
		},
	);
}

test("database transaction limits accept bounded explicit configuration", () => {
	const result = configuration({
		PRISMA_TRANSACTION_MAX_WAIT_MS: "10000",
		PRISMA_TRANSACTION_TIMEOUT_MS: "20000",
	});
	assert.equal(result.status, 0);
	assert.deepEqual(JSON.parse(result.stdout.trim()), {
		maxWait: 10000,
		timeout: 20000,
	});
});

test("database transaction timeout rejects zero", () => {
	assert.equal(configuration({ PRISMA_TRANSACTION_TIMEOUT_MS: "0" }).status, 1);
});

test("database transaction timeout rejects excessive lock duration", () => {
	assert.equal(
		configuration({ PRISMA_TRANSACTION_TIMEOUT_MS: "60001" }).status,
		1,
	);
});

test("database transaction acquisition wait rejects excessive duration", () => {
	assert.equal(
		configuration({ PRISMA_TRANSACTION_MAX_WAIT_MS: "30001" }).status,
		1,
	);
});

test("SMTP send deadlines accept a bounded value", () => {
	assert.equal(configuration({ SMTP_SEND_TIMEOUT_MS: "25000" }).status, 0);
});

test("SMTP send deadlines reject zero and excessive duration", () => {
	for (const value of ["0", "60001", "invalid"])
		assert.equal(configuration({ SMTP_SEND_TIMEOUT_MS: value }).status, 1);
});
