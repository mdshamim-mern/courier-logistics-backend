import { Prisma } from "@prisma/client";
import config from "../config";

const schema = new URL(config.database_url).searchParams.get("schema") ?? "public";
export function rowLockQuery(table: "shipments" | "couriers" | "hubs", column: "id" | "userId", id: string, databaseSchema = schema) {
  const qualifiedTable = Prisma.raw(`"${databaseSchema.replace(/"/g, '""')}"."${table}"`);
  const field = Prisma.raw(`"${column}"`);
  return Prisma.sql`SELECT "id" FROM ${qualifiedTable} WHERE ${field} = ${id} FOR UPDATE`;
}

export const lockShipment = (tx: Prisma.TransactionClient, id: string) => tx.$queryRaw(rowLockQuery("shipments", "id", id));
export const lockCourier = (tx: Prisma.TransactionClient, userId: string) => tx.$queryRaw(rowLockQuery("couriers", "userId", userId));
export const lockHub = (tx: Prisma.TransactionClient, id: string) => tx.$queryRaw(rowLockQuery("hubs", "id", id));
