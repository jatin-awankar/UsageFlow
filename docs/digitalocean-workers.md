# DigitalOcean Worker Deployment

This project already has a durable worker entrypoint in `worker/index.ts`. The
recommended production setup is to run that worker as a long-lived process on
DigitalOcean and stop using the QStash `/api/jobs/process` route as the primary
execution path.

## Recommended Architecture

Use this split:

- Web app: keep on Vercel for now unless you have a separate reason to move it.
- Queue backend: keep your current Redis first, then migrate to DigitalOcean
  Managed Valkey when you want lower latency and fewer external dependencies.
- Worker runtime: deploy `worker/index.ts` as a DigitalOcean App Platform worker.
- Scheduled tasks: use App Platform scheduled jobs only for true cron tasks such
  as invoice sweeps or reconciliation jobs.

This gives you durable queue consumers, independent scaling, simpler failure
isolation, and no need to poll BullMQ from an HTTP route.

## Why This Is Better Than the Current QStash Drain Route

The current setup uses `app/api/jobs/process/route.ts` to create an in-process
BullMQ worker inside an HTTP request and drain a small batch of jobs. That is
useful as a serverless fallback, but it is not the right primary runtime for:

- steady queue throughput
- bursty webhook traffic
- predictable retry behavior
- operational visibility

A long-running worker is the correct execution model for BullMQ.

## Deployment Plan

### Phase 1

Deploy one App Platform worker using `.do/worker-app.template.yaml` and
`Dockerfile.worker`.

Required environment variables:

- `DATABASE_URL`
- `REDIS_URL`
- `QUEUE_NAME`
- `WORKER_CONCURRENCY`

### Phase 2

Keep the web app producing jobs exactly as it does today. The dedicated worker
will consume them continuously, so the QStash schedule becomes optional.

### Phase 3

For scheduled billing tasks, add an App Platform scheduled job that enqueues
BullMQ jobs. Do not use scheduled jobs to drain the queue itself.

App Platform scheduled jobs are a good fit for invoice sweeps, but they are not
a replacement for your current 5-minute QStash drain. Their minimum schedule is
every 15 minutes, which is fine for periodic reconciliation and the wrong model
for continuous queue consumption.

## Operational Notes

- Start with `instance_count: 1` and `WORKER_CONCURRENCY=5`.
- Scale vertically before scaling horizontally if Prisma connection pressure
  becomes an issue.
- If you migrate Redis to DigitalOcean, prefer Managed Valkey in the same region
  as the worker.
- The template defaults to the `blr` App Platform region. Change that if your
  database or Redis tier lives elsewhere.
- If you keep PostgreSQL outside DigitalOcean, expect some added latency but the
  architecture still works.

## Current Risks To Fix Next

These are worth addressing before you scale traffic:

- Webhook retries are not fully durable yet. `processWebhook` records failures,
  but it does not currently requeue a later attempt after a failed delivery.
- Queue configuration was duplicated before this change. It is now centralized
  in `lib/bullmq.ts`.
- Invoice generation is manual right now. A scheduled sweeper job is the next
  clean piece of work if you want fully automated billing periods.
