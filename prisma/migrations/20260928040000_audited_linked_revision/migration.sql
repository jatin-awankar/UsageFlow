CREATE TABLE "BillingRecordAdjustment" (
 id TEXT PRIMARY KEY,
 "billingRecordId" TEXT NOT NULL REFERENCES "BillingRecord"(id) ON DELETE RESTRICT,
 "previousVersionId" TEXT NOT NULL REFERENCES "BillingRecordVersion"(id) ON DELETE RESTRICT,
 "actorId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "requestId" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
 "evidenceRef" TEXT NOT NULL CHECK (length(trim("evidenceRef")) BETWEEN 1 AND 2048),
 "affectedLines" JSONB NOT NULL,
 currency TEXT NOT NULL,
 "previousAmount" DECIMAL(38,3) NOT NULL,
 "signedDelta" DECIMAL(38,3) NOT NULL CHECK ("signedDelta" <> 0),
 "revisedAmount" DECIMAL(38,3) NOT NULL CHECK ("revisedAmount" >= 0 AND "revisedAmount" = "previousAmount" + "signedDelta"),
 CONSTRAINT "BillingRecordAdjustment_identity_key" UNIQUE (id, "billingRecordId", "previousVersionId"),
 CONSTRAINT "BillingRecordAdjustment_record_request_key" UNIQUE ("billingRecordId", "requestId"),
 CONSTRAINT "BillingRecordAdjustment_previous_record_fkey" FOREIGN KEY ("previousVersionId", "billingRecordId") REFERENCES "BillingRecordVersion"(id, "billingRecordId") ON DELETE RESTRICT
);
ALTER TABLE "BillingRecordVersion" ADD COLUMN "predecessorId" TEXT;
ALTER TABLE "BillingRecordVersion" ADD COLUMN "adjustmentId" TEXT UNIQUE;
ALTER TABLE "BillingRecordVersion" ADD CONSTRAINT "BillingRecordVersion_predecessor_fkey" FOREIGN KEY ("predecessorId", "billingRecordId") REFERENCES "BillingRecordVersion"(id, "billingRecordId") ON DELETE RESTRICT;
ALTER TABLE "BillingRecordVersion" ADD CONSTRAINT "BillingRecordVersion_adjustment_fkey" FOREIGN KEY ("adjustmentId", "billingRecordId", "predecessorId") REFERENCES "BillingRecordAdjustment"(id, "billingRecordId", "previousVersionId") ON DELETE RESTRICT;
ALTER TABLE "BillingRecordVersion" ADD CONSTRAINT "BillingRecordVersion_chain_shape" CHECK ((version = 1 AND "predecessorId" IS NULL AND "adjustmentId" IS NULL) OR (version > 1 AND "predecessorId" IS NOT NULL AND "adjustmentId" IS NOT NULL));
CREATE UNIQUE INDEX "BillingRecordVersion_one_successor" ON "BillingRecordVersion"("predecessorId") WHERE "predecessorId" IS NOT NULL;
CREATE FUNCTION billing_revision_pointer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."currentFinalVersionId" IS NOT NULL AND NEW."currentFinalVersionId" IS DISTINCT FROM OLD."currentFinalVersionId" AND
   NOT EXISTS (SELECT 1 FROM "BillingRecordVersion" v WHERE v.id = NEW."currentFinalVersionId" AND v."billingRecordId" = NEW.id AND v."predecessorId" = OLD."currentFinalVersionId") THEN
  RAISE EXCEPTION 'Current final version must advance to its linked successor';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "BillingRecord_revision_pointer_guard" BEFORE UPDATE OF "currentFinalVersionId" ON "BillingRecord" FOR EACH ROW EXECUTE FUNCTION billing_revision_pointer_guard();
CREATE FUNCTION billing_revision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior "BillingRecordVersion"%ROWTYPE; audit "BillingRecordAdjustment"%ROWTYPE;
BEGIN
 IF NEW.version > 1 THEN
  SELECT * INTO prior FROM "BillingRecordVersion" WHERE id = NEW."predecessorId";
  SELECT * INTO audit FROM "BillingRecordAdjustment" WHERE id = NEW."adjustmentId";
  IF prior.id IS NULL OR audit.id IS NULL OR NEW.version <> prior.version + 1 OR NEW.currency <> prior.currency OR NEW.amount <> audit."revisedAmount" OR prior.amount <> audit."previousAmount" OR prior.currency <> audit.currency OR NEW."approvedById" <> audit."actorId" OR NEW."snapshotId" <> prior."snapshotId" OR NEW."sourceEvents" <> prior."sourceEvents" OR NEW."ratedSources" <> prior."ratedSources" OR NEW."eventOutcomes" <> prior."eventOutcomes" OR NEW."periodStart" <> prior."periodStart" OR NEW."periodEnd" <> prior."periodEnd" OR NEW."closeAt" <> prior."closeAt" OR NEW."lateArrivals" <> prior."lateArrivals" THEN
   RAISE EXCEPTION 'Invalid linked BillingRecord revision';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "WebhookEvent" e WHERE e."billingRecordVersionId" = NEW.id AND e.type = 'invoice.revised' AND e."orgId" = (SELECT "orgId" FROM "BillingRecord" WHERE id = NEW."billingRecordId")) THEN
   RAISE EXCEPTION 'Revision requires its outbound event';
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "BillingRecordVersion_revision_guard" AFTER INSERT ON "BillingRecordVersion" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION billing_revision_guard();
CREATE FUNCTION billing_adjustment_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'BillingRecord adjustments are immutable'; END $$;
CREATE TRIGGER "BillingRecordAdjustment_immutable" BEFORE UPDATE OR DELETE ON "BillingRecordAdjustment" FOR EACH ROW EXECUTE FUNCTION billing_adjustment_immutable();
