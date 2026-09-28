#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
start_customer_test_database billing-webhook-deployed-gate
trap cleanup_customer_test EXIT
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password, name)
  VALUES ('gate-owner', 'gate@example.test', :'password_hash', 'Owner');
INSERT INTO "Organization" (id, name) VALUES ('gate-org', 'Gate');
INSERT INTO "Membership" (id, role, "userId", "orgId")
  VALUES ('gate-owner-member', 'OWNER', 'gate-owner', 'gate-org');
INSERT INTO "Customer" (id, "orgId", "externalId")
  VALUES ('gate-customer', 'gate-org', 'customer');
SQL
set_customer_test_environment
# Deliberately set both nonproduction flags. NODE_ENV=production must still
# keep the owner finalization and revision routes closed.
export CUSTOMER_LINKED_INGESTION_ENABLED=true
export CUSTOMER_BILLING_FINALIZATION_TEST_ENABLED=true
NODE_ENV=production npx next build
NODE_ENV=production npx next start -p 3103 >"$app_log" 2>&1 &
app_pid=$!
for _ in $(seq 1 60); do
  if curl -fsS "$NEXTAUTH_URL/login" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then cat "$app_log"; exit 1; fi
  sleep 1
done
curl -fsS "$NEXTAUTH_URL/login" >/dev/null
npx playwright test tests/customer-finalization-gate.spec.ts --workers=1
