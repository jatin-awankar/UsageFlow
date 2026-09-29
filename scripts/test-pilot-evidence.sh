#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "--cleanup" ]]; then
  run_id="${2:-}"
  [[ "$run_id" =~ ^[0-9a-f]{8}-[0-9a-f]{3}$ ]] || { echo 'Invalid pilot run ID' >&2; exit 2; }
  artifact_root="${PILOT_EVIDENCE_DIR:-/tmp/usageflow-pilot-evidence}"
  node scripts/pilot-evidence-processes.mjs cleanup "$artifact_root/$run_id" "$run_id"
  docker rm -f "usageflow-pilot-pg-$run_id" "usageflow-pilot-redis-$run_id" >/dev/null 2>&1 || true
  exit 0
fi
mode="${1:---smoke}"
[[ "$mode" == "--smoke" || "$mode" == "--volume" || "$mode" == "--burst" || "$mode" == "--faults" ]] || { echo 'Usage: npm run test:pilot-evidence -- [--smoke|--volume|--burst|--faults]' >&2; exit 2; }
unset CUSTOMER_LINKED_INGESTION_ENABLED
for command in docker node npm curl rg; do command -v "$command" >/dev/null || { echo "Missing prerequisite: $command" >&2; exit 2; }; done
node --test scripts/pilot-evidence-cleanup.test.mjs
run_id="$(node -e 'console.log(require("crypto").randomUUID().slice(0,12))')"
artifact_root="${PILOT_EVIDENCE_DIR:-/tmp/usageflow-pilot-evidence}"
mkdir -p "$artifact_root"
artifact_dir="$artifact_root/$run_id"
mkdir "$artifact_dir"
chmod 700 "$artifact_dir"
pg_container="usageflow-pilot-pg-$run_id"
redis_container="usageflow-pilot-redis-$run_id"
api_pid='' worker_pid=''
cleanup() {
  local exit_status=$?
  if [[ "$mode" == "--faults" && "$exit_status" -ne 0 ]]; then
    node scripts/pilot-evidence-abort.mjs "$artifact_dir" "$run_id" "$exit_status" "${scenario:-setup}" "${fault_phase:-setup}" || true
  fi
  node scripts/pilot-evidence-processes.mjs cleanup "$artifact_dir" "$run_id" || true
  [[ -z "$api_pid" ]] || wait "$api_pid" 2>/dev/null || true
  [[ -z "$worker_pid" ]] || wait "$worker_pid" 2>/dev/null || true
  docker rm -f "$pg_container" "$redis_container" >/dev/null 2>&1 || true
  echo "Retained synthetic evidence: $artifact_dir"
}
trap cleanup EXIT
db_password="$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')"
api_key="pilot-$run_id-$(node -e 'console.log(require("crypto").randomBytes(16).toString("hex"))')"
api_port="$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
docker run --rm -d --name "$pg_container" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD="$db_password" postgres:17.6-alpine >/dev/null
redis_port="$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
docker run -d --name "$redis_container" -p "127.0.0.1:${redis_port}:6379" redis:7-alpine >/dev/null
for _ in $(seq 1 60); do
  if docker logs "$pg_container" 2>&1 | rg -q "PostgreSQL init process complete" && docker exec "$pg_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$pg_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -tAc "SELECT 1" | rg -qx 1
