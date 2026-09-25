-- Synthetic data only; executed in a disposable PostgreSQL container.
INSERT INTO "Organization" (id, name) VALUES ('org-a', 'A'), ('org-b', 'B');
INSERT INTO "User" (id, email) VALUES ('user-1', 'one@example.test');
INSERT INTO "Membership" (id, role, "userId", "orgId") VALUES
  ('member-a', 'OWNER', 'user-1', 'org-a'),
  ('member-b', 'OWNER', 'user-1', 'org-b');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES
  ('customer-a', 'org-a', 'same-external-id'),
  ('customer-b', 'org-b', 'same-external-id');

INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId")
  VALUES ('plan-a', 'Legacy', 0, 'MONTHLY', 'org-a');
INSERT INTO "Subscription" (id, status, "periodStart", "periodEnd", "orgId", "planId", "externalCustomerId")
  VALUES ('subscription-a', 'ACTIVE', '2026-09-01', '2026-10-01', 'org-a', 'plan-a', 'user-1');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-a', 'Calls', 'CALLS', 'calls', 'org-a');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-a', 'Test', 'hash-a', 'org-a');
INSERT INTO "UsageEvent" (id, "metricKey", amount, "customerId", timestamp, "orgId", "subscriptionId", "apiKeyId", "metricId")
  VALUES ('legacy-ambiguous', 'CALLS', 1, 'mystery-customer', '2026-09-02', 'org-a', 'subscription-a', 'key-a', 'metric-a'),
         ('legacy-user-shaped', 'CALLS', 1, 'user-1', '2026-09-02', 'org-a', 'subscription-a', 'key-a', 'metric-a');
INSERT INTO "Invoice" (id, amount, status, "periodStart", "periodEnd", "orgId", "subscriptionId")
  VALUES ('invoice-a', 1, 'PENDING', '2026-09-01', '2026-10-01', 'org-a', 'subscription-a');

DO $$
DECLARE affected integer;
BEGIN
  IF (SELECT count(*) FROM "Membership" WHERE "userId" = 'user-1') <> 2 THEN
    RAISE EXCEPTION 'one user must belong to two organizations';
  END IF;
  IF (SELECT count(*) FROM "Customer" WHERE "externalId" = 'same-external-id') <> 2 THEN
    RAISE EXCEPTION 'external ID must be reusable across organizations';
  END IF;

  BEGIN
    INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('duplicate-a', 'org-a', 'same-external-id');
    RAISE EXCEPTION 'same-organization duplicate was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('blank-a', 'org-a', '  ');
    RAISE EXCEPTION 'blank external ID was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE "Customer" SET "externalId" = 'reassigned' WHERE id = 'customer-a';
    RAISE EXCEPTION 'external ID reassignment was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM "Customer" WHERE id = 'customer-a';
    RAISE EXCEPTION 'customer identity deletion was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE "Customer" SET active = false WHERE id = 'customer-a';
  IF (SELECT active FROM "Customer" WHERE id = 'customer-a') THEN
    RAISE EXCEPTION 'customer deactivation failed';
  END IF;

  -- The proposed ingestion lookup returns no Customer for an unknown external ID.
  INSERT INTO "UsageEvent" (id, "metricKey", amount, "customerId", timestamp, "orgId", "subscriptionId", "apiKeyId", "metricId", "billedCustomerId")
  SELECT 'unknown-event', 'CALLS', 1, 'unknown', '2026-09-03', 'org-a', 'subscription-a', 'key-a', 'metric-a', id
  FROM "Customer" WHERE "orgId" = 'org-a' AND "externalId" = 'unknown' AND active;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'unknown external ID was resolved'; END IF;

  BEGIN
    UPDATE "UsageEvent" SET "billedCustomerId" = 'customer-b' WHERE id = 'legacy-ambiguous';
    RAISE EXCEPTION 'cross-organization event link was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    UPDATE "Subscription" SET "billedCustomerId" = 'customer-b' WHERE id = 'subscription-a';
    RAISE EXCEPTION 'cross-organization subscription link was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    UPDATE "Invoice" SET "billedCustomerId" = 'customer-b' WHERE id = 'invoice-a';
    RAISE EXCEPTION 'cross-organization invoice link was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  IF EXISTS (SELECT 1 FROM "UsageEvent" WHERE id IN ('legacy-ambiguous', 'legacy-user-shaped') AND "billedCustomerId" IS NOT NULL)
     OR EXISTS (SELECT 1 FROM "Subscription" WHERE id = 'subscription-a' AND "billedCustomerId" IS NOT NULL)
     OR EXISTS (SELECT 1 FROM "Invoice" WHERE id = 'invoice-a' AND "billedCustomerId" IS NOT NULL) THEN
    RAISE EXCEPTION 'legacy rows were mapped automatically';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "UsageEvent" WHERE id = 'legacy-ambiguous' AND "customerId" = 'mystery-customer')
     OR NOT EXISTS (SELECT 1 FROM "Subscription" WHERE id = 'subscription-a' AND "externalCustomerId" = 'user-1') THEN
    RAISE EXCEPTION 'legacy identifiers changed';
  END IF;
END $$;

SELECT 'customer schema integration checks passed' AS result;
