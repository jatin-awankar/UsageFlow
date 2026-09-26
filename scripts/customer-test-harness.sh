#!/usr/bin/env bash

start_customer_test_database() {
  container="usageflow-$1-$$"
  app_log="$(mktemp)"
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
  key_hash="$(node -e "console.log(require('crypto').createHash('sha256').update('secret-org-c').digest('hex'))")"
}

set_customer_test_environment() {
  export NEXTAUTH_SECRET="synthetic-customer-ingestion-test-secret"
  export NEXTAUTH_URL="http://127.0.0.1:3103"
  export CUSTOMER_TEST_BASE_URL="$NEXTAUTH_URL"
  export REDIS_URL="redis://127.0.0.1:1"
}

start_customer_test_app() {
  npx next dev -p 3103 >"$app_log" 2>&1 &
  app_pid=$!
  for _ in $(seq 1 60); do
    if curl -fsS "$NEXTAUTH_URL/login" >/dev/null 2>&1; then break; fi
    if ! kill -0 "$app_pid" 2>/dev/null; then cat "$app_log"; exit 1; fi
    sleep 1
  done
  curl -fsS "$NEXTAUTH_URL/login" >/dev/null
}

stop_customer_test_app() {
  kill "$app_pid"
  wait "$app_pid" 2>/dev/null || true
  unset app_pid
}

cleanup_customer_test() {
  if [[ -n "${app_pid:-}" ]]; then kill "$app_pid" 2>/dev/null || true; fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -f "$app_log"
}
