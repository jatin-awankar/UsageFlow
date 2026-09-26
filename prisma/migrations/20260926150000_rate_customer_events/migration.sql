CREATE UNIQUE INDEX "UsageEvent_rating_source_key" ON "UsageEvent"(id, "orgId", "billedCustomerId", "metricId", amount);
CREATE UNIQUE INDEX "UsageEvent_id_org_metric_key" ON "UsageEvent"(id, "orgId", "metricId");
CREATE UNIQUE INDEX "PriceVersion_rating_source_key" ON "PriceVersion"(id, "orgId", "metricId", currency, "unitPriceMicros");
CREATE UNIQUE INDEX "PriceVersion_id_org_metric_key" ON "PriceVersion"(id, "orgId", "metricId");
CREATE TABLE "RatedEvent" (
  "eventId" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "billedCustomerId" TEXT NOT NULL,
  "metricId" TEXT NOT NULL,
  "priceVersionId" TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000000),
  "unitPriceMicros" BIGINT NOT NULL CHECK ("unitPriceMicros" BETWEEN 0 AND 999999999999),
  amount DECIMAL(18,3) NOT NULL CHECK (amount >= 0 AND amount <= 999999999999999),
  currency VARCHAR(3) NOT NULL,
  "ratedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT "RatedEvent_event_fkey" FOREIGN KEY ("eventId", "orgId", "billedCustomerId", "metricId", quantity) REFERENCES "UsageEvent"(id, "orgId", "billedCustomerId", "metricId", amount) ON DELETE RESTRICT,
  CONSTRAINT "RatedEvent_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"(id) ON DELETE RESTRICT,
  CONSTRAINT "RatedEvent_customer_fkey" FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", id) ON DELETE RESTRICT,
  CONSTRAINT "RatedEvent_price_fkey" FOREIGN KEY ("priceVersionId", "orgId", "metricId", currency, "unitPriceMicros") REFERENCES "PriceVersion"(id, "orgId", "metricId", currency, "unitPriceMicros") ON DELETE RESTRICT
);
CREATE INDEX "RatedEvent_orgId_billedCustomerId_idx" ON "RatedEvent"("orgId", "billedCustomerId");
CREATE UNIQUE INDEX "RatedEvent_source_key" ON "RatedEvent"("eventId", "orgId", "billedCustomerId", "metricId", quantity);
CREATE TABLE "RatingFailure" (
  "eventId" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "metricId" TEXT NOT NULL,
  "priceVersionId" TEXT NOT NULL,
  reason VARCHAR(32) NOT NULL CHECK (reason = 'AMOUNT_OVERFLOW'),
  "failedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT "RatingFailure_event_fkey" FOREIGN KEY ("eventId", "orgId", "metricId") REFERENCES "UsageEvent"(id, "orgId", "metricId") ON DELETE RESTRICT,
  CONSTRAINT "RatingFailure_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"(id) ON DELETE RESTRICT,
  CONSTRAINT "RatingFailure_price_fkey" FOREIGN KEY ("priceVersionId", "orgId", "metricId") REFERENCES "PriceVersion"(id, "orgId", "metricId") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "RatingFailure_event_org_metric_key" ON "RatingFailure"("eventId", "orgId", "metricId");
CREATE FUNCTION prevent_rating_evidence_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Rating evidence is immutable';
END $$;
CREATE TRIGGER rated_event_immutable BEFORE UPDATE OR DELETE ON "RatedEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_rating_evidence_change();
CREATE TRIGGER rating_failure_immutable BEFORE UPDATE OR DELETE ON "RatingFailure"
  FOR EACH ROW EXECUTE FUNCTION prevent_rating_evidence_change();
CREATE FUNCTION prevent_conflicting_rating_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM "UsageEvent" WHERE id = NEW."eventId" FOR UPDATE;
  IF TG_TABLE_NAME = 'RatedEvent' AND EXISTS (SELECT 1 FROM "RatingFailure" WHERE "eventId" = NEW."eventId") THEN
    RAISE EXCEPTION 'Event already has rating failure evidence';
  END IF;
  IF TG_TABLE_NAME = 'RatingFailure' AND EXISTS (SELECT 1 FROM "RatedEvent" WHERE "eventId" = NEW."eventId") THEN
    RAISE EXCEPTION 'Event already has rated evidence';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rated_event_exclusive BEFORE INSERT ON "RatedEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_conflicting_rating_evidence();
CREATE TRIGGER rating_failure_exclusive BEFORE INSERT ON "RatingFailure"
  FOR EACH ROW EXECUTE FUNCTION prevent_conflicting_rating_evidence();
