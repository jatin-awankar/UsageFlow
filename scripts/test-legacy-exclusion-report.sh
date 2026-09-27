#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
start_customer_test_database legacy-exclusion-report
trap cleanup_customer_test EXIT
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v password_hash="$password_hash" -v key_hash="$key_hash" <<'SQL' >/dev/null
INSERT INTO "User" (id,email,password,name) VALUES ('report-owner','owner@example.test',:'password_hash','Owner'),('report-viewer','viewer@example.test',:'password_hash','Viewer');
INSERT INTO "Organization" (id,name) VALUES ('report-a','A'),('report-b','B');
INSERT INTO "Membership" (id,role,"userId","orgId") VALUES ('report-owner-a','OWNER','report-owner','report-a'),('report-owner-b','OWNER','report-owner','report-b'),('report-viewer-a','VIEWER','report-viewer','report-a');
INSERT INTO "ApiKey" (id,name,"hashedKey","orgId") VALUES ('report-key-a','Key',:'key_hash','report-a'),('report-key-b','Key B','other-hash','report-b');
INSERT INTO "Plan" (id,name,"basePrice","billingPeriod","orgId") VALUES ('report-plan-a','Plan',0,'MONTHLY','report-a'),('report-plan-b','Plan',0,'MONTHLY','report-b');
INSERT INTO "Subscription" (id,status,"periodStart","orgId","planId") VALUES ('report-sub-a','ACTIVE','2024-02-01','report-a','report-plan-a'),('report-sub-b','ACTIVE','2024-02-01','report-b','report-plan-b');
INSERT INTO "Metric" (id,name,key,unit,"orgId") VALUES ('report-metric-a','Calls','CALLS','calls','report-a'),('report-metric-b','Calls','CALLS','calls','report-b');
INSERT INTO "Invoice" (id,amount,status,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('report-invoice',999,'PENDING','2024-02-01','2024-03-01','report-a','report-sub-a');
INSERT INTO "AggregatedUsage" (id,"metricKey",total,"periodStart","periodEnd","orgId","subscriptionId") VALUES ('report-aggregate','CALLS',42,'2024-02-01','2024-03-01','report-a','report-sub-a');
SQL
set_customer_test_environment
export TZ=UTC
start_customer_test_app
npx playwright test tests/legacy-exclusion-report.spec.ts --workers=1
