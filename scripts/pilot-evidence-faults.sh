start_pilot_worker() {
  local label="$1" crash="${2:-false}"
  CUSTOMER_LINKED_INGESTION_ENABLED=true LEDGER_TEST_EXIT_AFTER_CLAIM="$crash" ./node_modules/.bin/tsx worker/index.ts >"$artifact_dir/worker-$label.log" 2>&1 & worker_pid=$!
  node scripts/pilot-evidence-processes.mjs register "$artifact_dir" "$run_id" worker "$worker_pid"
}

stop_pilot_worker() {
  if [[ -n "$worker_pid" ]] && kill -0 "$worker_pid" 2>/dev/null; then
    kill -TERM "$worker_pid"
    wait "$worker_pid" 2>/dev/null || true
  fi
  worker_pid=''
}

fault_step() {
  node scripts/pilot-evidence-faults.mjs "$1" "$2" "$run_id" "$artifact_dir" "$NEXTAUTH_URL" "$api_key" "${3:-}"
}

run_pilot_faults() {
  export PILOT_FAULT_COUNT="${PILOT_FAULT_COUNT:-20}"
  for scenario in baseline worker-stop worker-crash redis-job-loss redis-outage; do
    local fault_at
    fault_at="$(node -e 'console.log(new Date().toISOString())')"
    if [[ "$scenario" == worker-stop || "$scenario" == redis-job-loss || "$scenario" == redis-outage ]]; then stop_pilot_worker; fi
    if [[ "$scenario" == worker-crash ]]; then
      stop_pilot_worker
      start_pilot_worker crash true
    fi
    if [[ "$scenario" == redis-outage ]]; then docker stop "$redis_container" >/dev/null; fi
    if [[ "$scenario" != worker-crash && "$scenario" != redis-job-loss ]]; then fault_step fault "$scenario" "$fault_at"; fault_step injected "$scenario"; fi
    fault_step send "$scenario"
    if [[ "$scenario" == worker-crash ]]; then
      for _ in $(seq 1 60); do
        if ! kill -0 "$worker_pid" 2>/dev/null; then break; fi
        sleep 0.5
      done
      ! kill -0 "$worker_pid" 2>/dev/null || { echo 'Crash seam did not exit' >&2; return 1; }
      worker_pid=''
      fault_step fault "$scenario" "$(node -e 'console.log(new Date().toISOString())')"
      fault_step injected "$scenario"
    fi
    fault_step checkpoint "$scenario:interrupted"
    if [[ "$scenario" == redis-job-loss ]]; then
      fault_at="$(node -e 'console.log(new Date().toISOString())')"
      docker exec "$redis_container" redis-cli FLUSHDB >/dev/null
      fault_step fault "$scenario" "$fault_at"
      fault_step injected "$scenario"
      fault_step checkpoint "$scenario:queue-lost"
    fi
    if [[ "$scenario" == redis-outage ]]; then docker start "$redis_container" >/dev/null; fault_step checkpoint "$scenario:redis-restarted"; fi
    if [[ "$scenario" != baseline ]]; then start_pilot_worker "$scenario"; fi
    fault_step recover "$scenario"
    fault_step replay "$scenario"
    fault_step checkpoint "$scenario:final"
  done
  fault_step finish all
}
