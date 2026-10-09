import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { assertOwnedRecoverySchema } from "./recovery-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
if (!process.env.STAGING_DATABASE_URL)
	throw new Error("Explicit STAGING_DATABASE_URL is required");
const runId = randomUUID();
const schema = `courier_recovery_${runId.replaceAll("-", "")}_test`;
const target = new URL(process.env.STAGING_DATABASE_URL);
target.searchParams.set("schema", schema);
const nativeUrl = new URL(process.env.STAGING_DATABASE_URL);
for (const key of ["schema", "connection_limit", "pool_timeout", "pgbouncer"])
	nativeUrl.searchParams.delete(key);
const databaseName = decodeURIComponent(nativeUrl.pathname.slice(1));
if (!databaseName || !["postgres:", "postgresql:"].includes(nativeUrl.protocol))
	throw new Error("Invalid staging database target");
const environment = {
	...process.env,
	DATABASE_URL: target.toString(),
	PGDATABASE: databaseName,
	PGHOST: nativeUrl.hostname,
	PGPORT: nativeUrl.port || "5432",
	PGUSER: decodeURIComponent(nativeUrl.username),
	PGPASSWORD: decodeURIComponent(nativeUrl.password),
	PGSSLMODE:
		nativeUrl.searchParams.get("sslmode") || process.env.PGSSLMODE || "prefer",
	PGCHANNELBINDING: nativeUrl.searchParams.get("channel_binding") || "prefer",
	PGCONNECT_TIMEOUT: "15",
};
const client = new pg.Client({
	connectionString: process.env.STAGING_DATABASE_URL,
	connectionTimeoutMillis: 15000,
	query_timeout: 20000,
});
let ownedOid;
let archive;
let directory;
let failed = false;
let restoreStarted = false;
const started = Date.now();

