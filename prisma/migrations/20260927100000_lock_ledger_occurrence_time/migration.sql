CREATE FUNCTION prevent_ledger_occurrence_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."billingTreatment" = 'LEDGER_ONLY'
     AND (NEW.timestamp IS DISTINCT FROM OLD.timestamp OR NEW."billingTreatment" IS DISTINCT FROM OLD."billingTreatment") THEN
    RAISE EXCEPTION 'Accepted ledger occurrence time and treatment are immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER ledger_occurrence_immutable BEFORE UPDATE OF timestamp, "billingTreatment" ON "UsageEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_occurrence_change();
