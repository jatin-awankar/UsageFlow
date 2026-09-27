#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap 'cleanup_customer_test; docker rm -f "${redis_container:-}" >/dev/null 2>&1 || true; kill "${worker_pid:-}" 2>/dev/null || true; rm -f "${worker_log:-}"' EXIT
start_customer_test_database gap-preview
other_key_hash="$(node -e "console.log(require('crypto').createHash('sha256').update('secret-org-b').digest('hex'))")"
redis_container="usageflow-gap-preview-redis-$$"
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" -v other_key_hash="$other_key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id,email,password) VALUES ('gap-owner','gap-owner@example.test',:'password_hash'),('gap-viewer','gap-viewer@example.test',:'password_hash'),('gap-outsider','gap-outsider@example.test',:'password_hash');
INSERT INTO "Organization" (id,name) VALUES ('gap-a','A'),('gap-b','B');
INSERT INTO "Membership" (id,role,"userId","orgId") VALUES ('gap-owner-member','OWNER','gap-owner','gap-a'),('gap-viewer-member','VIEWER','gap-viewer','gap-a');
INSERT INTO "ApiKey" (id,name,"hashedKey","orgId") VALUES ('gap-key-a','A',:'key_hash','gap-a'),('gap-key-b','B',:'other_key_hash','gap-b');
INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('gap-customer-a','gap-a','same-external'),('gap-other-a','gap-a','other-external'),('gap-customer-b','gap-b','same-external');
INSERT INTO "Plan" (id,name,"basePrice","billingPeriod","orgId") VALUES ('gap-plan-a','A',0,'MONTHLY','gap-a'),('gap-plan-b','B',0,'MONTHLY','gap-b');
INSERT INTO "Subscription" (id,status,"periodStart","orgId","planId") VALUES ('gap-sub-a','ACTIVE','2026-09-01','gap-a','gap-plan-a'),('gap-sub-b','ACTIVE','2026-09-01','gap-b','gap-plan-b');
INSERT INTO "Metric" (id,name,key,unit,"orgId") VALUES ('gap-metric-a','Calls','CALLS','calls','gap-a'),('gap-other-metric','Other','OTHER','calls','gap-a'),('gap-metric-b','Calls','CALLS','calls','gap-b');
INSERT INTO "AggregatedUsage" (id,"metricKey",total,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('gap-aggregate','CALLS',11,'2026-09-01','2026-10-01','gap-a','gap-sub-a');
INSERT INTO "Invoice" (id,amount,status,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('gap-invoice',1234,'PENDING','2026-09-01','2026-10-01','gap-a','gap-sub-a');
INSERT INTO "UsageEvent" (id,"metricKey",amount,"customerId","billedCustomerId","billingTreatment",timestamp,"orgId","subscriptionId","apiKeyId","metricId")
VALUES ('gap-linked-legacy','CALLS',2,'same-external','gap-customer-a','LEGACY','2026-09-30T00:00:00.000Z','gap-a','gap-sub-a','gap-key-a','gap-metric-a');
SQL
set_customer_test_environment
export TZ=UTC REDIS_URL="redis://127.0.0.1:${redis_port}" CUSTOMER_LINKED_INGESTION_ENABLED=true LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.000Z"
start_customer_test_app
worker_log="$(mktemp)"
./node_modules/.bin/tsx worker/index.ts >"$worker_log" 2>&1 &
worker_pid=$!
npx playwright test tests/pricing-gap-preview.spec.ts --workers=1
