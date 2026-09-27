CREATE UNIQUE INDEX "UsageEvent_unrated_source_key" ON "UsageEvent"(id, "orgId", "billedCustomerId", "metricId");
CREATE TABLE "UnratedEvent" (
  "eventId" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "billedCustomerId" TEXT NOT NULL,
  "metricId" TEXT NOT NULL,
  reason VARCHAR(32) NOT NULL CHECK (reason = 'NO_APPLICABLE_PRICE'),
  "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT "UnratedEvent_event_fkey" FOREIGN KEY ("eventId", "orgId", "billedCustomerId", "metricId") REFERENCES "UsageEvent"(id, "orgId", "billedCustomerId", "metricId") ON DELETE RESTRICT,
  CONSTRAINT "UnratedEvent_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"(id) ON DELETE RESTRICT,
  CONSTRAINT "UnratedEvent_customer_fkey" FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", id) ON DELETE RESTRICT
);
CREATE TABLE "RatingRetry" (
  "eventId" TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  reason VARCHAR(32) NOT NULL CHECK (reason IN ('RATING_STORAGE_FAILED', 'RATING_WORKER_FAILED')),
  "failedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "retryAfter" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RatingRetry_event_fkey" FOREIGN KEY ("eventId") REFERENCES "UsageEvent"(id) ON DELETE RESTRICT
);
CREATE TRIGGER unrated_event_immutable BEFORE UPDATE OR DELETE ON "UnratedEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_rating_evidence_change();
CREATE FUNCTION prevent_conflicting_unrated_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM "UsageEvent" WHERE id = NEW."eventId" FOR UPDATE;
  IF EXISTS (SELECT 1 FROM "RatedEvent" WHERE "eventId" = NEW."eventId") OR
     EXISTS (SELECT 1 FROM "RatingFailure" WHERE "eventId" = NEW."eventId") THEN
    RAISE EXCEPTION 'Event already has rating evidence';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER unrated_event_exclusive BEFORE INSERT ON "UnratedEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_conflicting_unrated_evidence();