function run(task, binary, args) {
	const result = spawnSync(binary, args, {
		cwd: root,
		env: environment,
		encoding: "utf8",
		timeout: 180000,
		windowsHide: true,
	});
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	console.log(
		JSON.stringify({
			task,
			exitCode: result.status,
			errorCode: result.error?.code,
			prismaErrorCodes: [...new Set(output.match(/\bP\d{4}\b/g) ?? [])],
			databaseErrorCodes: [
				...new Set(
					[
						...output.matchAll(
							/(?:Database error code|SQLSTATE):\s*([A-Z0-9]{5})/g,
						),
					].map((match) => match[1]),
				),
			],
			migrationNames: [
				...new Set(
					[...output.matchAll(/Migration name:\s*([a-z0-9_]+)/g)].map(
						(match) => match[1],
					),
				),
			],
		}),
	);
	if (result.status !== 0) throw new Error(`${task} failed`);
}
async function oid() {
	return (
		await client.query("SELECT oid FROM pg_namespace WHERE nspname = $1", [
			schema,
		])
	).rows[0]?.oid;
}
async function snapshot() {
	await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
	try {
		await client.query("SET LOCAL search_path TO pg_catalog");
		const columns = await client.query(
			"SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 ORDER BY table_name, ordinal_position",
			[schema],
		);
		const indexes = await client.query(
			"SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 ORDER BY indexname",
			[schema],
		);
		const constraints = await client.query(
			"SELECT c.conname, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = $1 ORDER BY c.conname",
			[schema],
		);
		const user = await client.query(
			`SELECT "id", "email", "tokenVersion" FROM "${schema}"."users" WHERE "id" = $1`,
			[runId],
		);
		const shipment = await client.query(
			`SELECT "trackingId", "senderId", "price", "status" FROM "${schema}"."shipments" WHERE "senderId" = $1 ORDER BY "trackingId"`,
			[runId],
		);
		const marker = await client.query(
			`SELECT run_id FROM "${schema}"."recovery_marker"`,
		);
		const result = JSON.stringify({
			columns: columns.rows,
			indexes: indexes.rows,
			constraints: constraints.rows,
			user: user.rows,
			shipment: shipment.rows,
			marker: marker.rows,
		});
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}
try {
	run("pg_dump_available", process.env.PG_DUMP_BIN || "pg_dump", ["--version"]);
	run("pg_restore_available", process.env.PG_RESTORE_BIN || "pg_restore", [
		"--version",
	]);
	await client.connect();
	await client.query(`CREATE SCHEMA "${schema}"`);
	ownedOid = await oid();
	assertOwnedRecoverySchema(schema, ownedOid, ownedOid);
	run("recovery_schema_migrations", process.execPath, [
		"node_modules/prisma/build/index.js",
		"migrate",
		"deploy",
	]);
	await client.query(
		`CREATE TABLE "${schema}"."recovery_marker" (run_id uuid PRIMARY KEY)`,
	);
	await client.query(`INSERT INTO "${schema}"."recovery_marker" VALUES ($1)`, [
		runId,
	]);
	run("recovery_owned_fixture", process.execPath, [
		"--input-type=module",
		"--eval",
		`import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); try { await p.user.create({ data: { id: '${runId}', name: 'Recovery fixture only', email: '${runId}@recovery.test', emailVerified: true, customer: { create: {} }, sentShipments: { create: { trackingId: 'RECOVERY-${runId}', receiverName: 'Recovery fixture', receiverPhone: '00000000000', receiverAddress: 'Recovery fixture only', weight: 1, price: 120 } } } }); } catch { process.exitCode = 1; } finally { await p.$disconnect(); }`,
	]);
	const before = await snapshot();
	directory = await mkdtemp(path.join(os.tmpdir(), "courier-recovery-"));
	archive = path.join(directory, "owned-schema.dump");
	run("owned_schema_backup", process.env.PG_DUMP_BIN || "pg_dump", [
		"--format=custom",
		"--no-owner",
		"--no-acl",
		`--schema=${schema}`,
		`--file=${archive}`,
	]);
	const archiveBytes = await readFile(archive);
	if (!archiveBytes.subarray(0, 5).equals(Buffer.from("PGDMP")))
		throw new Error("Invalid custom archive");
	const digest = createHash("sha256").update(archiveBytes).digest("hex");
	assertOwnedRecoverySchema(schema, ownedOid, await oid());
	restoreStarted = true;
	run("owned_schema_restore", process.env.PG_RESTORE_BIN || "pg_restore", [
		"--dbname",
		databaseName,
		"--clean",
		"--if-exists",
		"--no-owner",
		"--no-acl",
		"--exit-on-error",
		`--schema=${schema}`,
		archive,
	]);
	const marker = await client.query(
		`SELECT run_id FROM "${schema}"."recovery_marker"`,
	);
	if (marker.rows.length !== 1 || marker.rows[0].run_id !== runId)
		throw new Error("Restored ownership marker mismatch");
	ownedOid = await oid();
	assertOwnedRecoverySchema(schema, ownedOid, ownedOid);
	const after = await snapshot();
	if (before !== after) {
		const expected = JSON.parse(before);
		const actual = JSON.parse(after);
		for (const key of Object.keys(expected)) {
			if (JSON.stringify(expected[key]) === JSON.stringify(actual[key]))
				continue;
			const index = expected[key].findIndex(
				(row, position) =>
					JSON.stringify(row) !== JSON.stringify(actual[key][position]),
			);
			console.log(
				JSON.stringify({
					task: "recovery_comparison_mismatch",
					section: key,
					expectedCount: expected[key].length,
					actualCount: actual[key].length,
					index,
					...(["columns", "indexes", "constraints"].includes(key)
						? { expected: expected[key][index], actual: actual[key][index] }
						: {}),
				}),
			);
		}
		throw new Error(
			"Restored schema, indexes, constraints or fixture data mismatch",
		);
	}
	console.log(
		JSON.stringify({
			task: "backup_restore_drill",
			success: true,
			scope: "runner_owned_schema_only",
			archiveBytes: archiveBytes.length,
			archiveSha256: digest,
			elapsedMs: Date.now() - started,
		}),
	);
} catch (error) {
	failed = true;
	console.log(
		JSON.stringify({
			task: "backup_restore_drill",
			success: false,
			errorCode: error.code ?? error.name,
		}),
	);
} finally {
	if (ownedOid) {
		try {
			const currentOid = await oid();
			if (restoreStarted && currentOid !== ownedOid) {
				const marker = await client.query(
					`SELECT run_id FROM "${schema}"."recovery_marker"`,
				);
				if (marker.rows.length !== 1 || marker.rows[0].run_id !== runId)
					throw new Error("Recovery cleanup ownership mismatch");
				ownedOid = currentOid;
			}
			assertOwnedRecoverySchema(schema, ownedOid, currentOid);
			await client.query(`DROP SCHEMA "${schema}" CASCADE`);
			console.log(
				JSON.stringify({ task: "recovery_schema_cleanup", success: true }),
			);
		} catch (error) {
			failed = true;
			console.log(
				JSON.stringify({
					task: "recovery_schema_cleanup",
					success: false,
					errorCode: error.code ?? error.name,
					schema,
				}),
			);
		}
	}
	await client.end().catch(() => undefined);
	if (archive)
		await unlink(archive).catch(() => {
			failed = true;
		});
	if (directory)
		await rmdir(directory).catch(() => {
			failed = true;
		});
}
if (failed) process.exitCode = 1;
