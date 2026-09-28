#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
start_customer_test_database customer-finalization-gate
trap cleanup_customer_test EXIT
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password, name) VALUES ('gate-owner', 'gate@example.test', :'password_hash', 'Owner');
INSERT INTO "Organization" (id, name) VALUES ('gate-org', 'Gate');
INSERT INTO "Membership" (id, role, "userId", "orgId") VALUES ('gate-owner-member', 'OWNER', 'gate-owner', 'gate-org');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('gate-customer', 'gate-org', 'customer');
SQL
set_customer_test_environment
export CUSTOMER_LINKED_INGESTION_ENABLED=true
unset CUSTOMER_BILLING_FINALIZATION_TEST_ENABLED
start_customer_test_app
npx playwright test tests/customer-finalization-gate.spec.ts --workers=1
