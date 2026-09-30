#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/customer-test-harness.sh
trap cleanup_customer_test EXIT
start_customer_test_database recovery-candidates
export REDIS_URL=redis://127.0.0.1:1
npx tsx scripts/recovery-candidate-query.integration.ts
