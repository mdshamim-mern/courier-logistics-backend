import { PrismaClient } from "@prisma/client";
import config from "../config";

const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalDatabase.prisma ?? new PrismaClient({
  transactionOptions: {
    maxWait: config.prisma_transaction_max_wait_ms,
    timeout: config.prisma_transaction_timeout_ms,
  },
});

if (process.env.NODE_ENV !== "production") {
  globalDatabase.prisma = prisma;
}
