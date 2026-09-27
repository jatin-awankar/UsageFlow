CREATE TYPE "BillingRecordState" AS ENUM ('OPEN', 'BLOCKED');

CREATE TABLE "BillingRecord" (
  id TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "billedCustomerId" TEXT NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "periodEnd" TIMESTAMPTZ(3) NOT NULL,
  "closeAt" TIMESTAMPTZ(3) NOT NULL,
  "currentSnapshotId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingRecord_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"(id) ON DELETE RESTRICT,
  CONSTRAINT "BillingRecord_customer_fkey" FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", id) ON DELETE RESTRICT,
  CONSTRAINT "BillingRecord_month_key" UNIQUE ("orgId", "billedCustomerId", "periodStart"),
  CONSTRAINT "BillingRecord_identity_key" UNIQUE (id, "orgId", "billedCustomerId"),
  CONSTRAINT "BillingRecord_period_check" CHECK ("periodEnd" > "periodStart" AND "closeAt" = "periodEnd" + INTERVAL '72 hours')
);

CREATE TABLE "BillingRecordSnapshot" (
  id TEXT PRIMARY KEY,
  "billingRecordId" TEXT NOT NULL,
  "calculatedAt" TIMESTAMPTZ(3) NOT NULL,
  state "BillingRecordState" NOT NULL,
  "sourceEvents" JSONB NOT NULL,
  CONSTRAINT "BillingRecordSnapshot_record_fkey" FOREIGN KEY ("billingRecordId") REFERENCES "BillingRecord"(id) ON DELETE RESTRICT,
  CONSTRAINT "BillingRecordSnapshot_identity_key" UNIQUE (id, "billingRecordId")
);

ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_current_snapshot_fkey"
  FOREIGN KEY ("currentSnapshotId", id) REFERENCES "BillingRecordSnapshot"(id, "billingRecordId") ON DELETE RESTRICT;

CREATE FUNCTION guard_billing_record_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'BillingRecord snapshots are append-only';
END;
$$;
CREATE TRIGGER "BillingRecordSnapshot_append_only" BEFORE UPDATE OR DELETE ON "BillingRecordSnapshot"
  FOR EACH ROW EXECUTE FUNCTION guard_billing_record_snapshot();

CREATE FUNCTION require_billing_record_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT "currentSnapshotId" FROM "BillingRecord" WHERE id = NEW.id) IS NULL THEN
    RAISE EXCEPTION 'BillingRecord requires a current snapshot';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "BillingRecord_current_required" AFTER INSERT OR UPDATE ON "BillingRecord"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_billing_record_snapshot();
