import rateLimit, { type IncrementResponse, type Options, type Store } from "express-rate-limit";
import { createHash } from "node:crypto";
import { redisClient } from "../utils/redis";

class RedisLimitStore implements Store {
  windowMs = 15 * 60 * 1000;
  constructor(public prefix: string) {}
  init(options: Options) { this.windowMs = options.windowMs; }
  async increment(key: string): Promise<IncrementResponse> {
    const result = await redisClient.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return {count, redis.call('PTTL', KEYS[1])}",
      { keys: [this.prefix + key], arguments: [String(this.windowMs)] },
    ) as number[];
    return { totalHits: result[0], resetTime: new Date(Date.now() + result[1]) };
  }
  async decrement(key: string) {
    await redisClient.eval("if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('DECR', KEYS[1]) end; return 1", { keys: [this.prefix + key], arguments: [] });
  }
  async resetKey(key: string) { await redisClient.del(this.prefix + key); }
}

const message = { success: false, message: "Too many requests, please try again later" };
const rateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, store: new RedisLimitStore("limit:api:"), message });
export const authRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, store: new RedisLimitStore("limit:auth:"), message });
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, store: new RedisLimitStore("limit:otp:"), message,
  keyGenerator: req => createHash("sha256").update(typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : req.ip || "unknown").digest("hex"),
});
export default rateLimiter;
