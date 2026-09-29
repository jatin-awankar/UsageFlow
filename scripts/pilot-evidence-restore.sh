run_pilot_restore() {
  local restore_pg="usageflow-pilot-restore-pg-$run_id"
  local restore_redis="usageflow-pilot-restore-redis-$run_id"
  local backup="$artifact_dir/postgres.dump"
  export PILOT_RESTORE_BACKUP="$backup"
  export PILOT_RESTORE_ORIGINAL_API="$NEXTAUTH_URL"
  export PILOT_RESTORE_API_KEY="$api_key"
  export PILOT_RESTORE_DIR="$artifact_dir"
  export PILOT_RESTORE_RUN_ID="$run_id"
  node scripts/pilot-evidence-restore.mjs ingest & local sender_pid=$!
  node scripts/pilot-evidence-processes.mjs register "$artifact_dir" "$run_id" sender "$sender_pid"
  for _ in $(seq 1 120); do [[ -e "$artifact_dir/ingestion-started" ]] && break; kill -0 "$sender_pid" 2>/dev/null || { wait "$sender_pid"; return 1; }; sleep 0.1; done
  [[ -e "$artifact_dir/ingestion-started" ]] || { echo 'Ingestion did not start' >&2; return 1; }
  node scripts/pilot-evidence-restore.mjs mark backupStart
  docker exec "$pg_container" pg_dump -Fc -U postgres -d postgres > "$backup"
  node scripts/pilot-evidence-restore.mjs mark backupFinish
  wait "$sender_pid"
  node scripts/pilot-evidence-restore.mjs post
  node scripts/pilot-evidence-restore.mjs mark faultInjected
  node scripts/pilot-evidence-processes.mjs cleanup "$artifact_dir" "$run_id"
  wait "$api_pid" 2>/dev/null || true
  wait "$worker_pid" 2>/dev/null || true
  node scripts/pilot-evidence-restore.mjs mark originalUnavailable
  docker run --rm -d --name "$restore_pg" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD="$db_password" postgres:17.6-alpine >/dev/null
  docker run -d --name "$restore_redis" -p 127.0.0.1::6379 redis:7-alpine >/dev/null
  for _ in $(seq 1 60); do docker exec "$restore_pg" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 0.5; done
  docker exec "$restore_pg" pg_isready -U postgres >/dev/null
  docker exec -i "$restore_pg" pg_restore -U postgres -d postgres --no-owner --no-privileges < "$backup"
  export DATABASE_URL="postgresql://postgres:${db_password}@127.0.0.1:$(docker port "$restore_pg" 5432/tcp | sed 's/.*://')/postgres"
  export REDIS_URL="redis://127.0.0.1:$(docker port "$restore_redis" 6379/tcp | sed 's/.*://')"
  export QUEUE_NAME="usageflow-pilot-restore-$run_id"
  export NEXTAUTH_URL="http://127.0.0.1:$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
  node scripts/pilot-evidence-restore.mjs classify
  CUSTOMER_LINKED_INGESTION_ENABLED=true ./node_modules/.bin/next dev -p "${NEXTAUTH_URL##*:}" >"$artifact_dir/restore-api.log" 2>&1 & api_pid=$!
  node scripts/pilot-evidence-processes.mjs register "$artifact_dir" "$run_id" api "$api_pid"
  CUSTOMER_LINKED_INGESTION_ENABLED=true ./node_modules/.bin/tsx worker/index.ts >"$artifact_dir/restore-worker.log" 2>&1 & worker_pid=$!
  node scripts/pilot-evidence-processes.mjs register "$artifact_dir" "$run_id" worker "$worker_pid"
  for _ in $(seq 1 90); do curl -fsS "$NEXTAUTH_URL/login" >/dev/null 2>&1 && break; kill -0 "$api_pid" 2>/dev/null || { cat "$artifact_dir/restore-api.log"; return 1; }; sleep 1; done
  curl -fsS "$NEXTAUTH_URL/login" >/dev/null
  node scripts/pilot-evidence-restore.mjs probe
  node scripts/pilot-evidence-restore.mjs replay
  node scripts/pilot-evidence-restore.mjs reconcile
}
