BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT clock_timestamp() AS captured_at, count(*) AS accepted, (SELECT count(*) FROM "RatedEvent") AS rated FROM "UsageEvent";
EXPLAIN (ANALYZE, BUFFERS)
SELECT i."eventId", i."createdAt"
FROM "LedgerProcessingIntent" i
LEFT JOIN "UsageEvent" j0 ON j0.id = i."eventId"
LEFT JOIN "UsageEvent" j1 ON j1.id = i."eventId"
LEFT JOIN "UsageEvent" j2 ON j2.id = i."eventId"
WHERE j0."billingTreatment" = 'LEDGER_ONLY'::"BillingTreatment" AND j0.id IS NOT NULL
AND (((j1."processingState" = 'PENDING'::"LedgerProcessingState" AND j1.id IS NOT NULL) AND i."createdAt" <= now() - interval '1 second')
OR (j2."processingState" IN ('PROCESSING'::"LedgerProcessingState", 'FAILED'::"LedgerProcessingState") AND j2.id IS NOT NULL))
AND (i."leaseUntil" IS NULL OR i."leaseUntil" <= now())
ORDER BY i."createdAt", i."eventId" LIMIT 200;
EXPLAIN (ANALYZE, BUFFERS)
SELECT i."eventId", i."createdAt", e."processingState"
FROM "LedgerProcessingIntent" i JOIN "UsageEvent" e ON e.id = i."eventId"
WHERE e."billingTreatment" = 'LEDGER_ONLY'::"BillingTreatment"
AND ((e."processingState" = 'PENDING'::"LedgerProcessingState" AND i."createdAt" <= now() - interval '1 second') OR e."processingState" IN ('PROCESSING'::"LedgerProcessingState", 'FAILED'::"LedgerProcessingState"))
AND (i."leaseUntil" IS NULL OR i."leaseUntil" <= now())
ORDER BY i."createdAt", i."eventId" LIMIT 200;
ROLLBACK;
