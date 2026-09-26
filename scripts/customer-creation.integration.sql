-- Synthetic data only; run against the committed migrations in a disposable database.
INSERT INTO "Organization" (id, name) VALUES ('org-a', 'A'), ('org-b', 'B');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES
  ('customer-a', 'org-a', 'same-id'),
  ('customer-b', 'org-b', 'same-id');

DO $$
BEGIN
  IF (SELECT count(*) FROM "Customer" WHERE "externalId" = 'same-id') <> 2 THEN
    RAISE EXCEPTION 'cross-organization reuse failed';
  END IF;
  BEGIN
    INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('duplicate', 'org-a', 'same-id');
    RAISE EXCEPTION 'duplicate was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('blank', 'org-a', '  ');
    RAISE EXCEPTION 'blank was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('padded', 'org-a', ' padded ');
    RAISE EXCEPTION 'padded was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE "Customer" SET "orgId" = 'org-b' WHERE id = 'customer-a';
    RAISE EXCEPTION 'ownership changed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE "Customer" SET "externalId" = 'changed' WHERE id = 'customer-a';
    RAISE EXCEPTION 'identity changed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE "Customer" SET active = false WHERE id = 'customer-a';
  IF EXISTS (SELECT 1 FROM "Customer" WHERE id = 'customer-a' AND active) THEN
    RAISE EXCEPTION 'deactivation failed';
  END IF;
  BEGIN
    DELETE FROM "Customer" WHERE id = 'customer-a';
    RAISE EXCEPTION 'identity deleted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

SELECT 'customer creation checks passed' AS result;
