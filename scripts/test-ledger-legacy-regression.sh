#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap cleanup_customer_test EXIT
start_customer_test_database ledger-legacy-regression
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "Organization" (id, name) VALUES ('org-c', 'Org C');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-org-c', 'Test', :'key_hash', 'org-c');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('customer-row-c', 'org-c', 'customer-c');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-c', 'Plan', 0, 'MONTHLY', 'org-c');
INSERT INTO "Subscription" (id, status, "periodStart", "periodEnd", "orgId", "planId") VALUES ('subscription-c', 'ACTIVE', '2026-09-01', '2026-10-01', 'org-c', 'plan-c');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-c', 'Calls', 'CALLS', 'calls', 'org-c');
INSERT INTO "PlanMetric" (id, "includedUnits", "pricePerUnit", "planId", "metricId") VALUES ('plan-metric-c', 0, 10, 'plan-c', 'metric-c');
INSERT INTO "UsageEvent" (id, "metricKey", amount, timestamp, "orgId", "subscriptionId", "apiKeyId", "billingTreatment") VALUES ('historical', 'CALLS', 7, '2026-09-02', 'org-c', 'subscription-c', 'key-org-c', 'LEGACY');
SQL
set_customer_test_environment
export CUSTOMER_LINKED_INGESTION_ENABLED=true
export LEDGER_TEST_RECEIPT_TIME="2026-10-02T00:00:00.000Z"
start_customer_test_app
npx playwright test tests/ledger-legacy-regression.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
