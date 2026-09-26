ALTER TABLE "UsageEvent" ADD COLUMN "billableFingerprint" TEXT;

-- Fail before removing the global constraint if the existing rows violate the new scope.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "UsageEvent"
    WHERE "idempotencyKey" IS NOT NULL
    GROUP BY "orgId", "idempotencyKey" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate Organization/idempotency key requires reconciliation';
  END IF;
END $$;

CREATE UNIQUE INDEX "UsageEvent_orgId_idempotencyKey_key" ON "UsageEvent"("orgId", "idempotencyKey");
DROP INDEX "UsageEvent_idempotencyKey_key";
