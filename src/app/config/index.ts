import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  PRISMA_TRANSACTION_MAX_WAIT_MS: z.coerce.number().int().min(1000).max(30000).default(10000),
  PRISMA_TRANSACTION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(20000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  COURIER_COMMISSION_RATE: z.preprocess(value => value === "" ? undefined : value, z.coerce.number().min(0).max(1).optional()),
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
}
const environment = parsed.data;
if (environment.JWT_ACCESS_SECRET === environment.JWT_REFRESH_SECRET) {
  throw new Error("Access and refresh secrets must be different");
}
if (environment.COOKIE_SAME_SITE === "none" && environment.NODE_ENV !== "production") {
  throw new Error("Cross-site cookies require production HTTPS");
}

export default {
  env: environment.NODE_ENV,
  port: environment.PORT,
  database_url: environment.DATABASE_URL,
  prisma_transaction_max_wait_ms: environment.PRISMA_TRANSACTION_MAX_WAIT_MS,
  prisma_transaction_timeout_ms: environment.PRISMA_TRANSACTION_TIMEOUT_MS,
  frontend_url: environment.FRONTEND_URL.replace(/\/$/, ""),
  bcrypt_salt_rounds: environment.BCRYPT_SALT_ROUNDS,
  jwt_access_secret: environment.JWT_ACCESS_SECRET,
  jwt_refresh_secret: environment.JWT_REFRESH_SECRET,
  jwt_access_expires_in: environment.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: environment.JWT_REFRESH_EXPIRES_IN,
  cookie_same_site: environment.COOKIE_SAME_SITE,
  trust_proxy_hops: environment.TRUST_PROXY_HOPS,
  courier_commission_rate: environment.COURIER_COMMISSION_RATE,
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  redis_url: environment.REDIS_URL,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  bkash_base_url: process.env.BKASH_BASE_URL,
  bkash_username: process.env.BKASH_USERNAME,
  bkash_password: process.env.BKASH_PASSWORD,
  bkash_app_key: process.env.BKASH_APP_KEY,
  bkash_app_secret: process.env.BKASH_APP_SECRET,
  bkash_callback_url: process.env.BKASH_CALLBACK_URL,
};
