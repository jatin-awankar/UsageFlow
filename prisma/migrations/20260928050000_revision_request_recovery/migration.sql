CREATE TABLE "BillingRevisionRequest" (
  "orgId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "billedCustomerId" TEXT NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "billingRecordId" TEXT NOT NULL,
  "expectedVersionId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "adjustmentId" TEXT NOT NULL UNIQUE,
  "versionId" TEXT NOT NULL UNIQUE,
  "eventId" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingRevisionRequest_pkey" PRIMARY KEY ("orgId", "requestId"),
  CONSTRAINT "BillingRevisionRequest_record_fkey" FOREIGN KEY ("billingRecordId", "orgId", "billedCustomerId", "periodStart") REFERENCES "BillingRecord"(id, "orgId", "billedCustomerId", "periodStart") ON DELETE RESTRICT,
  CONSTRAINT "BillingRevisionRequest_previous_fkey" FOREIGN KEY ("expectedVersionId", "billingRecordId") REFERENCES "BillingRecordVersion"(id, "billingRecordId") ON DELETE RESTRICT,
  CONSTRAINT "BillingRevisionRequest_adjustment_fkey" FOREIGN KEY ("adjustmentId", "billingRecordId", "expectedVersionId") REFERENCES "BillingRecordAdjustment"(id, "billingRecordId", "previousVersionId") ON DELETE RESTRICT,
  CONSTRAINT "BillingRevisionRequest_version_fkey" FOREIGN KEY ("versionId", "billingRecordId") REFERENCES "BillingRecordVersion"(id, "billingRecordId") ON DELETE RESTRICT,
  CONSTRAINT "BillingRevisionRequest_event_fkey" FOREIGN KEY ("eventId") REFERENCES "WebhookEvent"(id) ON DELETE RESTRICT
);
CREATE FUNCTION billing_revision_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "BillingRecordVersion" v WHERE v.id = NEW."versionId" AND v."adjustmentId" = NEW."adjustmentId" AND v."predecessorId" = NEW."expectedVersionId") OR
     NOT EXISTS (SELECT 1 FROM "WebhookEvent" e WHERE e.id = NEW."eventId" AND e."billingRecordVersionId" = NEW."versionId" AND e.type = 'invoice.revised' AND e."orgId" = NEW."orgId") THEN
    RAISE EXCEPTION 'Revision request requires its version, adjustment, and outbound event';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "BillingRevisionRequest_guard" AFTER INSERT ON "BillingRevisionRequest"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION billing_revision_request_guard();
CREATE FUNCTION billing_revision_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Revision request bindings are immutable';
END $$;
CREATE TRIGGER "BillingRevisionRequest_immutable" BEFORE UPDATE OR DELETE ON "BillingRevisionRequest"
  FOR EACH ROW EXECUTE FUNCTION billing_revision_request_immutable();
