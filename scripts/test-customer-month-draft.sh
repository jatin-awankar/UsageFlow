#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
start_customer_test_database customer-month-draft
redis_container="usageflow-customer-month-draft-redis-$$"
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
cleanup() {
  cleanup_customer_test
  docker rm -f "$redis_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
other_key_hash="$(node -e "console.log(require('crypto').createHash('sha256').update('secret-org-b').digest('hex'))")"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" -v other_key_hash="$other_key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password, name) VALUES ('draft-owner', 'owner@example.test', :'password_hash', 'Owner'), ('draft-viewer', 'viewer@example.test', :'password_hash', 'Viewer');
INSERT INTO "Organization" (id, name) VALUES ('draft-a', 'A'), ('draft-b', 'B');
INSERT INTO "Membership" (id, role, "userId", "orgId") VALUES ('draft-owner-a', 'OWNER', 'draft-owner', 'draft-a'), ('draft-owner-b', 'OWNER', 'draft-owner', 'draft-b'), ('draft-viewer-a', 'VIEWER', 'draft-viewer', 'draft-a');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('draft-key', 'Key', :'key_hash', 'draft-a'), ('draft-key-b', 'Key', :'other_key_hash', 'draft-b');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('draft-plan', 'Plan', 0, 'MONTHLY', 'draft-a'), ('draft-plan-b', 'Plan', 0, 'MONTHLY', 'draft-b');
INSERT INTO "Subscription" (id, status, "periodStart", "orgId", "planId") VALUES ('draft-sub', 'ACTIVE', '2024-02-01', 'draft-a', 'draft-plan'), ('draft-sub-b', 'ACTIVE', '2024-02-01', 'draft-b', 'draft-plan-b');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('draft-metric', 'Calls', 'CALLS', 'calls', 'draft-a'), ('draft-overflow', 'Large', 'LARGE', 'calls', 'draft-a'), ('draft-unpriced', 'Unpriced', 'UNPRICED', 'calls', 'draft-a'), ('draft-metric-b', 'Calls', 'CALLS', 'calls', 'draft-b');
INSERT INTO "Invoice" (id, amount, status, "periodStart", "periodEnd", "orgId", "subscriptionId") VALUES ('legacy-invoice', 999, 'PENDING', '2024-02-01', '2024-03-01', 'draft-a', 'draft-sub');
SQL
set_customer_test_environment
export TZ=UTC CUSTOMER_LINKED_INGESTION_ENABLED=true BILLING_RECORD_TEST_CLOCK_ENABLED=true LEDGER_TEST_RECEIPT_TIME="2024-03-03T00:00:00.000Z"
export REDIS_URL="redis://127.0.0.1:${redis_port}"
start_customer_test_app
npx playwright test tests/customer-month-draft.spec.ts --workers=1
