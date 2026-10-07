import type { Server } from "node:http";
import app from "./app/app";
import config from "./app/config";
import { logger } from "./app/utils/logger";
import { prisma } from "./app/utils/prisma";
import { connectRedis, redisClient } from "./app/utils/redis";

let server: Server | undefined;
let stopping = false;

async function shutdown(reason: string, exitCode = 0) {
  if (stopping) return;
  stopping = true;
  logger.info("server_shutdown", { reason });
  const deadline = setTimeout(() => process.exit(1), 15000);
  deadline.unref();
  const runningServer = server;
  if (runningServer) await new Promise<void>(resolve => runningServer.close(() => resolve()));
  await prisma.$disconnect();
  if (redisClient.isOpen) await redisClient.quit();
  clearTimeout(deadline);
  process.exit(exitCode);
}

async function main() {
  try {
    await prisma.$connect();
    await connectRedis();
    server = app.listen(config.port, () => logger.info("server_started", { port: config.port }));
    server.requestTimeout = 30000;
    server.headersTimeout = 15000;
  } catch {
    logger.error("server_start_failed");
    await shutdown("startup_failure", 1);
  }
}

if (!process.env.VERCEL) {
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("unhandledRejection", () => { logger.error("unhandled_rejection"); void shutdown("unhandled_rejection", 1); });
  process.on("uncaughtException", () => { logger.error("uncaught_exception"); void shutdown("uncaught_exception", 1); });
  void main();
}

export default app;
