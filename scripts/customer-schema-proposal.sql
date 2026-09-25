-- Design probe only. Apply to a disposable database after existing migrations.
-- This is not a Prisma migration and performs no legacy mapping or backfill.
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_externalId_valid" CHECK ("externalId" <> '' AND "externalId" = btrim("externalId")),
  CONSTRAINT "Customer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Customer_orgId_externalId_key" UNIQUE ("orgId", "externalId"),
  CONSTRAINT "Customer_orgId_id_key" UNIQUE ("orgId", "id")
);

CREATE FUNCTION "guardCustomerIdentity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Customer identities are retained; deactivate instead' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."id" <> OLD."id" OR NEW."orgId" <> OLD."orgId" OR NEW."externalId" <> OLD."externalId" THEN
    RAISE EXCEPTION 'Customer identity is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Customer_identity_guard" BEFORE UPDATE OR DELETE ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION "guardCustomerIdentity"();

ALTER TABLE "UsageEvent" ADD COLUMN "billedCustomerId" TEXT;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_orgId_billedCustomerId_fkey"
  FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "UsageEvent_orgId_billedCustomerId_idx" ON "UsageEvent"("orgId", "billedCustomerId");

ALTER TABLE "Subscription" ADD COLUMN "billedCustomerId" TEXT;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_billedCustomerId_fkey"
  FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Subscription_orgId_billedCustomerId_idx" ON "Subscription"("orgId", "billedCustomerId");

ALTER TABLE "Invoice" ADD COLUMN "billedCustomerId" TEXT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orgId_billedCustomerId_fkey"
  FOREIGN KEY ("orgId", "billedCustomerId") REFERENCES "Customer"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Invoice_orgId_billedCustomerId_idx" ON "Invoice"("orgId", "billedCustomerId");
