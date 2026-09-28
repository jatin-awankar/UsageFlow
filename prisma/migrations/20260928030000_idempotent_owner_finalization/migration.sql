CREATE UNIQUE INDEX "BillingRecord_request_period_identity_key" ON "BillingRecord"(id, "orgId", "billedCustomerId", "periodStart");
CREATE TABLE "BillingFinalizationRequest" (
  "orgId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "billedCustomerId" TEXT NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "billingRecordId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingFinalizationRequest_pkey" PRIMARY KEY ("orgId", "requestId"),
  CONSTRAINT "BillingFinalizationRequest_record_fkey" FOREIGN KEY ("billingRecordId", "orgId", "billedCustomerId", "periodStart") REFERENCES "BillingRecord"(id, "orgId", "billedCustomerId", "periodStart") ON DELETE RESTRICT,
  CONSTRAINT "BillingFinalizationRequest_version_fkey" FOREIGN KEY ("versionId", "billingRecordId") REFERENCES "BillingRecordVersion"(id, "billingRecordId") ON DELETE RESTRICT,
  CONSTRAINT "BillingFinalizationRequest_event_fkey" FOREIGN KEY ("eventId") REFERENCES "WebhookEvent"(id) ON DELETE RESTRICT,
  CONSTRAINT "BillingFinalizationRequest_event_unique" UNIQUE ("eventId"),
  CONSTRAINT "BillingFinalizationRequest_version_unique" UNIQUE ("versionId")
);
CREATE FUNCTION billing_finalization_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "WebhookEvent" e WHERE e.id = NEW."eventId" AND e."billingRecordVersionId" = NEW."versionId" AND e.type = 'invoice.finalized' AND e."orgId" = NEW."orgId") THEN
    RAISE EXCEPTION 'Finalization request requires its original outbound event';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "BillingFinalizationRequest_event_guard" AFTER INSERT ON "BillingFinalizationRequest"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION billing_finalization_request_guard();
CREATE FUNCTION billing_finalization_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Finalization request bindings are immutable';
END $$;
CREATE TRIGGER "BillingFinalizationRequest_immutable" BEFORE UPDATE OR DELETE ON "BillingFinalizationRequest"
  FOR EACH ROW EXECUTE FUNCTION billing_finalization_request_immutable();
