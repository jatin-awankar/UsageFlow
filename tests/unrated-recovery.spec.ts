import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { Queue, QueueEvents } from "bullmq";
import { spawn, type ChildProcess } from "node:child_process";

const base = process.env.CUSTOMER_TEST_BASE_URL!;

test("owner sees independent rating outcomes and worker recovery preserves evidence", async ({ page, request }) => {
  test.setTimeout(120_000);
  const now = new Date();
  const firstEffective = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2));
  const scheduledEffective = new Date(firstEffective.getTime() + 86_400_000);
  const missingAt = new Date(firstEffective.getTime() - 1);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  let worker: ChildProcess | undefined;
  const startWorker = (failure = false) => {
    worker = spawn("node", ["--import", "tsx", "worker/index.ts"], {
      cwd: process.cwd(), env: { ...process.env, RATING_TEST_FAIL_ATTEMPT: failure ? "true" : "false" }, stdio: "ignore",
    });
  };
  const rows = async () => {
    const response = await page.request.get(`${base}/api/organizations/unrated-org/usage-events`);
    expect(response.status()).toBe(200);
    return (await response.json()).rows as Array<Record<string, unknown>>;
  };
  const outcome = async (eventId: string) => (await rows()).find((row) => row.eventId === eventId);
  const send = async (key: string, metric: string, timestamp: string) => {
    const response = await request.post(`${base}/api/track`, {
      headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": key },
      data: { customerId: "customer-a", metric, amount: 2, timestamp },
    });
    expect(response.status()).toBe(200);
    return (await response.json()).eventId as string;
  };
  try {
    await page.goto(`${base}/login`);
    await page.getByPlaceholder("you@example.com").fill("owner-unrated@example.test");
    await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app/);
    const missing = await send("unrated-missing", "calls", missingAt.toISOString());
    await expect.poll(() => outcome(missing)).toMatchObject({ processingState: "PROCESSED", ratingState: "UNRATED", ratingReason: "NO_APPLICABLE_PRICE", amount: null, priceVersionId: null });
    expect((await db.query(`SELECT count(*)::int AS n FROM "LedgerEventProjection" WHERE "eventId"=$1`, [missing])).rows[0].n).toBe(1);
    expect((await db.query(`SELECT count(*)::int AS n FROM "UnratedEvent" WHERE "eventId"=$1`, [missing])).rows[0].n).toBe(1);

    await page.goto(`${base}/app/unrated-org/metrics/priced-metric/pricing`);
    await page.getByLabel("Unit price").fill("3");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Effective from (UTC, ISO 8601)").fill(firstEffective.toISOString());
    await page.getByRole("button", { name: "Publish first price" }).click();
    await expect(page.getByRole("status")).toContainText("Price version published.");
    const priced = await send("unrated-priced", "priced", firstEffective.toISOString());
    await expect.poll(() => outcome(priced)).toMatchObject({ processingState: "PROCESSED", ratingState: "RATED", ratingReason: null, amount: "6.000", unitPriceMicros: "3000000", priceVersionId: expect.any(String) });
    const first = await outcome(priced);
    const redis = new URL(process.env.REDIS_URL!);
    const connection = { host: redis.hostname, port: Number(redis.port) };
    const queue = new Queue("usageflow", { connection });
    const queueEvents = new QueueEvents("usageflow", { connection });
    try {
      await queueEvents.waitUntilReady();
      const sequential = await queue.add("PROCESS_LEDGER_EVENT", { eventId: priced }, { jobId: "unrated-sequential-1" });
      await sequential.waitUntilFinished(queueEvents);
      await expect.poll(async () => (await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=$1`, [priced])).rows[0].n).toBe(1);
      const concurrent = await Promise.all([1, 2, 3].map((n) => queue.add("PROCESS_LEDGER_EVENT", { eventId: priced }, { jobId: `unrated-concurrent-${n}` })));
      await Promise.all(concurrent.map((job) => job.waitUntilFinished(queueEvents)));
    } finally { await queueEvents.close(); await queue.close(); }
    expect(await outcome(priced)).toMatchObject({ amount: first?.amount, unitPriceMicros: first?.unitPriceMicros, priceVersionId: first?.priceVersionId });
    expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=$1`, [priced])).rows[0].n).toBe(1);

    // An ordinary later version cannot change the existing result.
    await page.goto(`${base}/app/unrated-org/metrics/priced-metric/pricing`);
    await page.getByLabel("Unit price").fill("4");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Effective from (UTC, ISO 8601)").fill(scheduledEffective.toISOString());
    await page.getByRole("button", { name: "Publish scheduled price" }).click();
    await expect(page.getByRole("status")).toContainText("Price version published.");
    expect(await outcome(priced)).toMatchObject({ amount: first?.amount, priceVersionId: first?.priceVersionId });
    await page.goto(`${base}/app/unrated-org/metrics/unrated-metric/pricing`);
    await page.getByLabel("Unit price").fill("8");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Effective from (UTC, ISO 8601)").fill(firstEffective.toISOString());
    await page.getByRole("button", { name: "Publish first price" }).click();
    await expect(page.getByRole("status")).toContainText("Price version published.");
    expect(await outcome(missing)).toMatchObject({ ratingState: "UNRATED", amount: null, priceVersionId: null });

    // Failure is visible as retryable, then recovery clears it after restart.
    process.kill(Number(process.env.UNRATED_TEST_WORKER_PID), "SIGKILL");
    startWorker(true);
    const failed = await send("unrated-retry", "priced", firstEffective.toISOString());
    await expect.poll(() => outcome(failed), { timeout: 30_000 }).toMatchObject({ processingState: "PROCESSED", ratingState: "RETRYABLE_FAILURE", ratingReason: "RATING_WORKER_FAILED", amount: null });
    worker?.kill("SIGKILL");
    startWorker();
    await expect.poll(() => outcome(failed), { timeout: 30_000 }).toMatchObject({ ratingState: "RATED", amount: "6.000" });

    // Interrupt after projection commits and before a rating can be inserted.
    const blocker = new Client({ connectionString: process.env.DATABASE_URL });
    await blocker.connect();
    let interrupted: string;
    try {
      await blocker.query("BEGIN");
      await blocker.query(`LOCK TABLE "RatedEvent" IN ACCESS EXCLUSIVE MODE`);
      await expect.poll(async () => Number((await db.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%SELECT e.id FROM "UsageEvent" e%' AND query LIKE '%"RatedEvent"%'`)).rows[0].n), { timeout: 30_000 }).toBeGreaterThan(0);
      interrupted = await send("unrated-interrupted", "priced", firstEffective.toISOString());
      await expect.poll(async () => (await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id=$1`, [interrupted])).rows[0]?.processingState, { timeout: 30_000 }).toBe("PROCESSED");
      await expect.poll(async () => Number((await db.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%RatedEvent%'`)).rows[0].n), { timeout: 30_000 }).toBeGreaterThan(0);
      worker?.kill("SIGKILL");
    } finally {
      await blocker.query("ROLLBACK");
      await blocker.end();
    }
    startWorker();
    await expect.poll(() => outcome(interrupted), { timeout: 30_000 }).toMatchObject({ ratingState: "RATED", amount: "6.000" });
    expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=$1`, [interrupted])).rows[0].n).toBe(1);
    expect(await outcome(missing)).toMatchObject({ ratingState: "UNRATED", ratingReason: "NO_APPLICABLE_PRICE", amount: null, priceVersionId: null });
    expect((await db.query(`SELECT total FROM "AggregatedUsage" WHERE id='unrated-aggregate'`)).rows[0].total).toBe(11);
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE id='unrated-invoice'`)).rows[0].amount).toBe(42);
    const forbidden = await page.request.get(`${base}/api/organizations/other-org/usage-events`);
    expect(forbidden.status()).toBe(403);
  } finally {
    worker?.kill("SIGKILL");
    await db.end();
  }
});
