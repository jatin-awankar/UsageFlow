CREATE TABLE "PricingGapCorrection" (
  id TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE RESTRICT,
  "metricId" TEXT NOT NULL,
  "billedCustomerId" TEXT NOT NULL,
  start TIMESTAMPTZ(3) NOT NULL,
  "end" TIMESTAMPTZ(3) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  "unitPriceMicros" BIGINT NOT NULL CHECK ("unitPriceMicros" BETWEEN 0 AND 999999999999),
  "reviewedAt" TIMESTAMPTZ(3) NOT NULL,
  "approvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "approvedById" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  evidence TEXT NOT NULL CHECK (length(trim(evidence)) > 0),
  "affectedEventIds" TEXT[] NOT NULL,
  "resultingRatingIds" TEXT[] NOT NULL,
  CONSTRAINT "PricingGapCorrection_interval_check" CHECK (start < "end"),
  CONSTRAINT "PricingGapCorrection_metric_fkey" FOREIGN KEY ("orgId", "metricId") REFERENCES "Metric"("orgId", id) ON DELETE RESTRICT,
  CONSTRAINT "PricingGapCorrection_customer_fkey" FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", id) ON DELETE RESTRICT
);
CREATE TRIGGER pricing_gap_correction_immutable BEFORE UPDATE OR DELETE ON "PricingGapCorrection"
  FOR EACH ROW EXECUTE FUNCTION prevent_rating_evidence_change();
ALTER TABLE "RatedEvent" ALTER COLUMN "priceVersionId" DROP NOT NULL;
ALTER TABLE "RatedEvent" ADD COLUMN "correctionId" TEXT REFERENCES "PricingGapCorrection"(id) ON DELETE RESTRICT;
ALTER TABLE "RatedEvent" ADD CONSTRAINT "RatedEvent_single_provenance_check" CHECK (("priceVersionId" IS NULL) <> ("correctionId" IS NULL));
CREATE FUNCTION validate_correction_rating() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."correctionId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "PricingGapCorrection" c JOIN "UsageEvent" e ON e.id = NEW."eventId"
      JOIN "UnratedEvent" u ON u."eventId" = e.id
      WHERE c.id = NEW."correctionId" AND c."orgId" = NEW."orgId"
        AND c."metricId" = NEW."metricId" AND c."billedCustomerId" = NEW."billedCustomerId"
        AND c.currency = NEW.currency AND c."unitPriceMicros" = NEW."unitPriceMicros"
        AND e.timestamp >= c.start AND e.timestamp < c."end"
        AND e."billingTreatment" = 'LEDGER_ONLY' AND u.reason = 'NO_APPLICABLE_PRICE'
        AND NEW."eventId" = ANY(c."affectedEventIds")
    ) THEN RAISE EXCEPTION 'Invalid correction rating provenance'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rated_event_correction_provenance BEFORE INSERT ON "RatedEvent"
  FOR EACH ROW EXECUTE FUNCTION validate_correction_rating();
