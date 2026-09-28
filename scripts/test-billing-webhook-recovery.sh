#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="usageflow-billing-recovery-pg-$$"
redis_container="usageflow-billing-recovery-redis-$$"
cleanup() {
  docker rm -f "$container" "$redis_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker run --rm -d --name "$container" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=synthetic-only postgres:17.6-alpine >/dev/null
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
for _ in $(seq 1 40); do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
for file in prisma/migrations/*/migration.sql; do
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file" >/dev/null
done
export DATABASE_URL="postgresql://postgres:synthetic-only@127.0.0.1:$(docker port "$container" 5432/tcp | sed 's/.*://')/postgres"
export REDIS_URL="redis://127.0.0.1:$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
npx tsx scripts/billing-webhook-recovery.integration.ts
cleanup
trap - EXIT
bash scripts/test-customer-month-draft.sh
