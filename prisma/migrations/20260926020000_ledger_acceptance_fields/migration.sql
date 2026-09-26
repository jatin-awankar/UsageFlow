CREATE TYPE "LedgerProcessingState" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

ALTER TABLE "UsageEvent"
  ADD COLUMN "receivedAt" TIMESTAMP(3),
  ADD COLUMN "processingState" "LedgerProcessingState";
