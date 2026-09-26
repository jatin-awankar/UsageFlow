import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { Queue } from "bullmq";

const base = process.env.CUSTOMER_TEST_BASE_URL!;

async function signIn(page: Page) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill("owner-rating@example.test");
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

async function publish(page: Page, metricId: string, price: string, instant: string, orgId = "rating-a") {
  await page.goto(`${base}/app/${orgId}/metrics/${metricId}/pricing`);
  await page.getByLabel("Unit price").fill(price);
  await page.getByLabel("Currency").fill("USD");
  await page.getByLabel("Effective from (UTC, ISO 8601)").fill(instant);
  await page.getByRole("button", { name: /Publish (first|scheduled) price/ }).click();
  await expect(page.getByRole("status")).toContainText("Price version published.");
}

test("occurrence-time rating preserves exact immutable evidence and legacy billing", async ({ page, request }) => {
  test.setTimeout(60_000);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await signIn(page);
    await page.goto(`${base}/app/rating-a/settings`);
    await page.getByLabel("ISO 4217 currency").fill("USD");
    await page.getByRole("button", { name: "Set currency" }).click();
    await publish(page, "rating-metric-a", "0.000005", "2026-09-30T23:59:59.999Z");
    await publish(page, "rating-metric-a", "2.123456", "2026-10-01T00:00:00.000Z");
    await publish(page, "rating-metric-a", "3", "2026-10-01T00:00:00.001Z");
    await publish(page, "rating-zero", "0", "2026-09-30T23:59:59.999Z");
    await publish(page, "rating-overflow", "999999.999999", "2026-09-30T23:59:59.999Z");
    const send = async (key: string, metric: string, amount: number, timestamp: string, customerId = "same-customer", apiKey = "secret-org-c") => {
      const response = await request.post(`${base}/api/track`, {
        headers: { "x-usageflow-api-key": apiKey, "idempotency-key": key },
        data: { metric, amount, customerId, timestamp },
      });
      expect(response.status()).toBe(200);
      return (await response.json()).eventId as string;
    };
    // Receipt order differs from occurrence order. A missing version is not zero.
    const after = await send("rating-after", "calls", 2, "2026-10-01T00:00:00.001Z");
    const before = await send("rating-before", "calls", 1, "2026-09-30T23:59:59.998Z");
    const at = await send("rating-at", "calls", 3, "2026-10-01T00:00:00.000Z");
    const previous = await send("rating-previous", "calls", 1, "2026-09-30T23:59:59.999Z");
    const zero = await send("rating-zero", "free", 4, "2026-10-01T00:00:00.000Z");
    const future = await send("rating-future", "calls", 1, "2026-10-04T00:05:00.000Z");
    const overflow = await send("rating-overflow", "huge", 1_000_000_000, "2026-10-01T00:00:00.000Z");
    const large = await send("rating-large", "huge", 10_000_000, "2026-10-01T00:00:00.000Z");
    const otherCustomer = await send("rating-other-customer", "calls", 1, "2026-10-01T00:00:00.001Z", "other-customer");
    await page.goto(`${base}/app/rating-b/settings`);
    await page.getByLabel("ISO 4217 currency").fill("USD");
    await page.getByRole("button", { name: "Set currency" }).click();
    await publish(page, "rating-metric-b", "7", "2026-09-30T23:59:59.999Z", "rating-b");
    const otherOrg = await send("rating-other-org", "calls", 1, "2026-10-01T00:00:00.001Z", "same-customer", "secret-org-b");
    await expect.poll(async () => Number((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId" = ANY($1)`, [[after, at, previous, zero, future, large, otherCustomer, otherOrg]])).rows[0].n), { timeout: 30_000 }).toBe(8);
    const rows = (await db.query(`SELECT r.*, p."effectiveFrom" FROM "RatedEvent" r JOIN "PriceVersion" p ON p.id = r."priceVersionId" WHERE r."eventId" = ANY($1)`, [[after, at, previous, zero]])).rows;
    const byId = new Map(rows.map((row) => [row.eventId, row]));
    expect(byId.get(after)).toMatchObject({ orgId: "rating-a", billedCustomerId: "rating-customer-a", quantity: 2, unitPriceMicros: "3000000", amount: "6.000", currency: "USD" });
    expect(byId.get(at)).toMatchObject({ quantity: 3, unitPriceMicros: "2123456", amount: "6.370", currency: "USD" });
    expect(byId.get(previous)).toMatchObject({ quantity: 1, unitPriceMicros: "5", amount: "0.000", currency: "USD" });
    expect(byId.get(zero)).toMatchObject({ quantity: 4, unitPriceMicros: "0", amount: "0.000", currency: "USD" });
    expect((await db.query(`SELECT amount, "billedCustomerId" FROM "RatedEvent" WHERE "eventId"=$1`, [large])).rows[0]).toMatchObject({ amount: "9999999999990.000", billedCustomerId: "rating-customer-a" });
    expect((await db.query(`SELECT "orgId", "billedCustomerId", amount FROM "RatedEvent" WHERE "eventId"=$1`, [otherCustomer])).rows[0]).toMatchObject({ orgId: "rating-a", billedCustomerId: "rating-other-a", amount: "3.000" });
    expect((await db.query(`SELECT "orgId", "billedCustomerId", amount FROM "RatedEvent" WHERE "eventId"=$1`, [otherOrg])).rows[0]).toMatchObject({ orgId: "rating-b", billedCustomerId: "rating-customer-b", amount: "7.000" });
    for (const row of rows) expect(row.ratedAt).toBeInstanceOf(Date);
    await expect.poll(async () => (await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id=$1`, [overflow])).rows[0].processingState, { timeout: 30_000 }).toBe("PROCESSED");
    expect((await db.query(`SELECT count(*)::int AS n FROM "LedgerEventProjection" WHERE "eventId"=$1`, [overflow])).rows[0].n).toBe(1);
    expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=ANY($1)`, [[before, overflow]])).rows[0].n).toBe(0);
    expect((await db.query(`SELECT reason, "priceVersionId" FROM "RatingFailure" WHERE "eventId"=$1`, [overflow])).rows[0]).toMatchObject({ reason: "AMOUNT_OVERFLOW", priceVersionId: expect.any(String) });
    expect((await db.query(`SELECT "basePrice" FROM "Plan" WHERE id='rating-plan-a'`)).rows[0].basePrice).toBe(777);
    expect((await db.query(`SELECT total FROM "AggregatedUsage" WHERE id='rating-aggregate'`)).rows[0].total).toBe(11);
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE id='rating-invoice'`)).rows[0].amount).toBe(1234);
    expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "orgId"='rating-b'`)).rows[0].n).toBe(1);
    const otherPrice = (await db.query(`SELECT id FROM "PriceVersion" WHERE "metricId"='rating-metric-b'`)).rows[0].id;
    await expect(db.query(`INSERT INTO "RatedEvent" ("eventId","orgId","billedCustomerId","metricId","priceVersionId",quantity,"unitPriceMicros",amount,currency) VALUES ($1,'rating-b','rating-customer-b','rating-metric-b',$2,1,7000000,7,'USD')`, [before, otherPrice])).rejects.toThrow();
    await expect(db.query(`INSERT INTO "RatingFailure" ("eventId","orgId","metricId","priceVersionId",reason) VALUES ($1,'rating-a','rating-metric-a',$2,'AMOUNT_OVERFLOW')`, [after, byId.get(after).priceVersionId])).rejects.toThrow(/already has rated evidence/);
    await expect(db.query(`UPDATE "RatedEvent" SET amount=0 WHERE "eventId"=$1`, [after])).rejects.toThrow(/immutable/);
    await expect(db.query(`DELETE FROM "RatedEvent" WHERE "eventId"=$1`, [after])).rejects.toThrow(/immutable/);
    await expect(db.query(`UPDATE "UsageEvent" SET amount=4 WHERE id=$1`, [after])).rejects.toThrow();
    const same = await send("rating-after", "calls", 2, "2026-10-01T00:00:00.001Z");
    expect(same).toBe(after);
    expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=$1`, [after])).rows[0].n).toBe(1);
    await page.goto(`${base}/app/rating-a/metrics/rating-metric-a/pricing`);
    await page.getByLabel("Unit price").fill("4");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Effective from (UTC, ISO 8601)").fill("2026-10-04T00:04:59.999Z");
    await page.getByRole("button", { name: "Publish scheduled price" }).click();
    await expect(page.getByText("This schedule would change the price of an already rated event.")).toBeVisible();
    expect((await db.query(`SELECT count(*)::int AS n FROM "PriceVersion" WHERE "metricId"='rating-metric-a'`)).rows[0].n).toBe(3);

    // Hold the common publication/rating lock while both operations queue.
    const blocker = new Client({ connectionString: process.env.DATABASE_URL });
    await blocker.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query(`SELECT id FROM "Organization" WHERE id='rating-a' FOR NO KEY UPDATE`);
      const raced = await send("rating-race", "free", 1, "2026-10-04T00:05:00.000Z");
      const redis = new URL(process.env.REDIS_URL!);
      const queue = new Queue("usageflow", { connection: { host: redis.hostname, port: Number(redis.port) } });
      try {
        await Promise.all([1, 2].map((n) => queue.add("PROCESS_LEDGER_EVENT", { eventId: raced }, { jobId: `rating-concurrent-${n}` })));
      } finally {
        await queue.close();
      }
      await page.goto(`${base}/app/rating-a/metrics/rating-zero/pricing`);
      await page.getByLabel("Unit price").fill("1");
      await page.getByLabel("Currency").fill("USD");
      await page.getByLabel("Effective from (UTC, ISO 8601)").fill("2026-10-04T00:04:59.999Z");
      const scheduling = page.getByRole("button", { name: "Publish scheduled price" }).click();
      await expect.poll(async () => Number((await db.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%Organization%' AND query LIKE '%NO KEY UPDATE%'`)).rows[0].n), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
      await blocker.query("COMMIT");
      await scheduling;
      await expect.poll(async () => Number((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=$1`, [raced])).rows[0].n), { timeout: 30_000 }).toBe(1);
      const result = (await db.query(`SELECT r.amount, r."unitPriceMicros", p."effectiveFrom" FROM "RatedEvent" r JOIN "PriceVersion" p ON p.id=r."priceVersionId" WHERE r."eventId"=$1`, [raced])).rows[0];
      const scheduled = (await db.query(`SELECT count(*)::int AS n FROM "PriceVersion" WHERE "metricId"='rating-zero'`)).rows[0].n === 2;
      expect(result.amount).toBe(scheduled ? "1.000" : "0.000");
      expect(result.unitPriceMicros).toBe(scheduled ? "1000000" : "0");
      expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"=$1`, [raced])).rows[0].n).toBe(1);
      await db.query(`INSERT INTO "UsageEvent" (id,"metricKey",amount,"customerId","billedCustomerId","billingTreatment",timestamp,"orgId","subscriptionId","apiKeyId","metricId") VALUES ('rating-legacy-linked','CALLS',1,'same-customer','rating-customer-a','LEGACY','2026-10-01T00:00:00.001Z','rating-a','rating-sub-a','rating-key-a','rating-metric-a')`);
      const legacyQueue = new Queue("usageflow", { connection: { host: redis.hostname, port: Number(redis.port) } });
      try {
        await legacyQueue.add("PROCESS_LEDGER_EVENT", { eventId: "rating-legacy-linked" }, { jobId: "rating-legacy-attempt" });
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        await legacyQueue.close();
      }
      expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"='rating-legacy-linked'`)).rows[0].n).toBe(0);
    } finally {
      await blocker.query("ROLLBACK");
      await blocker.end();
    }
  } finally {
    await db.end();
  }
});