db_port="$(docker port "$pg_container" 5432/tcp | sed 's/.*://')"
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
export DATABASE_URL="postgresql://postgres:${db_password}@127.0.0.1:${db_port}/postgres"
export REDIS_URL="redis://127.0.0.1:${redis_port}"
export QUEUE_NAME="usageflow-pilot-$run_id"
export NEXTAUTH_URL="http://127.0.0.1:${api_port}"
export NEXTAUTH_SECRET="synthetic-$run_id"
export PILOT_COMMIT="$(git rev-parse HEAD)"
export CUSTOMER_BILLING_FINALIZATION_TEST_ENABLED=false
export BILLING_RECORD_TEST_CLOCK_ENABLED=false
for migration in prisma/migrations/*/migration.sql; do docker exec -i "$pg_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$migration" >/dev/null; done
key_hash="$(node -e 'console.log(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' "$api_key")"
docker exec -i "$pg_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v run_id="$run_id" -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id, email) VALUES ('user-' || :'run_id', 'pilot-' || :'run_id' || '@example.test');
INSERT INTO "Organization" (id, name, currency) VALUES ('org-' || :'run_id', 'Synthetic Pilot', 'USD');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('customer-row-' || :'run_id', 'org-' || :'run_id', 'customer-' || :'run_id');
INSERT INTO "Customer" (id, "orgId", "externalId") VALUES ('customer-row-secondary-' || :'run_id', 'org-' || :'run_id', 'customer-secondary-' || :'run_id');
INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ('key-' || :'run_id', 'Synthetic', :'key_hash', 'org-' || :'run_id');
INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-' || :'run_id', 'Synthetic', 0, 'MONTHLY', 'org-' || :'run_id');
INSERT INTO "Subscription" (id, status, "periodStart", "orgId", "planId") VALUES ('subscription-' || :'run_id', 'ACTIVE', now() - interval '1 day', 'org-' || :'run_id', 'plan-' || :'run_id');
INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-' || :'run_id', 'Calls', 'CALLS', 'calls', 'org-' || :'run_id');
INSERT INTO "PriceVersion" (id, "orgId", "metricId", currency, "unitPriceMicros", "effectiveFrom", "createdById") VALUES ('price-' || :'run_id', 'org-' || :'run_id', 'metric-' || :'run_id', 'USD', 1000000, now() - interval '1 day', 'user-' || :'run_id');
SQL
CUSTOMER_LINKED_INGESTION_ENABLED=true ./node_modules/.bin/next dev -p "$api_port" >"$artifact_dir/api.log" 2>&1 & api_pid=$!
node scripts/pilot-evidence-processes.mjs register "$artifact_dir" "$run_id" api "$api_pid"
CUSTOMER_LINKED_INGESTION_ENABLED=true ./node_modules/.bin/tsx worker/index.ts >"$artifact_dir/worker.log" 2>&1 & worker_pid=$!
node scripts/pilot-evidence-processes.mjs register "$artifact_dir" "$run_id" worker "$worker_pid"
for _ in $(seq 1 90); do
  if curl -fsS "$NEXTAUTH_URL/login" >/dev/null 2>&1; then break; fi
  kill -0 "$api_pid" 2>/dev/null || { cat "$artifact_dir/api.log"; exit 1; }
  sleep 1
done
curl -fsS "$NEXTAUTH_URL/login" >/dev/null
if [[ "$mode" == "--faults" ]]; then
  source scripts/pilot-evidence-faults.sh
  run_pilot_faults
  exit 0
fi
if [[ "$mode" != "--smoke" ]]; then
  node scripts/pilot-evidence-load.mjs "$mode" "$run_id" "$artifact_dir" "$NEXTAUTH_URL" "$api_key"
  exit 0
fi
node scripts/pilot-evidence-sender.mjs "$run_id" "$artifact_dir" "$NEXTAUTH_URL" "$api_key"
event_id="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).eventId)' "$artifact_dir/smoke-evidence.json")"
docker exec "$pg_container" psql -X -tAc "SELECT count(*) FROM \"UsageEvent\" WHERE \"orgId\" = 'org-$run_id'" -U postgres -d postgres | grep -qx 1
docker exec "$pg_container" psql -X -tAc "SELECT count(*) FROM \"LedgerProcessingIntent\" WHERE \"eventId\" IN (SELECT id FROM \"UsageEvent\" WHERE \"orgId\" = 'org-$run_id')" -U postgres -d postgres | grep -qx 1
for _ in $(seq 1 30); do
  rated_count="$(docker exec "$pg_container" psql -X -tAc "SELECT count(*) FROM \"RatedEvent\" WHERE \"orgId\" = 'org-$run_id'" -U postgres -d postgres)"
  [[ "$rated_count" == "1" ]] && break
  sleep 1
done
[[ "$rated_count" == "1" ]] || { echo 'Worker did not rate the synthetic event' >&2; exit 1; }
docker exec "$pg_container" psql -X -tAc "SELECT count(*) FROM \"LedgerEventProjection\" WHERE \"orgId\" = 'org-$run_id'" -U postgres -d postgres | grep -qx 1
docker exec "$pg_container" psql -X -tAc "SELECT count(*) FROM \"UsageEvent\" e JOIN \"LedgerProcessingIntent\" i ON i.\"eventId\" = e.id JOIN \"LedgerEventProjection\" p ON p.\"eventId\" = e.id JOIN \"RatedEvent\" r ON r.\"eventId\" = e.id WHERE e.id = '$event_id' AND e.\"orgId\" = 'org-$run_id' AND e.amount = 3 AND p.amount = 3 AND r.quantity = 3 AND r.\"priceVersionId\" = 'price-$run_id' AND r.currency = 'USD' AND r.amount = 3" -U postgres -d postgres | grep -qx 1
echo 'Pilot smoke passed'
