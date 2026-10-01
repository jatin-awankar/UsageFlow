import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";

const base = process.env.CUSTOMER_TEST_BASE_URL!;
const first = process.env.LOCK_TEST_FIRST_EFFECTIVE!;
const scheduled = process.env.LOCK_TEST_SCHEDULED_EFFECTIVE!;

async function signIn(page: Page) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill("lock-owner@example.test");
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

async function seedProcessed(db: Client, metricId: string, metricKey: string, at: string) {
  const id = randomUUID();
  await db.query(`INSERT INTO "UsageEvent" (id,"metricKey",amount,"customerId","billedCustomerId","billingTreatment","receivedAt","processingState",timestamp,"orgId","subscriptionId","apiKeyId","metricId","idempotencyKey") VALUES ($1,$2,2,'customer-a','lock-customer','LEDGER_ONLY',now(),'PROCESSED',$3,'lock-org','lock-sub','lock-key',$4,$1)`, [id, metricKey, at, metricId]);
  await db.query(`INSERT INTO "LedgerEventProjection" ("eventId","orgId","billedCustomerId","metricKey",amount) VALUES ($1,'lock-org','lock-customer',$2,2)`, [id, metricKey]);
  return id;
}

async function enqueue(queue: Queue, id: string) {
  await queue.add("PROCESS_LEDGER_EVENT", { eventId: id }, { jobId: `lock-test-${id}`, removeOnComplete: true });
}

async function lockWaiters(db: Client) {
  return Number((await db.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND state='active' AND pid <> pg_backend_pid()`)).rows[0].n);
}

async function ratingCount(db: Client, id: string) {
  return Number((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=$1`, [id])).rows[0].n);
}

test("ordinary ratings for different events proceed concurrently", async () => {
  test.setTimeout(60_000);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  const redis = new URL(process.env.REDIS_URL!);
  const queue = new Queue("usageflow", { connection: { host: redis.hostname, port: Number(redis.port) } });
  await Promise.all([db.connect(), blocker.connect()]);
  let locked = false;
  try {
    const slow = await seedProcessed(db, "lock-parallel", "PARALLEL", first);
    const free = await seedProcessed(db, "lock-parallel", "PARALLEL", first);
    await blocker.query("BEGIN");
    locked = true;
    await blocker.query(`SELECT id FROM "UsageEvent" WHERE id=$1 FOR UPDATE`, [slow]);
    await enqueue(queue, slow);
    await expect.poll(() => lockWaiters(db), { timeout: 10_000 }).toBeGreaterThan(0);
    await enqueue(queue, free);
    await expect.poll(() => ratingCount(db, free), { timeout: 5_000 }).toBe(1);
    expect(await ratingCount(db, slow)).toBe(0);
    await blocker.query("COMMIT");
    locked = false;
    await expect.poll(() => ratingCount(db, slow), { timeout: 10_000 }).toBe(1);
    const ratings = (await db.query(`SELECT "eventId", amount::text,"priceVersionId" FROM "RatedEvent" WHERE "eventId"=ANY($1) ORDER BY "eventId"`, [[slow, free]])).rows;
    expect(ratings).toEqual([slow, free].sort().map((eventId) => ({ eventId, amount: "2.000", priceVersionId: "lock-parallel-price" })));
  } finally {
    if (locked) await blocker.query("ROLLBACK");
    await Promise.all([queue.close(), blocker.end(), db.end()]);
  }
});

