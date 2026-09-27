import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { spawn, spawnSync } from "node:child_process";

const base = process.env.CUSTOMER_TEST_BASE_URL!;
async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("owner drafts use verified Customer ledger events and immutable monthly snapshots", async ({ browser, request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const owner = await browser.newPage();
  const viewer = await browser.newPage();
  let worker: ReturnType<typeof spawn> | undefined;
  try {
    await signIn(owner, "owner@example.test");
    await signIn(viewer, "viewer@example.test");
    for (const org of ["draft-a", "draft-b"]) {
      await owner.goto(`${base}/app/${org}/customers`);
      await owner.getByLabel("External customer ID").fill("shared");
      await owner.getByRole("button", { name: "Create customer" }).click();
      await expect(owner.getByRole("status")).toHaveText("Customer created.");
    }
    const customers = (await db.query(`SELECT id, "orgId" FROM "Customer" WHERE "externalId" = 'shared'`)).rows;
    const customerA = customers.find((row) => row.orgId === "draft-a").id;
    const customerB = customers.find((row) => row.orgId === "draft-b").id;
    const url = `${base}/api/organizations/draft-a/billing-records`;
    const create = (month: string, billedCustomerId = customerA, now = "2024-03-04T00:00:00.000Z") => owner.request.post(url, { headers: { "x-billing-test-now": now }, data: { month, billedCustomerId } });
    expect((await request.post(url, { data: { month: "2024-02", billedCustomerId: customerA } })).status()).toBe(403);
    expect((await viewer.request.post(url, { data: { month: "2024-02", billedCustomerId: customerA } })).status()).toBe(403);
    expect((await create("2024-02", customerB)).status()).toBe(404);
    const accept = async (key: string, timestamp: string, apiKey = "secret-org-c") => {
      const result = await request.post(`${base}/api/track`, { headers: { "x-usageflow-api-key": apiKey, "idempotency-key": key }, data: { customerId: "shared", metric: "CALLS", amount: 3, timestamp } });
      expect(result.status()).toBe(200);
      return (await result.json()).eventId as string;
    };
    const feb = await accept("draft-feb", "2024-02-29T23:59:59.999Z");
    const mar = await accept("draft-mar", "2024-03-01T00:00:00.000Z");
    const other = await accept("draft-other", "2024-02-29T23:59:59.999Z", "secret-org-b");
    await db.query(`INSERT INTO "UsageEvent" (id, "metricKey", amount, "customerId", "billedCustomerId", "billingTreatment", timestamp, "orgId", "subscriptionId", "apiKeyId", "metricId") SELECT 'legacy-linked', "metricKey", amount, 'shared', "billedCustomerId", 'LEGACY', timestamp, "orgId", "subscriptionId", "apiKeyId", "metricId" FROM "UsageEvent" WHERE id = $1`, [feb]);
    worker = spawn("./node_modules/.bin/tsx", ["worker/index.ts"], { env: process.env, stdio: "ignore" });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const states = (await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id = ANY($1)`, [[feb, mar, other]])).rows;
      if (states.length === 3 && states.every((row) => row.processingState === "PROCESSED")) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect((await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id = $1`, [feb])).rows[0].processingState).toBe("PROCESSED");
    const open = await (await create("2024-02", customerA, "2024-03-04T00:00:00.000Z")).json();
    expect(open).toMatchObject({ kind: "CALCULATION", periodStart: "2024-02-01T00:00:00.000Z", periodEnd: "2024-03-01T00:00:00.000Z", closeAt: "2024-03-04T00:00:00.000Z", snapshot: { state: "OPEN" } });
    expect(open.snapshot.calculatedAt).toBe("2024-03-04T00:00:00.000Z");
    expect(open.snapshot.sourceEvents.map((event: { eventId: string }) => event.eventId)).toEqual([feb]);
    const otherDraft = await (await owner.request.post(`${base}/api/organizations/draft-b/billing-records`, { headers: { "x-billing-test-now": "2024-03-04T00:00:00.000Z" }, data: { month: "2024-02", billedCustomerId: customerB } })).json();
    expect(otherDraft.snapshot.sourceEvents.map((event: { eventId: string }) => event.eventId)).toEqual([other]);
    const repeat = await (await create("2024-02", customerA, "2024-03-04T00:00:00.000Z")).json();
    expect(repeat.currentSnapshotId).toBe(open.currentSnapshotId);
    const closeRead = await (await owner.request.get(`${url}?month=2024-02&billedCustomerId=${customerA}`, { headers: { "x-billing-test-now": "2024-03-04T00:00:00.001Z" } })).json();
    expect(closeRead.snapshot.state).toBe("BLOCKED");
    expect(closeRead.currentSnapshotId).not.toBe(open.currentSnapshotId);
    const [blockedResponse, concurrentResponse] = await Promise.all([create("2024-02", customerA, "2024-03-04T00:00:00.001Z"), create("2024-02", customerA, "2024-03-04T00:00:00.001Z")]);
    expect(blockedResponse.status()).toBe(200);
    expect(concurrentResponse.status()).toBe(200);
    const blocked = await blockedResponse.json();
    expect(blocked.id).toBe(open.id);
    expect(blocked.snapshot.state).toBe("BLOCKED");
    expect(blocked.currentSnapshotId).not.toBe(open.currentSnapshotId);
    expect(blocked.currentSnapshotId).toBe(closeRead.currentSnapshotId);
    expect((await concurrentResponse.json()).currentSnapshotId).toBe(blocked.currentSnapshotId);
    const read = await (await owner.request.get(`${url}?month=2024-02&billedCustomerId=${customerA}`)).json();
    expect(read.currentSnapshotId).toBe(blocked.currentSnapshotId);
    expect((await owner.request.get(`${base}/api/organizations/draft-b/billing-records?month=2024-02&billedCustomerId=${customerA}`)).status()).toBe(404);
    expect((await viewer.request.get(`${url}?month=2024-02&billedCustomerId=${customerA}`)).status()).toBe(403);
    const counts = (await db.query(`SELECT count(*)::int AS count FROM "BillingRecord" WHERE "orgId" = 'draft-a' AND "billedCustomerId" = $1`, [customerA])).rows[0];
    expect(counts.count).toBe(1);
    const snapshots = (await db.query(`SELECT id FROM "BillingRecordSnapshot" WHERE "billingRecordId" = $1`, [open.id])).rows;
    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((row) => row.id)).toEqual(expect.arrayContaining([open.currentSnapshotId, blocked.currentSnapshotId]));
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE id = 'legacy-invoice'`)).rows[0].amount).toBe(999);
    expect((await db.query(`SELECT "billingTreatment" FROM "UsageEvent" WHERE id = 'legacy-linked'`)).rows[0].billingTreatment).toBe("LEGACY");
    expect((await db.query(`SELECT "currentSnapshotId" FROM "BillingRecord" WHERE id = $1`, [open.id])).rows[0].currentSnapshotId).toBe(blocked.currentSnapshotId);
    expect((await create("2024-12")).status()).toBe(200);
    const december = await (await owner.request.get(`${url}?month=2024-12&billedCustomerId=${customerA}`)).json();
    expect(december.periodEnd).toBe("2025-01-01T00:00:00.000Z");

    worker.kill("SIGTERM");
    await new Promise<void>((resolve) => worker!.once("exit", () => resolve()));
    worker = undefined;
    await expect.poll(async () => (await db.query(`SELECT count(*)::int AS n FROM "UnratedEvent" WHERE "eventId"=$1`, [feb])).rows[0].n).toBe(1);
    await owner.goto(`${base}/app/draft-a/settings`);
    await owner.getByLabel("ISO 4217 currency").fill("USD");
    await owner.getByRole("button", { name: "Set currency" }).click();
    const priceInstant = new Date(Date.now() + 10 * 60_000);
    const eventInstant = new Date(priceInstant.getTime() + 60_000).toISOString();
    const reconciliationMonth = eventInstant.slice(0, 7);
    await owner.goto(`${base}/app/draft-a/metrics/draft-metric/pricing`);
    await owner.getByLabel("Unit price").fill("2");
    await owner.getByLabel("Currency").fill("USD");
    await owner.getByLabel("Effective from (UTC, ISO 8601)").fill(priceInstant.toISOString());
    await owner.getByRole("button", { name: /Publish (first|scheduled) price/ }).click();
    await expect(owner.getByRole("status")).toContainText("Price version published.");
    await owner.goto(`${base}/app/draft-a/metrics/draft-overflow/pricing`);
    await owner.getByLabel("Unit price").fill("999999.999999");
    await owner.getByLabel("Currency").fill("USD");
    await owner.getByLabel("Effective from (UTC, ISO 8601)").fill(priceInstant.toISOString());
    await owner.getByRole("button", { name: /Publish (first|scheduled) price/ }).click();
    await expect(owner.getByRole("status")).toContainText("Price version published.");
    const run = (eventId: string, flag?: string) => {
      const result = spawnSync("./node_modules/.bin/tsx", ["tests/fixtures/process-ledger-once.ts", eventId], {
        env: { ...process.env, ...(flag ? { [flag]: "true" } : {}) }, encoding: "utf8", timeout: 20_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(flag === "LEDGER_TEST_EXIT_AFTER_CLAIM" ? 91 : flag === "LEDGER_TEST_EXIT_BEFORE_RATING" ? 92 : 0);
    };
    const send = async (key: string, metric = "CALLS", amount = 3) => {
      const response = await request.post(`${base}/api/track`, { headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": key,
        "x-ledger-test-received-at": eventInstant }, data: { customerId: "shared", metric, amount, timestamp: eventInstant } });
      expect(response.status()).toBe(200);
      return (await response.json()).eventId as string;
    };
    const rated = await send("draft-rated"); run(rated);
    const pending = await send("draft-pending");
    const processing = await send("draft-processing"); run(processing, "LEDGER_TEST_EXIT_AFTER_CLAIM");
    const ledgerFailed = await send("draft-ledger-failed"); run(ledgerFailed, "LEDGER_TEST_FAIL_PROJECTION");
    const ratingPending = await send("draft-rating-pending"); run(ratingPending, "LEDGER_TEST_EXIT_BEFORE_RATING");
    const ratingRetry = await send("draft-rating-retry"); run(ratingRetry, "RATING_TEST_FAIL_ATTEMPT");
    const unrated = await send("draft-unrated", "UNPRICED"); run(unrated);
    const failureResponse = await request.post(`${base}/api/track`, { headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": "draft-rating-failed", "x-ledger-test-received-at": eventInstant },
      data: { customerId: "shared", metric: "LARGE", amount: 1_000_000_000, timestamp: eventInstant } });
    expect(failureResponse.status()).toBe(200);
    const ratingFailed = (await failureResponse.json()).eventId as string;
    run(ratingFailed);
    const stableExport = await owner.request.post(`${base}/api/ledger-exports`, { data: { orgId: "draft-a", period: reconciliationMonth } });
    expect(stableExport.status()).toBe(201);
    const exportId = (await stableExport.json()).id;
    const frozen = await (await owner.request.get(`${base}/api/ledger-exports/${exportId}?orgId=draft-a`)).json();
    const reconciled = await (await create(reconciliationMonth, customerA, eventInstant)).json();
    const outcomes = reconciled.snapshot.eventOutcomes;
    expect(outcomes.map((item: { eventId: string }) => item.eventId).sort()).toEqual([unrated, rated, pending, processing, ledgerFailed, ratingPending, ratingRetry, ratingFailed].sort());
    expect(outcomes.map((item: { state: string }) => item.state).sort()).toEqual([
      "UNRATED", "RATED", "LEDGER_PENDING", "LEDGER_PROCESSING", "LEDGER_FAILED", "RATING_PENDING", "RATING_RETRY", "RATING_FAILED",
    ].sort());
    expect(outcomes.find((item: { eventId: string }) => item.eventId === ledgerFailed)).toMatchObject({ reason: "LEDGER_PROJECTION_FAILED" });
    expect(outcomes.find((item: { eventId: string }) => item.eventId === ratingRetry)).toMatchObject({ reason: "RATING_WORKER_FAILED" });
    expect(outcomes.find((item: { eventId: string }) => item.eventId === ratingFailed)).toMatchObject({ reason: "AMOUNT_OVERFLOW" });
    expect(outcomes.find((item: { eventId: string }) => item.eventId === unrated)).toMatchObject({ reason: "NO_APPLICABLE_PRICE" });
    for (const outcome of outcomes.filter((item: { state: string }) => item.state !== "RATED")) expect(outcome).not.toHaveProperty("amount");
    expect(reconciled.snapshot.reconciliation).toMatchObject({ accepted: { count: 8, quantity: "1000000021" }, rated: { count: 1, quantity: "3", amount: "6.000", currency: "USD" }, balanced: true });
    expect(reconciled.snapshot.reconciliation.byMetricAndState).toEqual([
      { metric: "CALLS", state: "LEDGER_FAILED", count: 1, quantity: "3" },
      { metric: "CALLS", state: "LEDGER_PENDING", count: 1, quantity: "3" },
      { metric: "CALLS", state: "LEDGER_PROCESSING", count: 1, quantity: "3" },
      { metric: "CALLS", state: "RATED", count: 1, quantity: "3" },
      { metric: "CALLS", state: "RATING_PENDING", count: 1, quantity: "3" },
      { metric: "CALLS", state: "RATING_RETRY", count: 1, quantity: "3" },
      { metric: "LARGE", state: "RATING_FAILED", count: 1, quantity: "1000000000" },
      { metric: "UNPRICED", state: "UNRATED", count: 1, quantity: "3" },
    ]);
    expect(reconciled.snapshot.lines).toEqual([expect.objectContaining({ amount: "6.000", quantity: "3", sourceEventIds: [rated] })]);
    expect(frozen.rows.filter((row: { externalCustomerId: string }) => row.externalCustomerId === "shared").map((row: { eventId: string }) => row.eventId).sort()).toEqual(outcomes.map((item: { eventId: string }) => item.eventId).sort());
    expect(frozen.totals).toContainEqual(expect.objectContaining({ externalCustomerId: "shared", metric: "CALLS", count: 6, quantity: 18 }));
    expect(frozen.totals).toContainEqual(expect.objectContaining({ externalCustomerId: "shared", metric: "UNPRICED", count: 1, quantity: 3 }));
    expect(frozen.totals).toContainEqual(expect.objectContaining({ externalCustomerId: "shared", metric: "LARGE", count: 1, quantity: 1_000_000_000 }));
    for (const total of frozen.totals.filter((item: { externalCustomerId: string }) => item.externalCustomerId === "shared")) {
      const buckets = reconciled.snapshot.reconciliation.byMetricAndState.filter((item: { metric: string }) => item.metric === total.metric);
      expect(buckets.reduce((sum: number, item: { count: number }) => sum + item.count, 0)).toBe(total.count);
      expect(buckets.reduce((sum: bigint, item: { quantity: string }) => sum + BigInt(item.quantity), 0n)).toBe(BigInt(total.quantity));
    }
    expect(JSON.stringify(reconciled)).not.toContain("draft-rated");
    expect((await db.query(`SELECT "eventOutcomes", reconciliation FROM "BillingRecordSnapshot" WHERE id=$1`, [reconciled.currentSnapshotId])).rows[0]).toMatchObject({ eventOutcomes: outcomes, reconciliation: reconciled.snapshot.reconciliation });
    expect((await db.query(`SELECT "eventOutcomes" FROM "BillingRecordSnapshot" WHERE id=$1`, [blocked.currentSnapshotId])).rows[0].eventOutcomes).toEqual([expect.objectContaining({ eventId: feb, state: "UNRATED" })]);
  } finally {
    worker?.kill("SIGTERM");
    await owner.close(); await viewer.close(); await db.end();
  }
});
