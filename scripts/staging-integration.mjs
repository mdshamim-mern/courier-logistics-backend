import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
const stagingUrl = process.env.STAGING_DATABASE_URL;
const redisUrl = process.env.INTEGRATION_REDIS_URL;
if (!stagingUrl || !redisUrl)
	throw new Error(
		"STAGING_DATABASE_URL and INTEGRATION_REDIS_URL are required",
	);
const schema = `courier_integration_${randomUUID().replaceAll("-", "")}_test`;
const target = new URL(stagingUrl);
target.searchParams.set("schema", schema);
const client = new pg.Client({
	connectionString: stagingUrl,
	connectionTimeoutMillis: 15000,
	query_timeout: 15000,
});
const environment = {
	...process.env,
	DATABASE_URL: target.toString(),
	INTEGRATION_DATABASE_URL: target.toString(),
	INTEGRATION_OWNED_SCHEMA: schema,
	NODE_ENV: "test",
};
let ownedOid;
let connected = false;
let failed = false;
function run(task, args) {
	const result = spawnSync(process.execPath, args, {
		cwd: root,
		env: environment,
		encoding: "utf8",
		timeout: task === "integration_tests" ? 900000 : 300000,
		windowsHide: true,
	});
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	const summary = {
		task,
		exitCode: result.status,
		errorCode: result.error?.code,
		prismaErrorCodes: [...new Set(output.match(/\bP\d{4}\b/g) ?? [])],
	};
	if (task === "integration_tests") {
		summary.results = output
			.split(/\r?\n/)
			.filter((line) =>
				/^(?:ok \d+ - |not ok \d+ - |# (?:tests|pass|fail|cancelled|skipped|duration_ms) )/.test(
					line,
				),
			);
		let safeOutput = output;
		for (const [key, value] of Object.entries(process.env)) {
			if (
				value &&
				value.length > 3 &&
				/SECRET|PASSWORD|URL|KEY|EMAIL|TOKEN/.test(key)
			)
				safeOutput = safeOutput.replaceAll(value, "[REDACTED]");
		}
		safeOutput = safeOutput.replace(
			/(?:https?|postgres(?:ql)?|rediss?):\/\/\S+/g,
			"[REDACTED_URL]",
		);
		const lines = safeOutput.split(/\r?\n/);
		summary.diagnostics = [];
		for (let index = 0; index < lines.length; index++) {
			if (/^\s+error:/.test(lines[index])) {
				summary.diagnostics.push(
					...lines
						.slice(index, index + 22)
						.filter((line) => !/^\s*(?:stack:|at )/.test(line)),
				);
			}
		}
		summary.diagnostics = summary.diagnostics.slice(0, 60);
	} else {
		summary.migrationsApplied = output.includes(
			"All migrations have been successfully applied",
		);
	}
	console.log(JSON.stringify(summary));
	if (result.status !== 0) throw new Error(`${task} failed`);
}
try {
	await client.connect();
	connected = true;
	await client.query(`CREATE SCHEMA "${schema}"`);
	const created = await client.query(
		"SELECT oid FROM pg_namespace WHERE nspname = $1",
		[schema],
	);
	ownedOid = created.rows[0]?.oid;
	if (!ownedOid)
		throw new Error("Cannot verify ownership of the temporary schema");
	console.log(
		JSON.stringify({ task: "isolated_staging_schema", created: true }),
	);
	run("isolated_schema_migrations", [
		"node_modules/prisma/build/index.js",
		"migrate",
		"deploy",
	]);
	run("integration_tests", [
		"--import",
		"tsx",
		"--test",
		"--test-reporter=tap",
		"tests/integration/transactions.test.ts",
	]);
} catch (error) {
	failed = true;
	console.log(
		JSON.stringify({
			task: "staging_integration_runner",
			success: false,
			errorCode: error.code ?? error.name,
		}),
	);
} finally {
	if (connected && ownedOid) {
		try {
			const current = await client.query(
				"SELECT oid FROM pg_namespace WHERE nspname = $1",
				[schema],
			);
			if (current.rows[0]?.oid !== ownedOid)
				throw new Error("Temporary schema ownership changed");
			await client.query(`DROP SCHEMA "${schema}" CASCADE`);
			console.log(
				JSON.stringify({ task: "isolated_schema_cleanup", success: true }),
			);
		} catch (error) {
			failed = true;
			console.log(
				JSON.stringify({
					task: "isolated_schema_cleanup",
					success: false,
					errorCode: error.code ?? error.name,
					schema,
				}),
			);
		}
	}
	await client.end().catch(() => undefined);
}
if (failed) process.exitCode = 1;
