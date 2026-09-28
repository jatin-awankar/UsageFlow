#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

container="usageflow-webhook-upgrade-$$"
rollback_dir="$(mktemp -d)"
rollback_log="$(mktemp)"
cleanup() {
  if [[ -n "${rollback_pid:-}" ]]; then kill "$rollback_pid" 2>/dev/null || true; fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$rollback_dir"
  rm -f "$rollback_log"
}
trap cleanup EXIT
docker run --rm -d --name "$container" -p 127.0.0.1::5432 \
  -e POSTGRES_PASSWORD=synthetic-only postgres:17.6-alpine >/dev/null
for _ in $(seq 1 40); do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null

run_sql() {
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}
for file in prisma/migrations/*/migration.sql; do
  case "$file" in
    prisma/migrations/202609280[6-9]*|prisma/migrations/2026092810*) break ;;
  esac
  run_sql < "$file" >/dev/null
done

# This fixture represents already committed finalization evidence, a failed
# delivery, and an unrelated legacy event before the webhook migrations.
password_hash="$(node -e "require('bcryptjs').hash('TestPass1', 4).then(console.log)")"
run_sql -v password_hash="$password_hash" <<'SQL' >/dev/null
INSERT INTO "Organization" (id,name) VALUES ('upgrade-org','Synthetic upgrade');
INSERT INTO "User" (id,email,password) VALUES ('upgrade-owner','upgrade@example.test',:'password_hash');
INSERT INTO "Membership" (id,"userId","orgId",role)
  VALUES ('upgrade-owner-member','upgrade-owner','upgrade-org','OWNER');
INSERT INTO "Customer" (id,"orgId","externalId") VALUES ('upgrade-customer','upgrade-org','synthetic-customer');
BEGIN;
INSERT INTO "BillingRecord" (id,"orgId","billedCustomerId","periodStart","periodEnd","closeAt")
  VALUES ('upgrade-record','upgrade-org','upgrade-customer','2026-08-01','2026-09-01','2026-09-04');
INSERT INTO "BillingRecordSnapshot" (id,"billingRecordId","calculatedAt",state,"sourceEvents")
  VALUES ('upgrade-snapshot','upgrade-record',now(),'READY_FOR_REVIEW','[]');
UPDATE "BillingRecord" SET "currentSnapshotId"='upgrade-snapshot' WHERE id='upgrade-record';
COMMIT;
INSERT INTO "BillingRecordVersion" (id,"billingRecordId","snapshotId",version,"approvedById","finalizedAt",
  "periodStart","periodEnd","closeAt","sourceEvents","ratedSources","eventOutcomes",lines,reconciliation,
  "lateArrivals",comparison,currency,amount)
  VALUES ('upgrade-version','upgrade-record','upgrade-snapshot',1,'upgrade-owner',now(),
  '2026-08-01','2026-09-01','2026-09-04','[]','[]','[]','[]','{}','[]','{}','USD',12);
INSERT INTO "WebhookEndpoint" (id,url,secret,active,"orgId",events)
  VALUES ('upgrade-endpoint','http://127.0.0.1:1/receiver','synthetic-only',true,'upgrade-org',ARRAY['invoice.finalized']);
INSERT INTO "WebhookEvent" (id,type,payload,status,"orgId","billingRecordVersionId","targetEndpointIds")
  VALUES ('upgrade-final','invoice.finalized','{"amount":"12.000"}','PENDING','upgrade-org',
    'upgrade-version',ARRAY['upgrade-endpoint']);
INSERT INTO "WebhookDelivery" (id,"webhookEventId","endpointId",status,attempt,"responseCode")
  VALUES ('upgrade-attempt','upgrade-final','upgrade-endpoint','FAILED',1,500);
INSERT INTO "WebhookEvent" (id,type,payload,status,"orgId")
  VALUES ('upgrade-legacy','invoice.created','{"legacy":true}','PENDING','upgrade-org');
SQL

before="$(run_sql -At <<'SQL'
SELECT (SELECT count(*) FROM "BillingRecordVersion") || ':' ||
       (SELECT count(*) FROM "WebhookEvent") || ':' ||
       (SELECT count(*) FROM "WebhookDelivery") || ':' ||
       (SELECT count(*) FROM "WebhookEndpoint");
SQL
)"
[[ "$before" == "1:2:1:1" ]] || { echo "Unexpected pre-upgrade fixture counts" >&2; exit 1; }

for file in prisma/migrations/202609280[6-9]*/migration.sql prisma/migrations/2026092810*/migration.sql; do
  run_sql < "$file" >/dev/null
done

