#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="usageflow-first-price-$$"
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
db_port="$(docker port "$container" 5432/tcp | sed 's/.*://')"
export DATABASE_URL="postgresql://postgres:synthetic-only@127.0.0.1:${db_port}/postgres"
for file in prisma/migrations/*/migration.sql; do
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file" >/dev/null
done
password_hash="$(node -e "require('bcryptjs').hash('TestPass1', 4).then(console.log)")"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email, password) VALUES ('owner-user', 'owner@example.test', :'password_hash'), ('single-user', 'single@example.test', :'password_hash'), ('admin-user', 'admin@example.test', :'password_hash');
INSERT INTO "Organization" (id, name) VALUES ('org-a', 'Org A'), ('org-b', 'Org B');
INSERT INTO "Membership" (id, role, "userId", "orgId") VALUES ('owner-a', 'OWNER', 'owner-user', 'org-a'), ('owner-b', 'OWNER', 'owner-user', 'org-b'), ('single-a', 'OWNER', 'single-user', 'org-a'), ('admin-a', 'ADMIN', 'admin-user', 'org-a');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-a', 'Requests', 'requests', 'request', 'org-a'), ('metric-b', 'Requests', 'requests', 'request', 'org-b'), ('metric-zero', 'Free', 'free', 'request', 'org-a'), ('metric-boundary', 'Boundary', 'boundary', 'request', 'org-a');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('legacy-plan', 'Legacy', 999, 'MONTHLY', 'org-a');
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Organization" WHERE currency IS NOT NULL) THEN RAISE EXCEPTION 'migration inferred a currency'; END IF; END $$;
SQL
export NEXTAUTH_SECRET="synthetic-currency-test-secret"
export NEXTAUTH_URL="http://127.0.0.1:3108"
export PRICE_TEST_BASE_URL="$NEXTAUTH_URL"
npx next dev -p 3108 >"$app_log" 2>&1 &
app_pid=$!
for _ in $(seq 1 60); do
  if curl -fsS "$NEXTAUTH_URL/login" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then cat "$app_log"; exit 1; fi
  sleep 1
done
npx playwright test tests/first-price.spec.ts --workers=1
docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
DO $$ BEGIN
  IF (SELECT "basePrice" FROM "Plan" WHERE id = 'legacy-plan') <> 999 THEN RAISE EXCEPTION 'legacy price changed'; END IF;
  IF (SELECT count(*) FROM "PriceVersion" WHERE "orgId" = 'org-a') <> 2 THEN RAISE EXCEPTION 'published count changed'; END IF;
END $$;
DO $$ BEGIN
  UPDATE "PriceVersion" SET "unitPriceMicros" = 1 WHERE "metricId" = 'metric-a';
  RAISE EXCEPTION 'published update was allowed';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'published update was allowed' THEN RAISE; END IF;
END $$;
DO $$ BEGIN
  DELETE FROM "PriceVersion" WHERE "metricId" = 'metric-a';
  RAISE EXCEPTION 'published delete was allowed';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'published delete was allowed' THEN RAISE; END IF;
END $$;
SQL
