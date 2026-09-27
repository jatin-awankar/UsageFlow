#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap 'cleanup_customer_test; docker rm -f "${redis_container:-}" >/dev/null 2>&1 || true; kill "${worker_pid:-}" 2>/dev/null || true; rm -f "${worker_log:-}"' EXIT
start_customer_test_database unrated
redis_container="usageflow-unrated-redis-$$"
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id,email,password) VALUES ('owner-unrated','owner-unrated@example.test',:'password_hash'),('outsider-unrated','outsider-unrated@example.test',:'password_hash');
INSERT INTO "Organization" (id,name,currency) VALUES ('unrated-org','Unrated','USD'),('other-org','Other','USD');
INSERT INTO "Membership" (id,role,"userId","orgId") VALUES ('unrated-owner','OWNER','owner-unrated','unrated-org');
INSERT INTO "ApiKey" (id,name,"hashedKey","orgId") VALUES ('unrated-key','Test',:'key_hash','unrated-org');
INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('unrated-customer','unrated-org','customer-a');
INSERT INTO "Plan" (id,name,"basePrice","billingPeriod","orgId") VALUES ('unrated-plan','Legacy',25,'MONTHLY','unrated-org');
INSERT INTO "Subscription" (id,status,"periodStart","orgId","planId") VALUES ('unrated-sub','ACTIVE','2026-09-01','unrated-org','unrated-plan');
INSERT INTO "Metric" (id,name,key,unit,"orgId") VALUES ('unrated-metric','Calls','CALLS','calls','unrated-org'),('priced-metric','Priced','PRICED','calls','unrated-org');
INSERT INTO "AggregatedUsage" (id,"metricKey",total,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('unrated-aggregate','CALLS',11,'2026-09-01','2026-10-01','unrated-org','unrated-sub');
INSERT INTO "Invoice" (id,amount,status,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('unrated-invoice',42,'PENDING','2026-09-01','2026-10-01','unrated-org','unrated-sub');
SQL
set_customer_test_environment
export REDIS_URL="redis://127.0.0.1:${redis_port}" CUSTOMER_LINKED_INGESTION_ENABLED=true LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.000Z" LEDGER_TEST_FAIL_DISPATCH=true TZ=UTC
start_customer_test_app
worker_log="$(mktemp)"
node --import tsx worker/index.ts >"$worker_log" 2>&1 &
worker_pid=$!
export UNRATED_TEST_WORKER_PID="$worker_pid"
npx playwright test tests/unrated-recovery.spec.ts --workers=1
