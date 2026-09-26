#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
container="usageflow-customer-schema-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT

# No port, volume, environment URL, or project database is used.
docker run --rm -d --name "$container" -e POSTGRES_PASSWORD=synthetic-only postgres:17.6-alpine >/dev/null
for _ in $(seq 1 40); do
  if docker exec "$container" psql -X -U postgres -d postgres -c "SELECT 1" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$container" pg_isready -U postgres >/dev/null

for file in prisma/migrations/*/migration.sql; do
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file" >/dev/null
done
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < scripts/customer-creation.integration.sql

# Retain the wider design probe in its own synthetic database. It applies the
# proposal after the original migrations, since the proposal is not a migration.
docker exec "$container" createdb -U postgres customer_proposal
for file in prisma/migrations/*/migration.sql; do
  [[ "$file" == *20260926000000_add_customer_identity* || "$file" == *20260926010000_protect_legacy_billing_treatment* || "$file" == *20260926120000_ledger_export_snapshot* ]] && continue
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d customer_proposal < "$file" >/dev/null
done
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d customer_proposal < scripts/customer-schema-proposal.sql >/dev/null
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d customer_proposal < scripts/customer-schema.integration.sql
