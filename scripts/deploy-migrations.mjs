import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config();
const runtimeUrl = process.env.DATABASE_URL;
if (!runtimeUrl) throw new Error("DATABASE_URL is required");
const requested = new URL(runtimeUrl),
	direct = new URL(runtimeUrl);
if (direct.hostname.endsWith(".neon.tech"))
	direct.hostname = direct.hostname.replace("-pooler.", ".");
const schema = requested.searchParams.get("schema") || "public";
direct.searchParams.set("schema", schema);
direct.searchParams.set("connect_timeout", "30");
const clients = [runtimeUrl, direct.toString()].map(
	(connectionString) =>
		new pg.Client({
			connectionString,
			connectionTimeoutMillis: 15000,
			query_timeout: 20000,
		}),
);
try {
	const identity = await Promise.all(
		clients.map(async (client) => {
			await client.connect();
			return (
				await client.query(
					"SELECT current_database() AS name,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid",
				)
			).rows[0];
		}),
	);
	if (
		identity[0].name !== identity[1].name ||
		identity[0].oid !== identity[1].oid
	)
		throw new Error("Migration database identity differs");
	const migrationTable =
		'"' + schema.replaceAll('"', '""') + '"."_prisma_migrations"';
	let current = false;
	const exists = (
		await clients[1].query("SELECT to_regclass($1) IS NOT NULL AS present", [
			migrationTable,
		])
	).rows[0].present;
	if (exists) {
		const records = (
			await clients[1].query(
				"SELECT migration_name,checksum,finished_at,rolled_back_at FROM " +
					migrationTable,
			)
		).rows;
		const files = (
			await readdir("prisma/migrations", { withFileTypes: true })
		).filter((entry) => entry.isDirectory());
		current = !records.some((row) => !row.finished_at && !row.rolled_back_at);
		for (const file of files) {
			const hash = createHash("sha256")
				.update(
					await readFile("prisma/migrations/" + file.name + "/migration.sql"),
				)
				.digest("hex");
			if (
				!records.some(
					(row) =>
						row.migration_name === file.name &&
						row.finished_at &&
						!row.rolled_back_at &&
						row.checksum === hash,
				)
			)
				current = false;
		}
	}
	if (current) {
		console.log(
			JSON.stringify({
				task: "deploy_migrations",
				success: true,
				upToDate: true,
				checksumsVerified: true,
			}),
		);
	} else {
		const result = spawnSync(
			process.execPath,
			["node_modules/prisma/build/index.js", "migrate", "deploy"],
			{
				env: { ...process.env, DATABASE_URL: direct.toString() },
				encoding: "utf8",
				timeout: 300000,
				windowsHide: true,
			},
		);
		const output = (result.stdout || "") + "\n" + (result.stderr || "");
		console.log(
			JSON.stringify({
				task: "deploy_migrations",
				exitCode: result.status,
				errorCode: result.error?.code,
				prismaCodes: [...new Set(output.match(/\bP\d{4}\b/g) || [])],
				success:
					/All migrations have been successfully applied|No pending migrations to apply/.test(
						output,
					),
			}),
		);
		if (result.status !== 0) process.exitCode = 1;
	}
} catch {
	console.log(JSON.stringify({ task: "deploy_migrations", failed: true }));
	process.exitCode = 1;
} finally {
	await Promise.all(clients.map((client) => client.end().catch(() => {})));
}
