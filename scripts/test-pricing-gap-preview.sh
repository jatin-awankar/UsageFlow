#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap 'cleanup_customer_test' EXIT
start_customer_test_database gap-preview
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id,email,password) VALUES ('gap-owner','gap-owner@example.test',:'password_hash'),('gap-viewer','gap-viewer@example.test',:'password_hash'),('gap-outsider','gap-outsider@example.test',:'password_hash');
INSERT INTO "Organization" (id,name,currency) VALUES ('gap-a','A','USD'),('gap-b','B','EUR');
INSERT INTO "Membership" (id,role,"userId","orgId") VALUES ('gap-owner-member','OWNER','gap-owner','gap-a'),('gap-viewer-member','VIEWER','gap-viewer','gap-a');
INSERT INTO "ApiKey" (id,name,"hashedKey","orgId") VALUES ('gap-key-a','A',:'key_hash','gap-a'),('gap-key-b','B','other-test-hash','gap-b');
INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('gap-customer-a','gap-a','same-external'),('gap-other-a','gap-a','other-external'),('gap-customer-b','gap-b','same-external');
INSERT INTO "Plan" (id,name,"basePrice","billingPeriod","orgId") VALUES ('gap-plan-a','A',0,'MONTHLY','gap-a'),('gap-plan-b','B',0,'MONTHLY','gap-b');
INSERT INTO "Subscription" (id,status,"periodStart","orgId","planId") VALUES ('gap-sub-a','ACTIVE','2026-09-01','gap-a','gap-plan-a'),('gap-sub-b','ACTIVE','2026-09-01','gap-b','gap-plan-b');
INSERT INTO "Metric" (id,name,key,unit,"orgId") VALUES ('gap-metric-a','Calls','CALLS','calls','gap-a'),('gap-other-metric','Other','OTHER','calls','gap-a'),('gap-metric-b','Calls','CALLS','calls','gap-b');
INSERT INTO "PriceVersion" (id,"orgId","metricId",currency,"unitPriceMicros","effectiveFrom","createdById") VALUES ('gap-price','gap-a','gap-metric-a','USD',1000000,'2026-10-01T00:00:00.000Z','gap-owner');
SQL
set_customer_test_environment
export TZ=UTC
start_customer_test_app
npx playwright test tests/pricing-gap-preview.spec.ts --workers=1
