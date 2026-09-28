ALTER TABLE "BillingWebhookWork" ADD COLUMN "cycle" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WebhookDelivery" ADD COLUMN "cycle" INTEGER NOT NULL DEFAULT 1;
DROP INDEX "WebhookDelivery_webhookEventId_endpointId_attempt_key";
CREATE UNIQUE INDEX "WebhookDelivery_webhookEventId_endpointId_cycle_attempt_key" ON "WebhookDelivery"("webhookEventId", "endpointId", "cycle", "attempt");
CREATE TABLE "BillingWebhookReplay" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "webhookEventId" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "cycle" INTEGER NOT NULL,
  "replayedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingWebhookReplay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingWebhookReplay_orgId_idempotencyKey_key" ON "BillingWebhookReplay"("orgId", "idempotencyKey");
CREATE UNIQUE INDEX "BillingWebhookReplay_webhookEventId_endpointId_cycle_key" ON "BillingWebhookReplay"("webhookEventId", "endpointId", "cycle");
ALTER TABLE "BillingWebhookReplay" ADD CONSTRAINT "BillingWebhookReplay_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookReplay" ADD CONSTRAINT "BillingWebhookReplay_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookReplay" ADD CONSTRAINT "BillingWebhookReplay_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
