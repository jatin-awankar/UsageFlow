#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap 'cleanup_customer_test; docker rm -f "${redis_container:-}" >/dev/null 2>&1 || true; kill "${worker_pid:-}" 2>/dev/null || true; rm -f "${worker_log:-}"' EXIT
start_customer_test_database rating-lock-protocol
redis_container="usageflow-rating-lock-redis-$$"
docker run --rm -d --name "$redis_container" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
redis_port="$(docker port "$redis_container" 6379/tcp | sed 's/.*://')"
export LOCK_TEST_FIRST_EFFECTIVE="$(node -e 'const n=new Date(); console.log(new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()+1)).toISOString())')"
export LOCK_TEST_SCHEDULED_EFFECTIVE="$(node -e 'console.log(new Date(Date.parse(process.env.LOCK_TEST_FIRST_EFFECTIVE)+86400000).toISOString())')"
password_hash="$(node -e "require('bcryptjs').hash('TestPass1', 4).then(console.log)")"
key_hash="$(node -e "console.log(require('crypto').createHash('sha256').update('secret-org-c').digest('hex'))")"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" -v first_effective="$LOCK_TEST_FIRST_EFFECTIVE" <<'SQL' >/dev/null
INSERT INTO "User" (id,email,password) VALUES ('lock-owner','lock-owner@example.test',:'password_hash');
INSERT INTO "Organization" (id,name,currency) VALUES ('lock-org','Lock protocol','USD');
INSERT INTO "Membership" (id,role,"userId","orgId") VALUES ('lock-owner-member','OWNER','lock-owner','lock-org');
INSERT INTO "ApiKey" (id,name,"hashedKey","orgId") VALUES ('lock-key','Test',:'key_hash','lock-org');
INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('lock-customer','lock-org','customer-a');
INSERT INTO "Plan" (id,name,"basePrice","billingPeriod","orgId") VALUES ('lock-plan','Legacy',0,'MONTHLY','lock-org');
INSERT INTO "Subscription" (id,status,"periodStart","orgId","planId") VALUES ('lock-sub','ACTIVE',now() - interval '1 day','lock-org','lock-plan');
INSERT INTO "Metric" (id,name,key,unit,"orgId") VALUES ('lock-parallel','Parallel','PARALLEL','calls','lock-org'),('lock-schedule','Schedule','SCHEDULE','calls','lock-org'),('lock-gap','Gap','GAP','calls','lock-org');
INSERT INTO "PriceVersion" (id,"orgId","metricId",currency,"unitPriceMicros","effectiveFrom","createdById") VALUES
 ('lock-parallel-price','lock-org','lock-parallel','USD',1000000,:'first_effective','lock-owner'),
 ('lock-schedule-price','lock-org','lock-schedule','USD',1000000,:'first_effective','lock-owner');
SQL
set_customer_test_environment
export REDIS_URL="redis://127.0.0.1:${redis_port}" CUSTOMER_LINKED_INGESTION_ENABLED=true TZ=UTC
start_customer_test_app
worker_log="$(mktemp)"
./node_modules/.bin/tsx worker/index.ts >"$worker_log" 2>&1 &
worker_pid=$!
if ! npx playwright test tests/rating-lock-protocol.spec.ts --workers=1; then
  cat "$worker_log"
  exit 1
fi
