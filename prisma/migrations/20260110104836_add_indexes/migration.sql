-- DropIndex
DROP INDEX "UsageEvent_orgId_metricKey_timestamp_idx";

-- CreateIndex
CREATE INDEX "AggregatedUsage_orgId_subscriptionId_idx" ON "AggregatedUsage"("orgId", "subscriptionId");

-- CreateIndex
CREATE INDEX "AggregatedUsage_orgId_metricKey_idx" ON "AggregatedUsage"("orgId", "metricKey");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_orgId_createdAt_idx" ON "Invoice"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "UsageEvent_orgId_subscriptionId_metricKey_timestamp_idx" ON "UsageEvent"("orgId", "subscriptionId", "metricKey", "timestamp");

-- CreateIndex
CREATE INDEX "UsageEvent_idempotencyKey_idx" ON "UsageEvent"("idempotencyKey");
