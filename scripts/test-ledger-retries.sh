#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap cleanup_customer_test EXIT
start_customer_test_database ledger-retries
other_key_hash="$(node -e "console.log(require('crypto').createHash('sha256').update('secret-org-d').digest('hex'))")"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v key_hash="$key_hash" -v other_key_hash="$other_key_hash" <<'SQL' >/dev/null
INSERT INTO "Organization" (id, name) VALUES ('org-c', 'Org C'), ('org-d', 'Org D');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-org-c', 'Test', :'key_hash', 'org-c'), ('key-org-d', 'Test', :'other_key_hash', 'org-d');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('customer-row-c', 'org-c', 'customer-c'), ('customer-row-d', 'org-d', 'customer-c');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-c', 'Plan', 0, 'MONTHLY', 'org-c'), ('plan-d', 'Plan', 0, 'MONTHLY', 'org-d');
INSERT INTO "Subscription" (id, status, "periodStart", "orgId", "planId") VALUES ('subscription-c', 'ACTIVE', '2026-09-01', 'org-c', 'plan-c'), ('subscription-d', 'ACTIVE', '2026-09-01', 'org-d', 'plan-d');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-c', 'Calls', 'CALLS', 'calls', 'org-c'), ('metric-d', 'Calls', 'CALLS', 'calls', 'org-d');
SQL
set_customer_test_environment
export TZ=UTC CUSTOMER_LINKED_INGESTION_ENABLED=true LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.000Z"
start_customer_test_app
npx playwright test tests/ledger-retries.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
stop_customer_test_app
export LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.001Z"
start_customer_test_app
npx playwright test tests/ledger-retries.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
