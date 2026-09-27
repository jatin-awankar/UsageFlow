ALTER TABLE "BillingRecordSnapshot" ADD COLUMN "comparison" JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX "BillingRecordSnapshot_billingRecordId_calculatedAt_id_idx" ON "BillingRecordSnapshot"("billingRecordId", "calculatedAt", id);
