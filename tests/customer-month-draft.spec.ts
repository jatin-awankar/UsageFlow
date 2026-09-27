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
    const readiness = async (month: string, billedCustomerId: string, now: string) => {
      const response = await owner.request.post(url, { headers: { "x-billing-test-now": now }, data: { action: "readiness", month, billedCustomerId } });
      expect(response.status()).toBe(200);
      return response.json();
    };
    expect((await request.post(url, { data: { month: "2024-02", billedCustomerId: customerA } })).status()).toBe(403);
    expect((await viewer.request.post(url, { data: { month: "2024-02", billedCustomerId: customerA } })).status()).toBe(403);
    expect((await create("2024-02", customerB)).status()).toBe(404);
    expect((await viewer.request.post(url, { data: { action: "readiness", month: "2024-02", billedCustomerId: customerA } })).status()).toBe(403);
    expect((await owner.request.post(url, { data: { action: "readiness", month: "2024-02", billedCustomerId: customerB } })).status()).toBe(404);
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
    const [decemberFirst, decemberSecond] = await Promise.all([create("2024-12"), create("2024-12")]);
    expect(decemberFirst.status()).toBe(200);
    expect(decemberSecond.status()).toBe(200);
    expect((await decemberFirst.json()).currentSnapshotId).toBe((await decemberSecond.json()).currentSnapshotId);
    const december = await (await owner.request.get(`${url}?month=2024-12&billedCustomerId=${customerA}`)).json();
    expect(december.periodEnd).toBe("2025-01-01T00:00:00.000Z");
    expect(december.snapshot.state).toBe("READY_FOR_REVIEW");

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
    await owner.goto(`${base}/app/draft-a/customers`);
    await owner.getByLabel("External customer ID").fill("recovery");
    await owner.getByRole("button", { name: "Create customer" }).click();
    await expect(owner.getByRole("status")).toHaveText("Customer created.");
    const recoveryCustomer = (await db.query(`SELECT id FROM "Customer" WHERE "orgId"='draft-a' AND "externalId"='recovery'`)).rows[0].id as string;
    const recoveryResponse = await request.post(`${base}/api/track`, { headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": "draft-recovery",
      "x-ledger-test-received-at": eventInstant }, data: { customerId: "recovery", metric: "CALLS", amount: 2, timestamp: eventInstant } });
    expect(recoveryResponse.status()).toBe(200);
    const recoveryEvent = (await recoveryResponse.json()).eventId as string;
    const recoveryAfterClose = new Date(Date.UTC(Number(reconciliationMonth.slice(0, 4)), Number(reconciliationMonth.slice(5)), 4, 0, 0, 0, 1)).toISOString();
    const recoveryDraft = await (await create(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).json();
    expect(recoveryDraft.snapshot.state).toBe("BLOCKED");
    expect(recoveryDraft.snapshot.eventOutcomes).toEqual([expect.objectContaining({ eventId: recoveryEvent, state: "LEDGER_PENDING" })]);
    run(recoveryEvent);
    const [recoveredFirst, recoveredSecond] = await Promise.all([
      create(reconciliationMonth, recoveryCustomer, recoveryAfterClose),
      create(reconciliationMonth, recoveryCustomer, recoveryAfterClose),
    ]);
    expect(recoveredFirst.status()).toBe(200);
    expect(recoveredSecond.status()).toBe(200);
    const readyRecovery = await recoveredFirst.json();
    expect((await recoveredSecond.json()).currentSnapshotId).toBe(readyRecovery.currentSnapshotId);
    expect(readyRecovery.snapshot.state).toBe("READY_FOR_REVIEW");
    const closeAt = new Date(Date.UTC(Number(reconciliationMonth.slice(0, 4)), Number(reconciliationMonth.slice(5)), 4)).toISOString();
    expect(await readiness(reconciliationMonth, recoveryCustomer, closeAt)).toMatchObject({ ready: false, informational: true,
      blockingReasons: [{ code: "CLOSE_NOT_PASSED" }] });
    const readyView = await readiness(reconciliationMonth, recoveryCustomer, recoveryAfterClose);
    expect(readyView).toMatchObject({ ready: true, informational: true, billingRecordId: readyRecovery.id, blockingReasons: [],
      reconciliation: { balanced: true, accepted: { count: 1 }, rated: { count: 1, amount: "4.000" } } });
    expect(readyRecovery.currentSnapshotId).not.toBe(recoveryDraft.currentSnapshotId);
    expect(readyRecovery.snapshot.reconciliation).toMatchObject({ accepted: { count: 1, quantity: "2" }, rated: { count: 1, quantity: "2", amount: "4.000" }, balanced: true });
    expect(readyRecovery.snapshot.lines.flatMap((line: { sourceEventIds: string[] }) => line.sourceEventIds)).toEqual([recoveryEvent]);
    expect((await db.query(`SELECT count(*)::int AS count FROM "BillingRecordSnapshot" WHERE "billingRecordId"=$1`, [readyRecovery.id])).rows[0].count).toBe(4);
    expect((await create(reconciliationMonth, recoveryCustomer, recoveryAfterClose).then((response) => response.json())).currentSnapshotId).toBe(readyView.snapshotId);
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
    const blockedReadiness = await readiness(reconciliationMonth, customerA, recoveryAfterClose);
    expect(blockedReadiness.ready).toBe(false);
    expect(blockedReadiness.blockingReasons.map((reason: { code: string }) => reason.code).sort()).toEqual([
      "UNRATED", "LEDGER_PENDING", "LEDGER_PROCESSING", "LEDGER_FAILED", "RATING_PENDING", "RATING_RETRY", "RATING_FAILED",
    ].sort());
    expect(blockedReadiness.blockingReasons).toContainEqual(expect.objectContaining({ code: "LEDGER_FAILED", reason: "LEDGER_PROJECTION_FAILED" }));
    expect(blockedReadiness.blockingReasons).toContainEqual(expect.objectContaining({ code: "RATING_FAILED", reason: "AMOUNT_OVERFLOW" }));
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
    // A late receipt belongs to its occurrence month, including the exact close instant.
    const lateMonth = eventInstant.slice(0, 7);
    const [lateYear, lateNumber] = lateMonth.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(lateYear, lateNumber, 1));
    const closeInstant = new Date(monthEnd.getTime() + 72 * 60 * 60 * 1000);
    const beforeEnd = new Date(monthEnd.getTime() - 1).toISOString();
    const afterEnd = monthEnd.toISOString();
    const afterEndByMillisecond = new Date(monthEnd.getTime() + 1).toISOString();
    const atClose = closeInstant.toISOString();
    const afterClose = new Date(closeInstant.getTime() + 1).toISOString();
    const lateSend = async (key: string, occurrence: string, receipt: string, metric = "CALLS", quantity = 2) =>
      request.post(`${base}/api/track`, { headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": key,
        "x-ledger-test-received-at": receipt }, data: { customerId: "shared", metric, amount: quantity, timestamp: occurrence } });
    const onTimeResponse = await lateSend("late-ontime", beforeEnd, beforeEnd);
    expect(onTimeResponse.status()).toBe(200);
    const onTime = (await onTimeResponse.json()).eventId as string;
    run(onTime);
    const pendingOnTimeResponse = await lateSend("late-pending-ontime", beforeEnd, beforeEnd);
    expect(pendingOnTimeResponse.status()).toBe(200);
    const pendingOnTime = (await pendingOnTimeResponse.json()).eventId as string;
    const beforeLate = await (await create(lateMonth, customerA, afterEnd)).json();
    const firstResponse = await lateSend("late-first", beforeEnd, afterEndByMillisecond);
    expect(firstResponse.status()).toBe(200);
    const firstLate = (await firstResponse.json()).eventId as string;
    const exactResponse = await lateSend("late-exact", beforeEnd, atClose);
    expect(exactResponse.status()).toBe(200);
    const exactLate = (await exactResponse.json()).eventId as string;
    const unpricedResponse = await lateSend("late-unpriced", beforeEnd, atClose, "UNPRICED", 5);
    expect(unpricedResponse.status()).toBe(200);
    const unpricedLate = (await unpricedResponse.json()).eventId as string;
    expect((await lateSend("late-too-late", beforeEnd, afterClose)).status()).toBe(400);
    expect((await lateSend("late-next-month", afterEnd, afterEnd)).status()).toBe(200);
    run(exactLate); run(unpricedLate); run(firstLate); // process in receipt order's reverse
    const afterLateArrival = await (await create(lateMonth, customerA, atClose)).json();
    expect(afterLateArrival.snapshot.comparison).toMatchObject({ previousSnapshotId: beforeLate.currentSnapshotId,
      previousTotal: beforeLate.snapshot.reconciliation.rated.amount, currentTotal: afterLateArrival.snapshot.reconciliation.rated.amount,
      amountDifference: "+8.000", lateArrivalContribution: "+8.000", ratingRecoveryContribution: "+0.000" });
    run(pendingOnTime);
    const withLate = await (await create(lateMonth, customerA, atClose)).json();
    expect([...withLate.snapshot.lateArrivals.events].sort((a, b) => [firstLate, exactLate, unpricedLate].indexOf(a.eventId) - [firstLate, exactLate, unpricedLate].indexOf(b.eventId))).toEqual([
      expect.objectContaining({ eventId: firstLate, occurredAt: beforeEnd, receivedAt: afterEndByMillisecond, metric: "CALLS", quantity: 2, state: "RATED", amount: "4.000" }),
      expect.objectContaining({ eventId: exactLate, occurredAt: beforeEnd, receivedAt: atClose, metric: "CALLS", quantity: 2, state: "RATED", amount: "4.000" }),
      expect.objectContaining({ eventId: unpricedLate, occurredAt: beforeEnd, receivedAt: atClose, metric: "UNPRICED", quantity: 5, state: "UNRATED" }),
    ]);
    expect(withLate.snapshot.lateArrivals.events.find((event: { eventId: string }) => event.eventId === unpricedLate)).not.toHaveProperty("amount");
    expect(withLate.snapshot.lateArrivals.byMetricAndState).toEqual([
      { metric: "CALLS", state: "RATED", count: 2, quantity: "4" },
      { metric: "UNPRICED", state: "UNRATED", count: 1, quantity: "5" },
    ]);
    expect(withLate.snapshot.lateArrivals.ratedContribution).toEqual({ count: 2, quantity: "4", amount: "8.000", currency: "USD" });
    expect(afterLateArrival.snapshot.comparison.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: firstLate, kind: "ADDED", lateArrival: true, amountDifference: "+4.000" }),
      expect.objectContaining({ eventId: exactLate, kind: "ADDED", lateArrival: true, amountDifference: "+4.000" }),
      expect.objectContaining({ eventId: unpricedLate, kind: "ADDED", lateArrival: true, amountDifference: "+0.000" }),
    ]));
    expect(withLate.snapshot.comparison).toMatchObject({ previousSnapshotId: afterLateArrival.currentSnapshotId,
      previousCalculatedAt: afterLateArrival.snapshot.calculatedAt, previousTotal: afterLateArrival.snapshot.reconciliation.rated.amount,
      currentTotal: withLate.snapshot.reconciliation.rated.amount, amountDifference: "+4.000", currency: "USD",
      lateArrivalContribution: "+0.000", ratingRecoveryContribution: "+4.000",
      changes: [expect.objectContaining({ eventId: pendingOnTime, kind: "NEWLY_RATED", lateArrival: false, amountDifference: "+4.000" })] });
    expect(BigInt(withLate.snapshot.reconciliation.rated.amount.replace(".", "")) - BigInt(beforeLate.snapshot.reconciliation.rated.amount.replace(".", ""))).toBe(12000n);
    expect(withLate.snapshot.lines.flatMap((line: { sourceEventIds: string[] }) => line.sourceEventIds)).toEqual(expect.arrayContaining([onTime, pendingOnTime, firstLate, exactLate]));
    expect(withLate.snapshot.reconciliation.accepted.count - beforeLate.snapshot.reconciliation.accepted.count).toBe(3);
    expect(BigInt(withLate.snapshot.reconciliation.accepted.quantity) - BigInt(beforeLate.snapshot.reconciliation.accepted.quantity)).toBe(9n);
    const lateRead = await (await owner.request.get(`${url}?month=${lateMonth}&billedCustomerId=${customerA}`, { headers: { "x-billing-test-now": atClose } })).json();
    expect(lateRead.currentSnapshotId).toBe(withLate.currentSnapshotId);
    expect(lateRead.snapshot.lateArrivals).toEqual(withLate.snapshot.lateArrivals);
    const lateLineIds = withLate.snapshot.lines.flatMap((line: { sourceEventIds: string[] }) => line.sourceEventIds);
    expect(lateLineIds.filter((id: string) => id === firstLate || id === exactLate).sort()).toEqual([firstLate, exactLate].sort());
    expect(new Set(lateLineIds).size).toBe(lateLineIds.length);
    const lateExportResponse = await owner.request.post(`${base}/api/ledger-exports`, { data: { orgId: "draft-a", period: lateMonth } });
    expect(lateExportResponse.status()).toBe(201);
    const lateExport = await (await owner.request.get(`${base}/api/ledger-exports/${(await lateExportResponse.json()).id}?orgId=draft-a`)).json();
    expect(lateExport.rows.filter((row: { externalCustomerId: string }) => row.externalCustomerId === "shared")
      .map((row: { eventId: string }) => row.eventId).sort()).toEqual(withLate.snapshot.sourceEvents.map((event: { eventId: string }) => event.eventId).sort());
    expect((await db.query(`SELECT "lateArrivals" FROM "BillingRecordSnapshot" WHERE id = $1`, [withLate.currentSnapshotId])).rows[0].lateArrivals).toEqual(withLate.snapshot.lateArrivals);
    expect((await db.query(`SELECT "lateArrivals" FROM "BillingRecordSnapshot" WHERE id = $1`, [beforeLate.currentSnapshotId])).rows[0].lateArrivals.events).toEqual([]);
    expect(withLate.history.map((snapshot: { id: string }) => snapshot.id)).toEqual(expect.arrayContaining([beforeLate.currentSnapshotId, afterLateArrival.currentSnapshotId, withLate.currentSnapshotId]));
    expect(withLate.history.find((snapshot: { id: string }) => snapshot.id === beforeLate.currentSnapshotId).lines).toEqual(beforeLate.snapshot.lines);
    expect((await db.query(`SELECT comparison, lines, "ratedSources", "lateArrivals", reconciliation FROM "BillingRecordSnapshot" WHERE id=$1`, [withLate.currentSnapshotId])).rows[0])
      .toMatchObject({ comparison: withLate.snapshot.comparison, lines: withLate.snapshot.lines, ratedSources: withLate.snapshot.ratedSources,
        lateArrivals: withLate.snapshot.lateArrivals, reconciliation: withLate.snapshot.reconciliation });
    const publicationEventResponse = await lateSend("late-publication-failure", beforeEnd, atClose);
    expect(publicationEventResponse.status()).toBe(200);
    const failureEvent = (await publicationEventResponse.json()).eventId as string;
    run(failureEvent);
    const failedPublication = await owner.request.post(url, { headers: { "x-billing-test-now": atClose, "x-billing-test-fail-publication": "true" },
      data: { month: lateMonth, billedCustomerId: customerA } });
    expect(failedPublication.status()).toBe(500);
    expect((await db.query(`SELECT "currentSnapshotId" FROM "BillingRecord" WHERE id=$1`, [withLate.id])).rows[0].currentSnapshotId).toBe(withLate.currentSnapshotId);
    expect((await db.query(`SELECT count(*)::int AS count FROM "BillingRecordSnapshot" WHERE "billingRecordId"=$1`, [withLate.id])).rows[0].count).toBe(withLate.history.length);
    expect((await db.query(`SELECT comparison, lines, "ratedSources", "lateArrivals", reconciliation FROM "BillingRecordSnapshot" WHERE id=$1`, [withLate.currentSnapshotId])).rows[0])
      .toMatchObject({ comparison: withLate.snapshot.comparison, lines: withLate.snapshot.lines, ratedSources: withLate.snapshot.ratedSources,
        lateArrivals: withLate.snapshot.lateArrivals, reconciliation: withLate.snapshot.reconciliation });
    const recoveredPublication = await (await create(lateMonth, customerA, atClose)).json();
    expect(recoveredPublication.snapshot.comparison).toMatchObject({ previousSnapshotId: withLate.currentSnapshotId,
      amountDifference: "+4.000", lateArrivalContribution: "+4.000", ratingRecoveryContribution: "+0.000" });
    expect(recoveredPublication.snapshot.comparison.changes).toContainEqual(expect.objectContaining({ eventId: failureEvent, kind: "ADDED" }));
    const retry = await lateSend("late-exact", beforeEnd, afterClose);
    expect(retry.status()).toBe(200);
    expect((await retry.json()).eventId).toBe(exactLate);
    const repeated = await (await create(lateMonth, customerA, afterClose)).json();
    expect(repeated.snapshot.state).toBe("BLOCKED");
    expect(repeated.snapshot.sourceEvents).toEqual(recoveredPublication.snapshot.sourceEvents);
    expect((await create(lateMonth, customerA, afterClose).then((response) => response.json())).currentSnapshotId).toBe(repeated.currentSnapshotId);
    expect(repeated.snapshot.lateArrivals.ratedContribution.amount).toBe("12.000");
    expect(JSON.stringify(reconciled)).not.toContain("draft-rated");
    expect((await db.query(`SELECT "eventOutcomes", reconciliation FROM "BillingRecordSnapshot" WHERE id=$1`, [reconciled.currentSnapshotId])).rows[0]).toMatchObject({ eventOutcomes: outcomes, reconciliation: reconciled.snapshot.reconciliation });
    expect((await db.query(`SELECT "eventOutcomes" FROM "BillingRecordSnapshot" WHERE id=$1`, [blocked.currentSnapshotId])).rows[0].eventOutcomes).toEqual([expect.objectContaining({ eventId: feb, state: "UNRATED" })]);
    const secondRecoveryResponse = await request.post(`${base}/api/track`, { headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": "draft-recovery-second",
      "x-ledger-test-received-at": eventInstant }, data: { customerId: "recovery", metric: "CALLS", amount: 2, timestamp: eventInstant } });
    expect(secondRecoveryResponse.status()).toBe(200);
    const secondRecoveryEvent = (await secondRecoveryResponse.json()).eventId as string;
    const stalePending = await readiness(reconciliationMonth, recoveryCustomer, recoveryAfterClose);
    expect(stalePending).toMatchObject({ ready: false, blockingReasons: [{ code: "LEDGER_PENDING", eventId: secondRecoveryEvent }] });
    expect(stalePending.snapshotId).not.toBe(readyView.snapshotId);
    run(secondRecoveryEvent, "RATING_TEST_FAIL_ATTEMPT");
    expect(await readiness(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).toMatchObject({ ready: false,
      blockingReasons: [{ code: "RATING_RETRY", eventId: secondRecoveryEvent, reason: "RATING_WORKER_FAILED" }] });
    run(secondRecoveryEvent);
    expect((await readiness(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).ready).toBe(true);
    const completeBeforeMismatch = await (await create(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).json();
    expect(completeBeforeMismatch.snapshot.state).toBe("READY_FOR_REVIEW");
    const existingPrice = (await db.query(`SELECT "orgId", "metricId", "unitPriceMicros", "createdById", "effectiveFrom" FROM "PriceVersion" WHERE id=$1`,
      [completeBeforeMismatch.snapshot.ratedSources[0].priceVersionId])).rows[0];
    await db.query(`INSERT INTO "PriceVersion" (id, "orgId", "metricId", currency, "unitPriceMicros", "createdById", "effectiveFrom")
      VALUES ('draft-mismatched-eur', $1, $2, 'EUR', $3, $4, $5::timestamptz + interval '1 millisecond')`,
    [existingPrice.orgId, existingPrice.metricId, existingPrice.unitPriceMicros, existingPrice.createdById, existingPrice.effectiveFrom]);
    await db.query(`ALTER TABLE "RatedEvent" DISABLE TRIGGER USER`);
    try {
      await db.query(`UPDATE "RatedEvent" SET "priceVersionId"='draft-mismatched-eur', currency='EUR' WHERE "eventId"=$1`, [secondRecoveryEvent]);
    } finally {
      await db.query(`ALTER TABLE "RatedEvent" ENABLE TRIGGER USER`);
    }
    const mismatchResponse = await create(reconciliationMonth, recoveryCustomer, recoveryAfterClose);
    expect(mismatchResponse.status()).toBe(200);
    const mismatch = await mismatchResponse.json();
    expect(mismatch.snapshot.state).toBe("BLOCKED");
    expect(await readiness(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).toMatchObject({ ready: false,
      blockingReasons: [{ code: "RECONCILIATION_MISMATCH" }] });
    expect(mismatch.snapshot.reconciliation).toMatchObject({ balanced: false, rated: { amount: null, currency: null } });
    expect(mismatch.snapshot.reconciliation.rated.byCurrency).toEqual([
      { currency: "EUR", amount: "4.000" }, { currency: "USD", amount: "4.000" },
    ]);
    expect(mismatch.snapshot.comparison).toMatchObject({ previousSnapshotId: completeBeforeMismatch.currentSnapshotId,
      amountDifference: null, unavailableReason: "MIXED_CURRENCY" });
    expect(mismatch.snapshot.lines.map((line: { currency: string }) => line.currency).sort()).toEqual(["EUR", "USD"]);
    expect(mismatch.currentSnapshotId).not.toBe(completeBeforeMismatch.currentSnapshotId);
    expect(mismatch.history.find((snapshot: { id: string }) => snapshot.id === completeBeforeMismatch.currentSnapshotId).state).toBe("READY_FOR_REVIEW");
    await db.query(`ALTER TABLE "RatedEvent" DISABLE TRIGGER USER`);
    try {
      await db.query(`UPDATE "RatedEvent" SET "priceVersionId"=$1, currency='USD' WHERE "eventId"=$2`,
        [completeBeforeMismatch.snapshot.ratedSources[0].priceVersionId, secondRecoveryEvent]);
    } finally {
      await db.query(`ALTER TABLE "RatedEvent" ENABLE TRIGGER USER`);
    }
    const correctedEvidence = await (await create(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).json();
    expect(correctedEvidence.snapshot.state).toBe("READY_FOR_REVIEW");
    expect((await readiness(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).ready).toBe(true);
    expect((await db.query(`SELECT count(*)::int AS count FROM "WebhookEvent"`)).rows[0].count).toBe(0);
    expect((await db.query(`SELECT count(*)::int AS count FROM information_schema.tables WHERE table_name = 'BillingRecordVersion'`)).rows[0].count).toBe(0);
    expect(correctedEvidence.snapshot.reconciliation.rated).toMatchObject({ amount: "8.000", currency: "USD" });
    expect(correctedEvidence.snapshot.comparison).toMatchObject({ previousSnapshotId: mismatch.currentSnapshotId,
      amountDifference: null, unavailableReason: "MIXED_CURRENCY" });
  } finally {
    worker?.kill("SIGTERM");
    await owner.close(); await viewer.close(); await db.end();
  }
});
