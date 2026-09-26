#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap cleanup_customer_test EXIT
start_customer_test_database ledger-acceptance
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password) VALUES ('owner-user', 'owner@example.test', :'password_hash');
INSERT INTO "Organization" (id, name) VALUES ('org-c', 'Org C');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-org-c', 'Test', :'key_hash', 'org-c');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('customer-row-c', 'org-c', 'customer-c');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-c', 'Plan', 0, 'MONTHLY', 'org-c');
INSERT INTO "Subscription" (id, status, "periodStart", "orgId", "planId") VALUES ('subscription-c', 'ACTIVE', '2026-09-01', 'org-c', 'plan-c');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-c', 'Calls', 'CALLS', 'calls', 'org-c');
SQL
set_customer_test_environment
export TZ=UTC
export CUSTOMER_LINKED_INGESTION_ENABLED=true
export LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.000Z"
start_customer_test_app
npx playwright test tests/ledger-acceptance.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
stop_customer_test_app
export LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.001Z"
start_customer_test_app
npx playwright test tests/ledger-acceptance.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
