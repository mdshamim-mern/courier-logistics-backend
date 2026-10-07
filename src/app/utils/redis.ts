import { createClient } from "redis";
import config from "../config";
import { logger } from "./logger";

export const redisClient = createClient({
  url: config.redis_url,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: retries => retries < 3 ? Math.min(retries * 200, 1000) : new Error("Redis unavailable"),
  },
  disableOfflineQueue: true,
});

redisClient.on("error", () => logger.error("redis_connection_error"));

let connection: Promise<void> | undefined;
export const connectRedis = async () => {
  if (redisClient.isReady) return;
  if (!connection) {
    connection = redisClient.connect().then(() => undefined).finally(() => { connection = undefined; });
  }
  await connection;
};
