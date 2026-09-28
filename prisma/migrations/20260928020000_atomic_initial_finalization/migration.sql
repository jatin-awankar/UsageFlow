CREATE TABLE "BillingRecordVersion" (
  id TEXT PRIMARY KEY,
  "billingRecordId" TEXT NOT NULL REFERENCES "BillingRecord"(id) ON DELETE RESTRICT,
  "snapshotId" TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  "approvedById" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "finalizedAt" TIMESTAMPTZ(3) NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "periodEnd" TIMESTAMPTZ(3) NOT NULL,
  "closeAt" TIMESTAMPTZ(3) NOT NULL,
  "sourceEvents" JSONB NOT NULL,
  "ratedSources" JSONB NOT NULL,
  "eventOutcomes" JSONB NOT NULL,
  lines JSONB NOT NULL,
  reconciliation JSONB NOT NULL,
  "lateArrivals" JSONB NOT NULL,
  comparison JSONB NOT NULL,
  currency TEXT NOT NULL,
  amount DECIMAL(38,3) NOT NULL,
  CONSTRAINT "BillingRecordVersion_identity_key" UNIQUE (id, "billingRecordId"),
  CONSTRAINT "BillingRecordVersion_record_version_key" UNIQUE ("billingRecordId", version),
  CONSTRAINT "BillingRecordVersion_snapshot_fkey" FOREIGN KEY ("snapshotId", "billingRecordId") REFERENCES "BillingRecordSnapshot"(id, "billingRecordId") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "BillingRecordVersion_one_initial" ON "BillingRecordVersion"("billingRecordId") WHERE version = 1;
ALTER TABLE "BillingRecord" ADD COLUMN "currentFinalVersionId" TEXT;
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_current_final_fkey" FOREIGN KEY ("currentFinalVersionId", id) REFERENCES "BillingRecordVersion"(id, "billingRecordId") ON DELETE RESTRICT;
CREATE FUNCTION billing_record_final_pointer_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."currentFinalVersionId" IS NOT NULL AND NEW."currentFinalVersionId" IS NULL THEN
    RAISE EXCEPTION 'Current final version cannot be cleared';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "BillingRecord_final_pointer_immutable" BEFORE UPDATE OF "currentFinalVersionId" ON "BillingRecord" FOR EACH ROW EXECUTE FUNCTION billing_record_final_pointer_immutable();
ALTER TABLE "WebhookEvent" ADD COLUMN "billingRecordVersionId" TEXT UNIQUE REFERENCES "BillingRecordVersion"(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX "WebhookEvent_initial_finalization_unique" ON "WebhookEvent"("billingRecordVersionId") WHERE type = 'invoice.finalized';
CREATE FUNCTION billing_record_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Final BillingRecord versions are immutable';
END $$;
CREATE TRIGGER "BillingRecordVersion_immutable" BEFORE UPDATE OR DELETE ON "BillingRecordVersion" FOR EACH ROW EXECUTE FUNCTION billing_record_version_immutable();
CREATE FUNCTION billing_record_final_pointer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."currentFinalVersionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "WebhookEvent" e WHERE e."billingRecordVersionId" = NEW."currentFinalVersionId" AND e.type IN ('invoice.finalized', 'invoice.revised') AND e."orgId" = NEW."orgId"
  ) THEN RAISE EXCEPTION 'Current final version requires its outbound event'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "BillingRecord_final_event_required" AFTER INSERT OR UPDATE OF "currentFinalVersionId" ON "BillingRecord"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION billing_record_final_pointer_guard();
CREATE FUNCTION billing_record_final_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."billingRecordVersionId" IS NOT NULL AND
    (TG_OP = 'DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.type IS DISTINCT FROM OLD.type OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW."orgId" IS DISTINCT FROM OLD."orgId" OR NEW."billingRecordVersionId" IS DISTINCT FROM OLD."billingRecordVersionId")
  THEN RAISE EXCEPTION 'Final BillingRecord outbound evidence is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "WebhookEvent_final_evidence_immutable" BEFORE UPDATE OR DELETE ON "WebhookEvent" FOR EACH ROW EXECUTE FUNCTION billing_record_final_event_immutable();
