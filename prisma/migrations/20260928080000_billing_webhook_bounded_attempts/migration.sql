ALTER TYPE "WebhookEventStatus" ADD VALUE 'MIXED';
ALTER TABLE "BillingWebhookWork"
  ALTER COLUMN "dueAt" TYPE TIMESTAMPTZ(3) USING "dueAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "leaseUntil" TYPE TIMESTAMPTZ(3) USING "leaseUntil" AT TIME ZONE 'UTC',
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ(3) USING "completedAt" AT TIME ZONE 'UTC';
ALTER TABLE "BillingWebhookWork" ADD COLUMN "cycleStartedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WebhookDelivery" ADD COLUMN "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "WebhookDelivery" SET "startedAt" = "createdAt";
UPDATE "BillingWebhookWork" SET "cycleStartedAt" = e."createdAt"
FROM "WebhookEvent" e WHERE e.id = "BillingWebhookWork"."webhookEventId";
-- Earlier recovery could leave an uncertain fifth claim retryable. Consume its
-- reserved slot without deleting the attempt or changing selected targets.
UPDATE "WebhookDelivery" d SET status = 'FAILED', "responseBody" = 'Outcome uncertain after worker interruption'
FROM "BillingWebhookWork" w
WHERE d."webhookEventId" = w."webhookEventId" AND d."endpointId" = w."endpointId"
  AND d.attempt = w."attemptCount" AND d.status = 'PENDING'
  AND w."attemptCount" >= 5 AND w."completedAt" IS NULL;
UPDATE "BillingWebhookWork" SET terminal = true, "claimToken" = NULL, "leaseUntil" = NULL
WHERE "attemptCount" >= 5 AND "completedAt" IS NULL;
