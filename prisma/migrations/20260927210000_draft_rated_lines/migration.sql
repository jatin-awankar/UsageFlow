-- Existing snapshots keep empty evidence; new calculations publish both fields together.
ALTER TABLE "BillingRecordSnapshot" ADD COLUMN lines JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "BillingRecordSnapshot" ADD COLUMN "ratedSources" JSONB NOT NULL DEFAULT '[]'::jsonb;
