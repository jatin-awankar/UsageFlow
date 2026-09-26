CREATE TYPE "BillingTreatment" AS ENUM ('LEGACY', 'LEDGER_ONLY');

ALTER TABLE "UsageEvent"
  ADD COLUMN "billedCustomerId" TEXT,
  ADD COLUMN "billingTreatment" "BillingTreatment" NOT NULL DEFAULT 'LEGACY';

CREATE INDEX "UsageEvent_orgId_billedCustomerId_idx" ON "UsageEvent"("orgId", "billedCustomerId");

ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_orgId_billedCustomerId_fkey"
  FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
