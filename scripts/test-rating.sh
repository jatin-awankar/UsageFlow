#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap 'cleanup_customer_test; docker rm -f "${redis_container:-}" >/dev/null 2>&1 || true; kill "${worker_pid:-}" 2>/dev/null || true; rm -f "${worker_log:-}"' EXIT
start_customer_test_database rating
other_key_hash="$(node -e "console.log(require('crypto').createHash('sha256').update('secret-org-b').digest('hex'))")"
redis_container="usageflow-rating-redis-$$"
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" -v other_key_hash="$other_key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id,email,password) VALUES ('owner-rating','owner-rating@example.test',:'password_hash');
INSERT INTO "Organization" (id,name) VALUES ('rating-a','A'),('rating-b','B');
INSERT INTO "Membership" (id,role,"userId","orgId") VALUES ('rating-owner-a','OWNER','owner-rating','rating-a'),('rating-owner-b','OWNER','owner-rating','rating-b');
INSERT INTO "ApiKey" (id,name,"hashedKey","orgId") VALUES ('rating-key-a','A',:'key_hash','rating-a'),('rating-key-b','B',:'other_key_hash','rating-b');
INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('rating-customer-a','rating-a','same-customer'),('rating-other-a','rating-a','other-customer'),('rating-customer-b','rating-b','same-customer');
INSERT INTO "Plan" (id,name,"basePrice","billingPeriod","orgId") VALUES ('rating-plan-a','Legacy',777,'MONTHLY','rating-a'),('rating-plan-b','Legacy',777,'MONTHLY','rating-b');
INSERT INTO "Subscription" (id,status,"periodStart","orgId","planId") VALUES ('rating-sub-a','ACTIVE','2026-09-01','rating-a','rating-plan-a'),('rating-sub-b','ACTIVE','2026-09-01','rating-b','rating-plan-b');
INSERT INTO "Metric" (id,name,key,unit,"orgId") VALUES ('rating-metric-a','Calls','CALLS','calls','rating-a'),('rating-metric-b','Calls','CALLS','calls','rating-b'),('rating-zero','Free','FREE','calls','rating-a'),('rating-overflow','Huge','HUGE','calls','rating-a');
INSERT INTO "AggregatedUsage" (id,"metricKey",total,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('rating-aggregate','CALLS',11,'2026-09-01','2026-10-01','rating-a','rating-sub-a');
INSERT INTO "Invoice" (id,amount,status,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('rating-invoice',1234,'PENDING','2026-09-01','2026-10-01','rating-a','rating-sub-a');
SQL
set_customer_test_environment
export NEXTAUTH_URL="http://127.0.0.1:3103" CUSTOMER_TEST_BASE_URL="$NEXTAUTH_URL" PRICE_TEST_BASE_URL="$NEXTAUTH_URL"
export REDIS_URL="redis://127.0.0.1:${redis_port}" CUSTOMER_LINKED_INGESTION_ENABLED=true LEDGER_TEST_RECEIPT_TIME="2026-10-04T00:00:00.000Z" RATING_TEST_SKIP_ONCE=true TZ=UTC
start_customer_test_app
worker_log="$(mktemp)"
npx tsx worker/index.ts >"$worker_log" 2>&1 &
worker_pid=$!
npx playwright test tests/rating.spec.ts --workers=1
grep -q 'Rating interrupted after projection' "$worker_log"
grep -q 'Recovering unrated Customer events' "$worker_log"
