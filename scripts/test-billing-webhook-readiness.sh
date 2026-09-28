#!/usr/bin/env bash
set -u -o pipefail
cd "$(dirname "$0")/.."

results=()
failures=0
run_check() {
  local label="$1"
  shift
  echo "RUN $label"
  local started=$SECONDS
  if "$@"; then
    results+=("PASS $label ($((SECONDS - started))s)")
  else
    results+=("FAIL $label ($((SECONDS - started))s)")
    failures=$((failures + 1))
  fi
}

run_check "synthetic upgrade and pre-delivery app rollback" bash scripts/test-billing-webhook-upgrade-rehearsal.sh
run_check "billing delivery and owner actions" bash scripts/test-billing-webhook-recovery.sh
run_check "endpoint secret rotation" bash scripts/test-webhook-secret-rotation.sh
run_check "deployed finalization gate" bash scripts/test-billing-webhook-deployed-gate.sh

echo "Billing webhook readiness results:"
printf '%s\n' "${results[@]}"
if (( failures > 0 )); then
  echo "$failures readiness check(s) failed; the deployed gate remains closed" >&2
  exit 1
fi
echo "All local checks passed; pilot enablement still requires a separate rollout decision"
