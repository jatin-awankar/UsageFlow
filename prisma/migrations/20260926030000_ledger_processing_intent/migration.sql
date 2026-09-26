CREATE TABLE "LedgerProcessingIntent" (
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerProcessingIntent_pkey" PRIMARY KEY ("eventId"),
  CONSTRAINT "LedgerProcessingIntent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "UsageEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
