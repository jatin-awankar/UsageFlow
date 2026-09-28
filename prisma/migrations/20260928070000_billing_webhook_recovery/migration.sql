ALTER TABLE "WebhookEvent" ADD COLUMN "targetSelectionRecordedAt" TIMESTAMP(3);
UPDATE "WebhookEvent" SET "targetSelectionRecordedAt" = "createdAt"
WHERE "billingRecordVersionId" IS NOT NULL AND (cardinality("targetEndpointIds") > 0 OR status = 'NO_TARGET');

CREATE TABLE "BillingWebhookWork" (
  "webhookEventId" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3),
  "claimToken" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "terminal" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "BillingWebhookWork_pkey" PRIMARY KEY ("webhookEventId", "endpointId"),
  CONSTRAINT "BillingWebhookWork_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"(id) ON DELETE RESTRICT,
  CONSTRAINT "BillingWebhookWork_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"(id) ON DELETE RESTRICT
);
-- Preserve ticket-01 outcomes and resume unfinished selected endpoint work.
INSERT INTO "BillingWebhookWork" ("webhookEventId", "endpointId", "dueAt", "attemptCount", "failedAttempts", "completedAt", terminal)
SELECT e.id, target."endpointId", CURRENT_TIMESTAMP, COALESCE(latest.attempt, 0),
  (SELECT count(*)::int FROM "WebhookDelivery" failures WHERE failures."webhookEventId"=e.id
    AND failures."endpointId"=target."endpointId" AND failures.status = 'FAILED'),
  CASE WHEN latest.status IN ('SUCCESS', 'SKIPPED') THEN CURRENT_TIMESTAMP ELSE NULL END,
  CASE WHEN latest.status = 'SKIPPED' OR (latest.status = 'FAILED' AND latest.attempt >= 5) THEN true ELSE false END
FROM "WebhookEvent" e
CROSS JOIN LATERAL unnest(e."targetEndpointIds") AS target("endpointId")
LEFT JOIN LATERAL (
  SELECT d.attempt, d.status FROM "WebhookDelivery" d
  WHERE d."webhookEventId" = e.id AND d."endpointId" = target."endpointId"
  ORDER BY d.attempt DESC LIMIT 1
) latest ON true
WHERE e."billingRecordVersionId" IS NOT NULL AND e.type IN ('invoice.finalized', 'invoice.revised');

CREATE INDEX "BillingWebhookWork_due_idx" ON "BillingWebhookWork" ("dueAt", "webhookEventId") WHERE "completedAt" IS NULL AND NOT terminal;
CREATE INDEX "BillingWebhookWork_lease_idx" ON "BillingWebhookWork" ("leaseUntil") WHERE "leaseUntil" IS NOT NULL;
CREATE INDEX "WebhookEvent_billing_selection_idx" ON "WebhookEvent" ("createdAt", id) WHERE "billingRecordVersionId" IS NOT NULL AND "targetSelectionRecordedAt" IS NULL;

CREATE OR REPLACE FUNCTION billing_record_final_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."billingRecordVersionId" IS NOT NULL AND
    (TG_OP = 'DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.type IS DISTINCT FROM OLD.type OR
     NEW.payload IS DISTINCT FROM OLD.payload OR NEW."orgId" IS DISTINCT FROM OLD."orgId" OR
     NEW."billingRecordVersionId" IS DISTINCT FROM OLD."billingRecordVersionId" OR
     NEW."createdAt" IS DISTINCT FROM OLD."createdAt" OR
     (NEW."targetEndpointIds" IS DISTINCT FROM OLD."targetEndpointIds" AND
      (OLD."targetSelectionRecordedAt" IS NOT NULL OR cardinality(OLD."targetEndpointIds") > 0 OR
       OLD.status <> 'PENDING' OR NEW."targetSelectionRecordedAt" IS NULL)) OR
     (OLD."targetSelectionRecordedAt" IS NOT NULL AND NEW."targetSelectionRecordedAt" IS DISTINCT FROM OLD."targetSelectionRecordedAt"))
  THEN RAISE EXCEPTION 'Final BillingRecord outbound evidence is immutable'; END IF;
  RETURN NEW;
END $$;