after="$(run_sql -At <<'SQL'
SELECT (SELECT count(*) FROM "BillingRecordVersion") || ':' ||
       (SELECT count(*) FROM "WebhookEvent") || ':' ||
       (SELECT count(*) FROM "WebhookDelivery") || ':' ||
       (SELECT count(*) FROM "WebhookEndpoint");
SQL
)"
[[ "$after" == "$before" ]] || { echo "Upgrade changed committed evidence counts" >&2; exit 1; }

state="$(run_sql -At <<'SQL'
SELECT e.type || ':' || e.status || ':' || cardinality(e."targetEndpointIds") || ':' ||
       (e."targetSelectionRecordedAt" IS NOT NULL)::text || ':' ||
       w."attemptCount" || ':' || w."failedAttempts" || ':' || w.cycle || ':' ||
       d.status || ':' || d.attempt || ':' || d.cycle
FROM "WebhookEvent" e JOIN "BillingWebhookWork" w ON w."webhookEventId"=e.id
JOIN "WebhookDelivery" d ON d."webhookEventId"=e.id
WHERE e.id='upgrade-final';
SQL
)"
[[ "$state" == "invoice.finalized:PENDING:1:true:1:1:1:FAILED:1:1" ]] || {
  echo "Upgrade did not preserve selected target and failed attempt" >&2; exit 1;
}
legacy="$(run_sql -At <<'SQL'
SELECT type || ':' || status || ':' || payload::text FROM "WebhookEvent" WHERE id='upgrade-legacy';
SQL
)"
[[ "$legacy" == 'invoice.created:PENDING:{"legacy": true}' ]] || {
  echo "Upgrade changed legacy event" >&2; exit 1;
}
indexes="$(run_sql -At <<'SQL'
SELECT count(*) FROM pg_indexes WHERE indexname IN
  ('BillingWebhookWork_due_idx','BillingWebhookWork_lease_idx','WebhookEvent_billing_selection_idx');
SQL
)"
[[ "$indexes" == 3 ]] || { echo "Recovery indexes are missing" >&2; exit 1; }
echo "PASS synthetic webhook migrations preserve versions, events, targets, attempts, and legacy evidence"

# Rehearse the documented application rollback: stop billing dispatch, retain
# additive schema and evidence, then start the pre-delivery application build
# against this migrated disposable database. Its owner actions must stay shut.
rollback_ref="${BILLING_WEBHOOK_ROLLBACK_REF:-c9fab7ed59b7880874fb3c404334925e673d7163}"
git cat-file -e "${rollback_ref}^{commit}"
git archive "$rollback_ref" | tar -x -C "$rollback_dir"
ln -s "$PWD/node_modules" "$rollback_dir/node_modules"
export DATABASE_URL="postgresql://postgres:synthetic-only@127.0.0.1:$(docker port "$container" 5432/tcp | sed 's/.*://')/postgres"
export NEXTAUTH_SECRET="synthetic-webhook-rollback-only"
export NEXTAUTH_URL="http://127.0.0.1:3104"
export CUSTOMER_TEST_BASE_URL="$NEXTAUTH_URL"
export CUSTOMER_LINKED_INGESTION_ENABLED=true
export CUSTOMER_BILLING_FINALIZATION_TEST_ENABLED=true
export REDIS_URL="redis://127.0.0.1:1"
(cd "$rollback_dir" && NODE_ENV=production ./node_modules/.bin/next build --webpack) >"$rollback_log" 2>&1 || {
  cat "$rollback_log" >&2
  echo "Pre-delivery application build failed" >&2
  exit 1
}
(cd "$rollback_dir" && NODE_ENV=production ./node_modules/.bin/next start -p 3104) >>"$rollback_log" 2>&1 &
rollback_pid=$!
for _ in $(seq 1 60); do
  if curl -fsS "$NEXTAUTH_URL/login" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$rollback_pid" 2>/dev/null; then cat "$rollback_log" >&2; exit 1; fi
  sleep 1
done
curl -fsS "$NEXTAUTH_URL/login" >/dev/null
npx playwright test tests/billing-webhook-rollback-gate.spec.ts --workers=1

paused="$(run_sql -At <<'SQL'
SELECT (SELECT count(*) FROM "BillingRecordVersion") || ':' ||
       (SELECT count(*) FROM "WebhookEvent") || ':' ||
       (SELECT count(*) FROM "WebhookDelivery") || ':' ||
       (SELECT count(*) FROM "WebhookEndpoint");
SQL
)"
[[ "$paused" == "$after" ]] || { echo "Evidence changed while dispatch was paused" >&2; exit 1; }
echo "PASS synthetic upgrade and pre-delivery app rollback: versions=1 events=2 attempts=1 endpoints=1 pending-work=1"
