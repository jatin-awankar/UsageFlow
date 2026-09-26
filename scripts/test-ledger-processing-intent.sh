#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap cleanup_customer_test EXIT
start_customer_test_database ledger-processing-intent
redis_container="usageflow-ledger-redis-$$"
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
trap 'cleanup_customer_test; docker rm -f "$redis_container" >/dev/null 2>&1 || true' EXIT
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "Organization" (id, name) VALUES ('org-c', 'Org C');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-org-c', 'Test', :'key_hash', 'org-c');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('customer-row-c', 'org-c', 'customer-c');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-c', 'Plan', 0, 'MONTHLY', 'org-c');
INSERT INTO "Subscription" (id, status, "periodStart", "orgId", "planId") VALUES ('subscription-c', 'ACTIVE', '2026-10-01', 'org-c', 'plan-c');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-c', 'Calls', 'CALLS', 'calls', 'org-c');
SQL
set_customer_test_environment
export TZ=UTC CUSTOMER_LINKED_INGESTION_ENABLED=true LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.000Z" LEDGER_TEST_FAIL_DISPATCH=true
start_customer_test_app
npx playwright test tests/ledger-processing-intent.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
stop_customer_test_app
export CUSTOMER_LINKED_INGESTION_ENABLED=false
start_customer_test_app
npx playwright test tests/ledger-processing-intent-rollback.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
stop_customer_test_app
export CUSTOMER_LINKED_INGESTION_ENABLED=true
export LEDGER_TEST_FAIL_DISPATCH=false REDIS_URL="redis://127.0.0.1:${redis_port}"
start_customer_test_app
npx playwright test tests/ledger-processing-intent.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
