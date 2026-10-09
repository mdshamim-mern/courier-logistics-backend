process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/courier_test";
process.env.REDIS_URL = "redis://127.0.0.1:6379";
process.env.JWT_ACCESS_SECRET =
	"test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET =
	"test-refresh-secret-that-is-at-least-32-characters";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.COOKIE_SAME_SITE = "lax";
process.env.STRIPE_SECRET_KEY = "sk_test_local_fixture";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
process.env.SMTP_SEND_TIMEOUT_MS = "25000";
