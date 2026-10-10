import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import config from "./config";
import { registerDocumentation } from "./documentation";
import { csrfProtection } from "./middlewares/csrf";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import rateLimiter from "./middlewares/rateLimiter";
import { stripeWebhook } from "./modules/payment/payment.webhook";
import router from "./routes";
import { logger } from "./utils/logger";
import { prisma } from "./utils/prisma";
import { connectRedis, redisClient } from "./utils/redis";

const app: Application = express();
app.disable("x-powered-by");
app.set("trust proxy", config.trust_proxy_hops);
app.use(helmet());
app.use((req, res, next) => {
  const requestId = randomUUID();
  const start = Date.now();
  res.setHeader("X-Request-ID", requestId);
  res.on("finish", () => logger.info("http_request", { requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start }));
  next();
});
app.use(cors({ origin: new URL(config.frontend_url).origin, credentials: true, allowedHeaders: ["Content-Type", "Authorization", "X-Courier-Client"], exposedHeaders: ["X-Request-ID"] }));
registerDocumentation(app);

app.get("/health/live", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/ready", async (req, res) => {
  try {
    await connectRedis();
    await Promise.all([prisma.$queryRaw`SELECT 1`, redisClient.ping()]);
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});
app.use("/api", async (req, res, next) => {
  try { await connectRedis(); next(); } catch (error) { next(error); }
});
app.post("/api/v1/payments/stripe/webhook", express.raw({ type: "application/json", limit: "256kb" }), stripeWebhook);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use("/api", rateLimiter, csrfProtection);
app.use("/api/v1", (req, res, next) => {
  const match = req.path.match(/^\/(shipments|couriers|payments|hubs|admin\/users)\/([^/]+)/);
  if (match && !["track", "summary", "reconcile", "initiate", "stripe", "bkash"].includes(match[2])) {
    const parsed = z.string().uuid().safeParse(match[2]);
    if (!parsed.success) return next(parsed.error);
  }
  next();
});
app.use("/api/v1", router);
app.get("/", (req: Request, res: Response) => res.status(200).json({ success: true, message: "Courier & Logistics Platform API is running" }));
app.use(notFound);
app.use(globalErrorHandler);
export default app;
