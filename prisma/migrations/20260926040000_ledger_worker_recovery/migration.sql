ALTER TABLE "LedgerProcessingIntent"
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseUntil" TIMESTAMP(3),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failureReason" TEXT;

CREATE TABLE "LedgerEventProjection" (
  "eventId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "billedCustomerId" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "projectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEventProjection_pkey" PRIMARY KEY ("eventId"),
  CONSTRAINT "LedgerEventProjection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "UsageEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LedgerEventProjection_orgId_billedCustomerId_metricKey_idx" ON "LedgerEventProjection"("orgId", "billedCustomerId", "metricKey");
CREATE INDEX "LedgerProcessingIntent_leaseUntil_idx" ON "LedgerProcessingIntent"("leaseUntil");
