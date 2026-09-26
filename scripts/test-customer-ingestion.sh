#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap cleanup_customer_test EXIT
start_customer_test_database customer-ingestion
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password) VALUES ('owner-user', 'owner@example.test', :'password_hash');
INSERT INTO "Organization" (id, name) VALUES ('org-a', 'Org A'), ('org-b', 'Org B'), ('org-c', 'Org C');
INSERT INTO "Membership" (id, role, "userId", "orgId") VALUES ('owner-a', 'OWNER', 'owner-user', 'org-a'), ('owner-b', 'OWNER', 'owner-user', 'org-b');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-org-c', 'Test', :'key_hash', 'org-c');
SQL
set_customer_test_environment
unset CUSTOMER_LINKED_INGESTION_ENABLED
start_customer_test_app
response="$(curl -sS -w '\n%{http_code}' -H 'x-usageflow-api-key: secret-org-c' -H 'content-type: application/json' -d '{"metric":"CALLS","amount":3}' "$NEXTAUTH_URL/api/track")"
if [[ "$response" != $'{"error":"No active subscription"}\n403' ]]; then
  echo "Default-off ingestion returned: $response" >&2
  exit 1
fi
event_count="$(docker exec "$container" psql -X -tAc 'SELECT count(*) FROM "UsageEvent"' -U postgres -d postgres)"
[[ "$event_count" == "0" ]]
stop_customer_test_app
export CUSTOMER_LINKED_INGESTION_ENABLED=true
start_customer_test_app
npx playwright test tests/customer-ingestion.spec.ts --workers=1 || { cat "$app_log"; exit 1; }