test("duplicate workers for one event leave one rating and no retry", async () => {
  test.setTimeout(60_000);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  const redis = new URL(process.env.REDIS_URL!);
  const queue = new Queue("usageflow", { connection: { host: redis.hostname, port: Number(redis.port) } });
  await Promise.all([db.connect(), blocker.connect()]);
  let locked = false;
  try {
    const id = await seedProcessed(db, "lock-parallel", "PARALLEL", first);
    await blocker.query("BEGIN");
    locked = true;
    await blocker.query(`SELECT id FROM "UsageEvent" WHERE id=$1 FOR UPDATE`, [id]);
    const jobs = await Promise.all([1, 2].map((n) => queue.add("PROCESS_LEDGER_EVENT", { eventId: id }, { jobId: `lock-duplicate-${n}-${id}` })));
    await expect.poll(() => lockWaiters(db), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await blocker.query("COMMIT");
    locked = false;
    await expect.poll(async () => Promise.all(jobs.map((job) => queue.getJobState(job.id!))), { timeout: 10_000 }).toEqual(["completed", "completed"]);
    expect(await ratingCount(db, id)).toBe(1);
    expect(Number((await db.query(`SELECT count(*)::int AS n FROM "RatingRetry" WHERE "eventId"=$1`, [id])).rows[0].n)).toBe(0);
  } finally {
    if (locked) await blocker.query("ROLLBACK");
    await Promise.all([queue.close(), blocker.end(), db.end()]);
  }
});

test("scheduled publication waits for an in-flight rating and rejects a changed price", async ({ page }) => {
  test.setTimeout(90_000);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  const redis = new URL(process.env.REDIS_URL!);
  const queue = new Queue("usageflow", { connection: { host: redis.hostname, port: Number(redis.port) } });
  await Promise.all([db.connect(), blocker.connect()]);
  let locked = false;
  try {
    await signIn(page);
    const id = await seedProcessed(db, "lock-schedule", "SCHEDULE", scheduled);
    await blocker.query("BEGIN");
    locked = true;
    await blocker.query(`SELECT id FROM "UsageEvent" WHERE id=$1 FOR UPDATE`, [id]);
    await enqueue(queue, id);
    await expect.poll(() => lockWaiters(db), { timeout: 10_000 }).toBeGreaterThan(0);
    await page.goto(`${base}/app/lock-org/metrics/lock-schedule/pricing`);
    await page.getByLabel("Unit price").fill("3");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Effective from (UTC, ISO 8601)").fill(scheduled);
    const publishing = page.getByRole("button", { name: "Publish scheduled price" }).click();
    await expect.poll(() => lockWaiters(db), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await blocker.query("COMMIT");
    locked = false;
    await publishing;
    await expect(page.getByText("This schedule would change the price of an already rated event.")).toBeVisible();
    await expect.poll(() => ratingCount(db, id), { timeout: 10_000 }).toBe(1);
    expect((await db.query(`SELECT amount::text,"priceVersionId" FROM "RatedEvent" WHERE "eventId"=$1`, [id])).rows[0]).toEqual({ amount: "2.000", priceVersionId: "lock-schedule-price" });
    expect(Number((await db.query(`SELECT count(*)::int AS n FROM "PriceVersion" WHERE "metricId"='lock-schedule'`)).rows[0].n)).toBe(1);
  } finally {
    if (locked) await blocker.query("ROLLBACK");
    await Promise.all([queue.close(), blocker.end(), db.end()]);
  }
});

test("reviewed correction rejects a newly unrated event that completed first", async ({ page }) => {
  test.setTimeout(90_000);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  const redis = new URL(process.env.REDIS_URL!);
  const queue = new Queue("usageflow", { connection: { host: redis.hostname, port: Number(redis.port) } });
  await Promise.all([db.connect(), blocker.connect()]);
  let locked = false;
  try {
    await signIn(page);
    const start = new Date(Date.parse(first) - 2 * 86_400_000).toISOString();
    const at = new Date(Date.parse(start) + 3_600_000).toISOString();
    const reviewed = await seedProcessed(db, "lock-gap", "GAP", at);
    await enqueue(queue, reviewed);
    await expect.poll(async () => Number((await db.query(`SELECT count(*)::int AS n FROM "UnratedEvent" WHERE "eventId"=$1`, [reviewed])).rows[0].n), { timeout: 10_000 }).toBe(1);
    const params = new URLSearchParams({ metricId: "lock-gap", customerId: "lock-customer", start, end: first });
    const response = await page.request.get(`${base}/api/organizations/lock-org/pricing-gap-preview?${params}`);
    expect(response.status()).toBe(200);
    const preview = await response.json();
    expect(preview.eligibleEventIds).toEqual([reviewed]);

    const incoming = await seedProcessed(db, "lock-gap", "GAP", at);
    await blocker.query("BEGIN");
    locked = true;
    await blocker.query(`SELECT id FROM "UsageEvent" WHERE id=$1 FOR UPDATE`, [incoming]);
    await enqueue(queue, incoming);
    await expect.poll(() => lockWaiters(db), { timeout: 10_000 }).toBeGreaterThan(0);
    const approving = page.request.post(`${base}/api/organizations/lock-org/pricing-gap-corrections`, { data: {
      metricId: "lock-gap", customerId: "lock-customer", start, end: first,
      reviewedAt: preview.reviewedAt, reviewToken: preview.reviewToken, eligibleEventIds: [reviewed],
      unitPrice: "2", currency: "USD", reason: "Reviewed gap", evidence: "lock-protocol-race",
    } });
    await expect.poll(() => lockWaiters(db), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await blocker.query("COMMIT");
    locked = false;
    const approval = await approving;
    expect(approval.status()).toBe(409);
    await expect.poll(async () => Number((await db.query(`SELECT count(*)::int AS n FROM "UnratedEvent" WHERE "eventId"=ANY($1)`, [[reviewed, incoming]])).rows[0].n), { timeout: 10_000 }).toBe(2);
    expect(Number((await db.query(`SELECT count(*)::int AS n FROM "PricingGapCorrection" WHERE "orgId"='lock-org'`)).rows[0].n)).toBe(0);
    expect(Number((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=ANY($1)`, [[reviewed, incoming]])).rows[0].n)).toBe(0);
  } finally {
    if (locked) await blocker.query("ROLLBACK");
    await Promise.all([queue.close(), blocker.end(), db.end()]);
  }
});
