CREATE TABLE "LedgerExport" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totals" JSONB NOT NULL,
  CONSTRAINT "LedgerExport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LedgerExport_orgId_createdAt_idx" ON "LedgerExport"("orgId", "createdAt");
ALTER TABLE "LedgerExport" ADD CONSTRAINT "LedgerExport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LedgerExportRow" (
  "exportId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "eventId" TEXT NOT NULL,
  "keyReference" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "externalCustomerId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "processingState" "LedgerProcessingState" NOT NULL,
  "failureReason" TEXT,
  CONSTRAINT "LedgerExportRow_pkey" PRIMARY KEY ("exportId", "position")
);
ALTER TABLE "LedgerExportRow" ADD CONSTRAINT "LedgerExportRow_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "LedgerExport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
