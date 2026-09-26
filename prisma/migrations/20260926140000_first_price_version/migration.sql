CREATE UNIQUE INDEX "Metric_orgId_id_key" ON "Metric"("orgId", id);
CREATE TABLE "PriceVersion" (
  id TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "metricId" TEXT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  "unitPriceMicros" BIGINT NOT NULL CHECK ("unitPriceMicros" BETWEEN 0 AND 999999999999),
  "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT "PriceVersion_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"(id) ON DELETE RESTRICT,
  CONSTRAINT "PriceVersion_metric_fkey" FOREIGN KEY ("orgId", "metricId") REFERENCES "Metric"("orgId", id) ON DELETE RESTRICT,
  CONSTRAINT "PriceVersion_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "User"(id) ON DELETE RESTRICT,
  CONSTRAINT "PriceVersion_org_metric_start_key" UNIQUE ("orgId", "metricId", "effectiveFrom")
);
CREATE INDEX "PriceVersion_orgId_metricId_effectiveFrom_idx" ON "PriceVersion"("orgId", "metricId", "effectiveFrom");
CREATE FUNCTION prevent_price_version_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published PriceVersion is immutable';
END $$;
CREATE TRIGGER price_version_immutable BEFORE UPDATE OR DELETE ON "PriceVersion"
  FOR EACH ROW EXECUTE FUNCTION prevent_price_version_change();
CREATE FUNCTION prevent_published_currency_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.currency IS DISTINCT FROM OLD.currency
     AND EXISTS (SELECT 1 FROM "PriceVersion" WHERE "orgId" = OLD.id) THEN
    RAISE EXCEPTION 'Published PriceVersion locks Organization currency';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER published_currency_locked BEFORE UPDATE OF currency ON "Organization"
  FOR EACH ROW EXECUTE FUNCTION prevent_published_currency_change();
