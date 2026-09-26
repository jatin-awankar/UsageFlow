#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
container="usageflow-customer-owner-$$"
app_log="$(mktemp)"
cleanup() {
  if [[ -n "${app_pid:-}" ]]; then kill "$app_pid" 2>/dev/null || true; fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -f "$app_log"
}
trap cleanup EXIT

docker run --rm -d --name "$container" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=synthetic-only postgres:17.6-alpine >/dev/null
for _ in $(seq 1 40); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$container" pg_isready -U postgres >/dev/null
db_port="$(docker port "$container" 5432/tcp | sed 's/.*://')"
export DATABASE_URL="postgresql://postgres:synthetic-only@127.0.0.1:${db_port}/postgres"
for file in prisma/migrations/*/migration.sql; do
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file" >/dev/null
done

password_hash="$(node -e "require('bcryptjs').hash('TestPass1', 4).then(console.log)")"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password) VALUES
  ('owner-user', 'owner@example.test', :'password_hash'),
  ('viewer-user', 'viewer@example.test', :'password_hash');
INSERT INTO "Organization" (id, name) VALUES ('org-a', 'Org A'), ('org-b', 'Org B');
INSERT INTO "Membership" (id, role, "userId", "orgId") VALUES
  ('owner-a', 'OWNER', 'owner-user', 'org-a'),
  ('owner-b', 'OWNER', 'owner-user', 'org-b'),
  ('viewer-a', 'VIEWER', 'viewer-user', 'org-a');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('existing-customer', 'org-a', 'existing-id');
SQL

export NEXTAUTH_SECRET="synthetic-customer-owner-test-secret"
export NEXTAUTH_URL="http://127.0.0.1:3102"
export CUSTOMER_TEST_BASE_URL="$NEXTAUTH_URL"
npx next dev -p 3102 >"$app_log" 2>&1 &
app_pid=$!
for _ in $(seq 1 60); do
  if curl -fsS "$NEXTAUTH_URL/login" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then cat "$app_log"; exit 1; fi
  sleep 1
done
curl -fsS "$NEXTAUTH_URL/login" >/dev/null
npx playwright test tests/customer-owner.spec.ts --workers=1
