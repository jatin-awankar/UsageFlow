-- Existing snapshots retain their original evidence; only new calculations fill these fields.
ALTER TABLE "BillingRecordSnapshot" ADD COLUMN "eventOutcomes" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "BillingRecordSnapshot" ADD COLUMN reconciliation JSONB NOT NULL DEFAULT '{}'::jsonb;
