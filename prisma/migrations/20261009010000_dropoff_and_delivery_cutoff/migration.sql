ALTER TABLE "service_areas" ADD COLUMN "dropoffEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rate_plans" ADD COLUMN "cutoffMinutes" INTEGER;
