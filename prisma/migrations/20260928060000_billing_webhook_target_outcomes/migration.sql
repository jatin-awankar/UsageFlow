ALTER TYPE "WebhookEventStatus" ADD VALUE 'NO_TARGET';
ALTER TYPE "WebhookDeliveryStatus" ADD VALUE 'SKIPPED';

CREATE OR REPLACE FUNCTION billing_record_final_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."billingRecordVersionId" IS NOT NULL AND
    (TG_OP = 'DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.type IS DISTINCT FROM OLD.type OR
     NEW.payload IS DISTINCT FROM OLD.payload OR NEW."orgId" IS DISTINCT FROM OLD."orgId" OR
     NEW."billingRecordVersionId" IS DISTINCT FROM OLD."billingRecordVersionId" OR
     NEW."targetEndpointIds" IS DISTINCT FROM OLD."targetEndpointIds" OR
     NEW."createdAt" IS DISTINCT FROM OLD."createdAt")
  THEN RAISE EXCEPTION 'Final BillingRecord outbound evidence is immutable'; END IF;
  RETURN NEW;
END $$;

-- A selected endpoint remains addressable under its original Organization and
-- URL. Active and secret may still change; an inactive endpoint is skipped.
CREATE FUNCTION billing_webhook_selected_endpoint_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "WebhookEvent" e WHERE e."billingRecordVersionId" IS NOT NULL
    AND OLD.id = ANY(e."targetEndpointIds")) AND
    (TG_OP = 'DELETE' OR NEW.url IS DISTINCT FROM OLD.url OR NEW."orgId" IS DISTINCT FROM OLD."orgId")
  THEN RAISE EXCEPTION 'Selected billing webhook endpoint cannot be redirected or deleted'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "WebhookEndpoint_selected_billing_target_guard"
  BEFORE UPDATE OF url, "orgId" OR DELETE ON "WebhookEndpoint"
  FOR EACH ROW EXECUTE FUNCTION billing_webhook_selected_endpoint_guard();
