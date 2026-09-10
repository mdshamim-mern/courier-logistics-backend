import { createClient } from "redis";
import config from "../config";

export const redisClient = createClient({
  url: config.redis_url,
});

redisClient.on("error", (err) => console.error(err));

export const connectRedis = async () => {
  await redisClient.connect();
};