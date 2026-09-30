-- Observed Prisma recovery-candidate SQL, no cursor branch. Parameters used in
-- the live EXPLAIN are recorded in the companion plan output.
PREPARE recovery_candidates(text,text,timestamp,text,text,timestamp,int,int) AS
SELECT "public"."LedgerProcessingIntent"."eventId", "public"."LedgerProcessingIntent"."createdAt"
FROM "public"."LedgerProcessingIntent"
LEFT JOIN "public"."UsageEvent" AS "j0" ON ("j0"."id") = ("public"."LedgerProcessingIntent"."eventId")
LEFT JOIN "public"."UsageEvent" AS "j1" ON ("j1"."id") = ("public"."LedgerProcessingIntent"."eventId")
LEFT JOIN "public"."UsageEvent" AS "j2" ON ("j2"."id") = ("public"."LedgerProcessingIntent"."eventId")
WHERE (("j0"."billingTreatment" = CAST($1::text AS "public"."BillingTreatment") AND ("j0"."id" IS NOT NULL))
  AND ((("j1"."processingState" = CAST($2::text AS "public"."LedgerProcessingState") AND ("j1"."id" IS NOT NULL)) AND "public"."LedgerProcessingIntent"."createdAt" <= $3)
    OR ("j2"."processingState" IN (CAST($4::text AS "public"."LedgerProcessingState"),CAST($5::text AS "public"."LedgerProcessingState")) AND ("j2"."id" IS NOT NULL)))
  AND ("public"."LedgerProcessingIntent"."leaseUntil" IS NULL OR "public"."LedgerProcessingIntent"."leaseUntil" <= $6))
ORDER BY "public"."LedgerProcessingIntent"."createdAt" ASC, "public"."LedgerProcessingIntent"."eventId" ASC
LIMIT $7 OFFSET $8;
