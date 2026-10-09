import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import dotenv from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
dotenv.config();
const config = JSON.parse(
	await readFile(
		new URL("./approved-launch-config.json", import.meta.url),
		"utf8",
	),
);
const target = process.env.STAGING_DATABASE_URL;
if (!target || process.env.DATABASE_URL !== target)
	throw new Error("Explicit matching staging target required");
const prisma = new PrismaClient({ datasources: { db: { url: target } } });
try {
	const ready =
		await prisma.$queryRaw`SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL AND migration_name IN ('20261009000000_courier_operations','20261009010000_dropoff_and_delivery_cutoff')`;
	if (ready.length !== 2)
		throw new Error("Both approved migrations must be applied first");
	if (!process.argv.includes("--apply")) {
		console.log(
			JSON.stringify({
				task: "approved_launch_config",
				dryRun: true,
				hubs: 3,
				areas: 9,
				rates: 161,
			}),
		);
	} else {
		const result = await prisma.$transaction(
			async (tx) => {
				await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(704529)`;
				const selected = [];
				for (const h of config.hubs) {
					const existing = await tx.hub.findUnique({ where: { name: h.name } });
					if (existing?.isDeleted)
						throw new Error("Review deleted hub before activation");
					const hub = await tx.hub.upsert({
						where: { name: h.name },
						create: { name: h.name, location: h.location, address: h.address },
						update: { location: h.location, address: h.address },
					});
					selected.push({ hub, h });
				}
				const tuples = selected.flatMap(({ hub, h }) =>
					h.areas.map(
						(a) =>
							Prisma.sql`(${randomUUID()},${a.name},${a.district},${a.upazila},${hub.id},${h.pickupEnabled},${h.dropoffEnabled},${h.deliveryEnabled},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
					),
				);
				await tx.$executeRaw(
					Prisma.sql`INSERT INTO public.service_areas (id,name,district,upazila,"hubId","pickupEnabled","dropoffEnabled","deliveryEnabled","createdAt","updatedAt") VALUES ${Prisma.join(tuples)} ON CONFLICT (name) DO UPDATE SET district=EXCLUDED.district,upazila=EXCLUDED.upazila,"hubId"=EXCLUDED."hubId","pickupEnabled"=EXCLUDED."pickupEnabled","dropoffEnabled"=EXCLUDED."dropoffEnabled","deliveryEnabled"=EXCLUDED."deliveryEnabled","updatedAt"=CURRENT_TIMESTAMP`,
				);
				const areas = await tx.serviceArea.findMany({
					where: {
						name: {
							in: config.hubs.flatMap((h) => h.areas.map((a) => a.name)),
						},
					},
				});
				const dhaka = areas.filter((a) => a.district === "ঢাকা"),
					bogura = areas.filter((a) => a.district === "বগুড়া"),
					plans = [];
				for (const from of dhaka)
					for (const to of [...dhaka, ...bogura]) {
						const tariff =
							to.district === "ঢাকা" ? config.withinDhaka : config.dhakaToBogura;
						for (const service of tariff.services)
							plans.push(
								Prisma.sql`(${randomUUID()},${from.id},${to.id},${service.type},${tariff.baseWeight},${tariff.baseCharge},${tariff.extraPerKg},${tariff.pickupFee},${tariff.codPercent},${service.days},${service.cutoffMinutes ?? null},true,CURRENT_TIMESTAMP)`,
							);
					}
				await tx.$executeRaw(
					Prisma.sql`INSERT INTO public.rate_plans (id,"pickupAreaId","receiverAreaId","serviceType","baseWeight","baseCharge","extraPerKg","pickupFee","codPercent","deliveryDays","cutoffMinutes",active,"updatedAt") VALUES ${Prisma.join(plans)} ON CONFLICT ("pickupAreaId","receiverAreaId","serviceType") DO UPDATE SET "baseWeight"=EXCLUDED."baseWeight","baseCharge"=EXCLUDED."baseCharge","extraPerKg"=EXCLUDED."extraPerKg","pickupFee"=EXCLUDED."pickupFee","codPercent"=EXCLUDED."codPercent","deliveryDays"=EXCLUDED."deliveryDays","cutoffMinutes"=EXCLUDED."cutoffMinutes",active=true,"updatedAt"=CURRENT_TIMESTAMP`,
				);
				await tx.auditLog.create({
					data: {
						action: "APPLY_HUMAN_APPROVED_LAUNCH_CONFIGURATION",
						entityId: config.approvedOn,
						entityType: "OPERATIONS",
						details: {
							approvedOn: config.approvedOn,
							hubs: selected.map((s) => s.hub.id),
							areas: areas.map((a) => a.id),
							rateCount: plans.length,
							configSha256: createHash("sha256")
								.update(JSON.stringify(config))
								.digest("hex"),
							reverseAndBoguraLocalTariffsNotApproved: true,
						},
					},
				});
				return {
					hubs: selected.length,
					areas: areas.length,
					rates: plans.length,
				};
			},
			{ timeout: 120000, maxWait: 20000 },
		);
		console.log(
			JSON.stringify({
				task: "approved_launch_config",
				applied: true,
				...result,
			}),
		);
	}
} finally {
	await prisma.$disconnect();
}
