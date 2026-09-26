#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
container="usageflow-legacy-billing-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT

docker run --rm -d --name "$container" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=synthetic-only postgres:17.6-alpine >/dev/null
for _ in $(seq 1 40); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$container" pg_isready -U postgres >/dev/null

for file in prisma/migrations/*/migration.sql; do
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file" >/dev/null
done

port=$(docker port "$container" 5432/tcp | sed 's/.*://')
DATABASE_URL="postgresql://postgres:synthetic-only@127.0.0.1:${port}/postgres" REDIS_URL="redis://127.0.0.1:1" npx tsx scripts/legacy-billing-treatment.integration.ts
