CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_externalId_valid" CHECK ("externalId" <> '' AND "externalId" = btrim("externalId", E' \t\n\r\f\v')),
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
