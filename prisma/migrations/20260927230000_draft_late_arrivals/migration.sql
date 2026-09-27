ALTER TABLE "BillingRecordSnapshot" ADD COLUMN "lateArrivals" JSONB NOT NULL DEFAULT '{}'::jsonb;
