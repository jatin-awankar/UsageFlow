#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
start_customer_test_database ledger-export
redis_container="usageflow-ledger-export-redis-$$"
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
cleanup() {
  cleanup_customer_test
  docker rm -f "$redis_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
password_hash="$(node -e "require('bcryptjs').hash('TestPass1', 4).then(console.log)")"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password, name) VALUES ('owner-c', 'owner@example.test', :'password_hash', 'Private owner'), ('viewer-c', 'viewer@example.test', :'password_hash', 'Private viewer');
INSERT INTO "Organization" (id, name) VALUES ('org-c', 'Private Org'), ('org-other', 'Other Org');
INSERT INTO "Membership" (id, role, "userId", "orgId") VALUES ('owner-c', 'OWNER', 'owner-c', 'org-c'), ('viewer-c', 'VIEWER', 'viewer-c', 'org-c');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-org-c', 'Private API key', :'key_hash', 'org-c');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('customer-row-c', 'org-c', 'customer-c');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-c', 'Plan', 0, 'MONTHLY', 'org-c');
INSERT INTO "Subscription" (id, status, "periodStart", "orgId", "planId") VALUES ('subscription-c', 'ACTIVE', '2026-10-01', 'org-c', 'plan-c');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-c', 'Calls', 'CALLS', 'calls', 'org-c');
SQL
set_customer_test_environment
export TZ=UTC CUSTOMER_LINKED_INGESTION_ENABLED=true LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.000Z"
export REDIS_URL="redis://127.0.0.1:${redis_port}"
start_customer_test_app
npx playwright test tests/ledger-export.spec.ts --workers=1
