import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { spawn, spawnSync } from "node:child_process";
import { createServer, type ServerResponse } from "node:http";
import { Queue } from "bullmq";
import { verifyBillingRequest } from "../webhook-receiver/billing-verifier.js";

const base = process.env.CUSTOMER_TEST_BASE_URL!;
async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("owner drafts use verified Customer ledger events and immutable monthly snapshots", async ({ browser, request }) => {
  test.setTimeout(120_000);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const owner = await browser.newPage();
  const viewer = await browser.newPage();
  let worker: ReturnType<typeof spawn> | undefined;
  const received: Array<{ body: string; headers: Record<string, string | string[] | undefined> }> = [];
  const heldResponses = new Map<string, ServerResponse>();
  let holdRevisionResponses = false;
  const receiver = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      received.push({ body, headers: request.headers });
      if (holdRevisionResponses && JSON.parse(body).type === "invoice.revised") {
        heldResponses.set(request.url ?? "", response);
        return;
      }
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
  const receiverPort = (receiver.address() as { port: number }).port;
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
    const crossedClose = await owner.request.post(url, { headers: { "x-billing-test-now-sequence": `${closeAt},${recoveryAfterClose}` },
      data: { action: "readiness", month: reconciliationMonth, billedCustomerId: recoveryCustomer } });
    expect(crossedClose.status()).toBe(200);
    expect(await crossedClose.json()).toMatchObject({ checkedAt: closeAt, ready: false,
      blockingReasons: [{ code: "CLOSE_NOT_PASSED" }] });
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
    const staleApproval = await owner.request.post(url, { headers: { "x-billing-test-now": recoveryAfterClose },
      data: { action: "finalize", month: reconciliationMonth, billedCustomerId: recoveryCustomer, requestId: "stale-approval" } });
    expect(staleApproval.status()).toBe(409);
    expect(await staleApproval.json()).toMatchObject({ blockingReasons: [{ code: "LEDGER_PENDING", eventId: secondRecoveryEvent }] });
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
    const mismatchedApproval = await owner.request.post(url, { headers: { "x-billing-test-now": recoveryAfterClose },
      data: { action: "finalize", month: reconciliationMonth, billedCustomerId: recoveryCustomer, requestId: "blocked-approval" } });
    expect(mismatchedApproval.status()).toBe(409);
    expect(await mismatchedApproval.json()).toMatchObject({ blockingReasons: [{ code: "RECONCILIATION_MISMATCH" }] });
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
    await db.query(`INSERT INTO "WebhookEndpoint" (id, url, secret, events, "orgId") VALUES
      ('billing-target-a', $1, 'local-secret', ARRAY['invoice.finalized','invoice.revised'], 'draft-a'),
      ('billing-foreign', $1, 'foreign-secret', ARRAY['invoice.finalized','invoice.revised'], 'draft-b')`, [`http://127.0.0.1:${receiverPort}/billing`]);
    expect(correctedEvidence.snapshot.state).toBe("READY_FOR_REVIEW");
    expect((await readiness(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).ready).toBe(true);
    expect((await db.query(`SELECT count(*)::int AS count FROM "WebhookEvent"`)).rows[0].count).toBe(0);
    expect((await db.query(`SELECT count(*)::int AS count FROM "BillingRecordVersion"`)).rows[0].count).toBe(0);
    expect(correctedEvidence.snapshot.reconciliation.rated).toMatchObject({ amount: "8.000", currency: "USD" });
    expect(correctedEvidence.snapshot.comparison).toMatchObject({ previousSnapshotId: mismatch.currentSnapshotId,
      amountDifference: null, unavailableReason: "MIXED_CURRENCY" });
    const finalize = (headers: Record<string, string> = {}, requestId = "approval-recovery") => owner.request.post(url, {
      headers: { "x-billing-test-now": recoveryAfterClose, ...headers },
      data: { action: "finalize", month: reconciliationMonth, billedCustomerId: recoveryCustomer, requestId },
    });
    expect((await viewer.request.post(url, { data: { action: "finalize", month: reconciliationMonth, billedCustomerId: recoveryCustomer } })).status()).toBe(403);
    expect((await owner.request.post(url, { data: { action: "finalize", month: reconciliationMonth, billedCustomerId: customerB } })).status()).toBe(404);
    expect((await finalize({ "x-billing-test-now": closeAt })).status()).toBe(409);
    // A persisted rating cannot hide an unresolved ledger failure at approval time.
    await db.query(`UPDATE "UsageEvent" SET "processingState"='FAILED' WHERE id=$1`, [secondRecoveryEvent]);
    try {
      const conflictingLedgerEvidence = await finalize();
      expect(conflictingLedgerEvidence.status()).toBe(409);
      expect(await conflictingLedgerEvidence.json()).toMatchObject({ blockingReasons: [{ code: "LEDGER_FAILED", eventId: secondRecoveryEvent }] });
      expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(0);
    } finally {
      await db.query(`UPDATE "UsageEvent" SET "processingState"='PROCESSED' WHERE id=$1`, [secondRecoveryEvent]);
    }
    for (const failure of ["before-version", "before-pointer", "before-event"]) {
      expect((await finalize({ "x-billing-test-fail-finalization": failure })).status()).toBe(500);
      expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(0);
      expect((await db.query(`SELECT "currentFinalVersionId" FROM "BillingRecord" WHERE id=$1`, [correctedEvidence.id])).rows[0].currentFinalVersionId).toBeNull();
      expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent" WHERE type='invoice.finalized'`)).rows[0].n).toBe(0);
      expect((await db.query(`SELECT count(*)::int AS n FROM "BillingFinalizationRequest"`)).rows[0].n).toBe(0);
    }
    const lostResponse = await finalize({ "x-billing-test-fail-finalization": "after-commit" });
    expect(lostResponse.status()).toBe(500);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingFinalizationRequest" WHERE "requestId"='approval-recovery'`)).rows[0].n).toBe(1);
    const winnerId = "approval-recovery";
    const final = await (await finalize({}, winnerId)).json();
    expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent" WHERE "billingRecordVersionId"=$1`, [final.versionId])).rows[0].n).toBe(1);
    expect((await db.query(`SELECT status, "targetEndpointIds" FROM "WebhookEvent" WHERE id=$1`, [final.eventId])).rows[0])
      .toEqual({ status: "PENDING", targetEndpointIds: ["billing-target-a"] });
    await expect(db.query(`UPDATE "WebhookEndpoint" SET url='http://127.0.0.1:1/redirect' WHERE id='billing-target-a'`)).rejects.toThrow();
    await expect(db.query(`DELETE FROM "WebhookEndpoint" WHERE id='billing-target-a'`)).rejects.toThrow();
    await db.query(`INSERT INTO "WebhookEndpoint" (id, url, secret, events, "orgId") VALUES
      ('billing-added-later', $1, 'later-secret', ARRAY['invoice.finalized'], 'draft-a')`, [`http://127.0.0.1:${receiverPort}/late`]);
    const webhookQueue = new Queue("usageflow", { connection: { url: process.env.REDIS_URL! } });
    const queued = await webhookQueue.getJobs(["waiting", "delayed"]);
    expect(queued.filter((job) => job.name === "DELIVER_WEBHOOK" && job.data.webhookEventId === final.eventId)).toHaveLength(1);
    await webhookQueue.obliterate({ force: true });
    const lostFinalJobs = await webhookQueue.getJobs(["waiting", "delayed"]);
    expect(lostFinalJobs.filter((job) => job.name === "DELIVER_WEBHOOK" && job.data.webhookEventId === final.eventId)).toHaveLength(0);
    await webhookQueue.close();
    worker = spawn("./node_modules/.bin/tsx", ["worker/index.ts"], { env: process.env, stdio: "ignore" });
    await expect.poll(async () => received.filter(({ body }) => JSON.parse(body).id === final.eventId).length,
      { timeout: 20_000 }).toBe(1);
    const finalRequest = received.find(({ body }) => JSON.parse(body).id === final.eventId)!;
    expect(verifyBillingRequest(Buffer.from(finalRequest.body), finalRequest.headers["x-usageflow-timestamp"],
      finalRequest.headers["x-usageflow-signature"], "local-secret")?.id).toBe(final.eventId);
    expect(JSON.parse(finalRequest.body)).toMatchObject({
      id: final.eventId, type: "invoice.finalized", organizationId: "draft-a", billingRecordVersionId: final.versionId,
      payload: { amount: "8.000" },
    });
    await expect.poll(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id=$1`, [final.eventId])).rows[0].status).toBe("DELIVERED");
    expect(received.filter(({ body }) => JSON.parse(body).id === final.eventId)).toHaveLength(1);
    await db.query(`DELETE FROM "WebhookEndpoint" WHERE id='billing-added-later'`);
    worker.kill("SIGTERM");
    await new Promise<void>((resolve) => worker!.once("exit", () => resolve()));
    worker = undefined;
    const competingResponse = await finalize({}, "competing-approval");
    expect(competingResponse.status()).toBe(409);
    expect(await competingResponse.json()).toMatchObject({ blockingReasons: [{ code: "ALREADY_FINALIZED", currentVersionId: final.versionId }] });
    expect(await (await finalize({}, winnerId)).json()).toEqual(final);
    const differentIdentity = await finalize({}, "another-approval");
    expect(differentIdentity.status()).toBe(409);
    expect(await differentIdentity.json()).toMatchObject({ blockingReasons: [{ code: "ALREADY_FINALIZED", currentVersionId: final.versionId }] });
    const changedFields = await owner.request.post(url, { headers: { "x-billing-test-now": recoveryAfterClose },
      data: { action: "finalize", month: "2024-01", billedCustomerId: recoveryCustomer, requestId: winnerId } });
    expect(changedFields.status()).toBe(409);
    expect(await changedFields.json()).toMatchObject({ blockingReasons: [{ code: "REQUEST_ID_CONFLICT" }] });
    const changedCustomer = await owner.request.post(url, { headers: { "x-billing-test-now": recoveryAfterClose },
      data: { action: "finalize", month: reconciliationMonth, billedCustomerId: customerA, requestId: winnerId } });
    expect(changedCustomer.status()).toBe(409);
    expect(await changedCustomer.json()).toMatchObject({ blockingReasons: [{ code: "REQUEST_ID_CONFLICT" }] });
    const binding = (await db.query(`SELECT * FROM "BillingFinalizationRequest" WHERE "orgId"='draft-a' AND "requestId"=$1`, [winnerId])).rows[0];
    expect(binding).toMatchObject({ billedCustomerId: recoveryCustomer, billingRecordId: correctedEvidence.id,
      versionId: final.versionId, eventId: final.eventId });
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingFinalizationRequest"`)).rows[0].n).toBe(1);
    expect(final).toMatchObject({ billingRecordId: correctedEvidence.id, kind: "BILLING_RECORD_COMPARISON_CALCULATION" });
    const version = (await db.query(`SELECT * FROM "BillingRecordVersion" WHERE id=$1`, [final.versionId])).rows[0];
    expect(version).toMatchObject({ billingRecordId: correctedEvidence.id,
      version: 1, approvedById: "draft-owner", currency: "USD", sourceEvents: correctedEvidence.snapshot.sourceEvents,
      ratedSources: correctedEvidence.snapshot.ratedSources, lines: correctedEvidence.snapshot.lines,
      reconciliation: correctedEvidence.snapshot.reconciliation, lateArrivals: correctedEvidence.snapshot.lateArrivals });
    expect(version.amount).toBe("8.000");
    expect((await db.query(`SELECT "currentFinalVersionId" FROM "BillingRecord" WHERE id=$1`, [correctedEvidence.id])).rows[0].currentFinalVersionId).toBe(final.versionId);
    expect((await db.query(`SELECT type, payload, "billingRecordVersionId" FROM "WebhookEvent" WHERE id=$1`, [final.eventId])).rows[0]).toMatchObject({
      type: "invoice.finalized", billingRecordVersionId: final.versionId, payload: { organizationId: "draft-a", billingRecordId: correctedEvidence.id,
        customerId: recoveryCustomer, versionId: final.versionId, version: 1, amount: "8.000", currency: "USD" },
    });
    const nextMonthInstant = new Date(Date.UTC(Number(reconciliationMonth.slice(0, 4)), Number(reconciliationMonth.slice(5)), 1, 0, 0, 1)).toISOString();
    const laterEventResponse = await request.post(`${base}/api/track`, { headers: { "x-usageflow-api-key": "secret-org-c",
      "idempotency-key": "draft-after-final-recovery", "x-ledger-test-received-at": nextMonthInstant },
      data: { customerId: "recovery", metric: "CALLS", amount: 2, timestamp: nextMonthInstant } });
    expect(laterEventResponse.status()).toBe(200);
    const laterEvent = (await laterEventResponse.json()).eventId as string;
    run(laterEvent, "RATING_TEST_FAIL_ATTEMPT");
    run(laterEvent); // Worker recovery for this Customer after approval cannot change the earlier final month.
    const nextMonth = nextMonthInstant.slice(0, 7);
    const nextMonthAfterClose = new Date(Date.UTC(Number(nextMonth.slice(0, 4)), Number(nextMonth.slice(5)), 4, 0, 0, 0, 1)).toISOString();
    const nextDraft = await (await create(nextMonth, recoveryCustomer, nextMonthAfterClose)).json();
    expect(nextDraft.snapshot.state).toBe("READY_FOR_REVIEW");
    const nextApproval = (requestId: string) => owner.request.post(url, { headers: { "x-billing-test-now": nextMonthAfterClose },
      data: { action: "finalize", month: nextMonth, billedCustomerId: recoveryCustomer, requestId } });
    await db.query(`UPDATE "WebhookEndpoint" SET active=false WHERE id='billing-target-a'`);
    const [nextFirst, nextSecond] = await Promise.all([nextApproval("next-first"), nextApproval("next-second")]);
    expect([nextFirst.status(), nextSecond.status()].sort()).toEqual([200, 409]);
    const nextFinal = await (nextFirst.status() === 200 ? nextFirst : nextSecond).json();
    expect((await db.query(`SELECT status, "targetEndpointIds" FROM "WebhookEvent" WHERE id=$1`, [nextFinal.eventId])).rows[0])
      .toEqual({ status: "NO_TARGET", targetEndpointIds: [] });
    await db.query(`UPDATE "WebhookEndpoint" SET active=true WHERE id='billing-target-a'`);
    const nextConflict = await (nextFirst.status() === 409 ? nextFirst : nextSecond).json();
    expect(nextConflict).toMatchObject({ blockingReasons: [{ code: "ALREADY_FINALIZED", currentVersionId: nextFinal.versionId }] });
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE "billingRecordId"=$1`, [nextDraft.id])).rows[0].n).toBe(1);
    expect((await db.query(`SELECT "currentFinalVersionId" FROM "BillingRecord" WHERE id=$1`, [nextDraft.id])).rows[0].currentFinalVersionId).toBe(nextFinal.versionId);
    expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent" WHERE "billingRecordVersionId"=$1 AND type='invoice.finalized'`, [nextFinal.versionId])).rows[0].n).toBe(1);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingFinalizationRequest" WHERE "billingRecordId"=$1 AND "versionId"=$2 AND "eventId"=$3`,
      [nextDraft.id, nextFinal.versionId, nextFinal.eventId])).rows[0].n).toBe(1);
    const afterFinalRecalculation = await (await create(reconciliationMonth, recoveryCustomer, recoveryAfterClose)).json();
    expect(afterFinalRecalculation.finalization).toMatchObject({ kind: "BILLING_RECORD_COMPARISON_CALCULATION",
      currentVersion: { id: final.versionId, amount: "8.000", lines: version.lines } });
    expect((await db.query(`SELECT lines, amount FROM "BillingRecordVersion" WHERE id=$1`, [final.versionId])).rows[0]).toEqual({ lines: version.lines, amount: "8.000" });
    await expect(db.query(`UPDATE "BillingRecordVersion" SET amount=9 WHERE id=$1`, [final.versionId])).rejects.toThrow();
    await expect(db.query(`INSERT INTO "BillingRecordVersion" (id, "billingRecordId", "snapshotId", version, "approvedById", "finalizedAt",
      "periodStart", "periodEnd", "closeAt", "sourceEvents", "ratedSources", "eventOutcomes", lines, reconciliation, "lateArrivals", comparison, currency, amount)
      SELECT gen_random_uuid()::text, "billingRecordId", "snapshotId", version, "approvedById", "finalizedAt",
      "periodStart", "periodEnd", "closeAt", "sourceEvents", "ratedSources", "eventOutcomes", lines, reconciliation, "lateArrivals", comparison, currency, amount
      FROM "BillingRecordVersion" WHERE id=$1`, [final.versionId])).rejects.toThrow();
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE id='legacy-invoice'`)).rows[0].amount).toBe(999);
    const revision = (headers: Record<string, string> = {}, overrides: Record<string, unknown> = {}) => owner.request.post(url, {
      headers, data: { action: "revise", month: reconciliationMonth, billedCustomerId: recoveryCustomer,
        expectedVersionId: final.versionId, requestId: "revision-one", reason: "Correct supported comparison amount",
        evidenceRef: "https://evidence.example.test/corrections/one", currency: "USD", signedDelta: "1.000", revisedAmount: "9.000",
        affectedLines: [{ lineIndex: 0, sourceEventIds: version.lines[0].sourceEventIds,
          signedDelta: "1.000", revisedAmount: "9.000" }], ...overrides } });
    expect((await viewer.request.post(url, { data: { action: "revise", month: reconciliationMonth, billedCustomerId: recoveryCustomer } })).status()).toBe(403);
    expect((await revision({}, { billedCustomerId: customerB })).status()).toBe(404);
    expect((await revision({}, { evidenceRef: "ambiguous" })).status()).toBe(400);
    expect((await revision({}, { currency: "EUR" })).status()).toBe(409);
    expect((await revision({}, { affectedLines: [{ lineIndex: 0, sourceEventIds: ["unrelated"], signedDelta: "1.000", revisedAmount: "9.000" }] })).status()).toBe(409);
    for (const failure of ["before-adjustment", "before-version", "before-pointer", "before-event"]) {
      expect((await revision({ "x-billing-test-fail-revision": failure })).status()).toBe(500);
      expect((await db.query(`SELECT "currentFinalVersionId" FROM "BillingRecord" WHERE id=$1`, [correctedEvidence.id])).rows[0].currentFinalVersionId).toBe(final.versionId);
      expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(1);
      expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordAdjustment" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(0);
      expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRevisionRequest" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(0);
      expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent" WHERE type='invoice.revised' AND "orgId"='draft-a'`)).rows[0].n).toBe(0);
    }
    await db.query(`INSERT INTO "WebhookEndpoint" (id, url, secret, events, "orgId") VALUES
      ('billing-target-b', $1, 'second-secret', ARRAY['invoice.revised'], 'draft-a')`, [`http://127.0.0.1:${receiverPort}/billing-second`]);
    holdRevisionResponses = true;
    const lostRevision = await revision({ "x-billing-test-fail-revision": "after-commit" });
    expect(lostRevision.status()).toBe(500);
    const revisedResponse = await revision();
    expect(revisedResponse.status()).toBe(200);
    const revised = await revisedResponse.json();
    expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent" WHERE "billingRecordVersionId"=$1`, [revised.versionId])).rows[0].n).toBe(1);
    expect((await db.query(`SELECT "targetEndpointIds" FROM "WebhookEvent" WHERE id=$1`, [revised.eventId])).rows[0].targetEndpointIds)
      .toEqual(["billing-target-a", "billing-target-b"]);
    const revisionQueue = new Queue("usageflow", { connection: { url: process.env.REDIS_URL! } });
    const revisionJobs = await revisionQueue.getJobs(["waiting", "delayed"]);
    expect(revisionJobs.filter((job) => job.name === "DELIVER_WEBHOOK" && job.data.webhookEventId === revised.eventId)).toHaveLength(2);
    await revisionQueue.obliterate({ force: true });
    const lostRevisionJobs = await revisionQueue.getJobs(["waiting", "delayed"]);
    expect(lostRevisionJobs.filter((job) => job.name === "DELIVER_WEBHOOK" && job.data.webhookEventId === revised.eventId)).toHaveLength(0);
    await revisionQueue.close();
    worker = spawn("./node_modules/.bin/tsx", ["worker/index.ts"], { env: process.env, stdio: "ignore" });
    await expect.poll(async () => received.filter(({ body }) => JSON.parse(body).id === revised.eventId).length,
      { timeout: 20_000 }).toBe(2);
    await owner.goto(`${base}/app/draft-a/webhooks`);
    const firstTargetRow = owner.getByRole("row").filter({ has: owner.getByText(`http://127.0.0.1:${receiverPort}/billing`, { exact: true }) });
    await firstTargetRow.getByRole("button", { name: "Deactivate" }).click();
    await expect(firstTargetRow.getByRole("button", { name: "Updating..." })).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect((await db.query(`SELECT active FROM "WebhookEndpoint" WHERE id='billing-target-a'`)).rows[0].active).toBe(true);
    heldResponses.get("/billing")!.writeHead(204).end();
    heldResponses.delete("/billing");
    await expect.poll(async () => (await db.query(`SELECT active FROM "WebhookEndpoint" WHERE id='billing-target-a'`)).rows[0].active).toBe(false);
    await expect.poll(async () => (await db.query(`SELECT status FROM "WebhookDelivery" WHERE "webhookEventId"=$1 AND "endpointId"='billing-target-a'`,
      [revised.eventId])).rows[0]?.status).toBe("SUCCESS");
    expect((await db.query(`SELECT status FROM "WebhookEvent" WHERE id=$1`, [revised.eventId])).rows[0].status).toBe("PENDING");
    heldResponses.get("/billing-second")!.writeHead(204).end();
    heldResponses.delete("/billing-second");
    holdRevisionResponses = false;
    await expect.poll(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id=$1`, [revised.eventId])).rows[0].status).toBe("DELIVERED");
    await db.query(`UPDATE "WebhookEndpoint" SET active=true WHERE id='billing-target-a'`);
    expect(received.filter(({ body }) => JSON.parse(body).id === revised.eventId)).toHaveLength(2);
    const revisedRequests = received.filter(({ body }) => JSON.parse(body).id === revised.eventId);
    expect(Buffer.from(revisedRequests[0].body).equals(Buffer.from(revisedRequests[1].body))).toBe(true);
    for (const request of revisedRequests) {
      const valid = ["local-secret", "second-secret"].some((secret) =>
        verifyBillingRequest(Buffer.from(request.body), request.headers["x-usageflow-timestamp"],
          request.headers["x-usageflow-signature"], secret)?.id === revised.eventId);
      expect(valid).toBe(true);
    }
    expect(JSON.parse(revisedRequests[0].body)).toMatchObject({
      id: revised.eventId, type: "invoice.revised", billingRecordVersionId: revised.versionId,
      payload: { amount: "9.000", predecessorVersionId: final.versionId },
    });
    worker.kill("SIGTERM");
    await new Promise<void>((resolve) => worker!.once("exit", () => resolve()));
    worker = undefined;
    const adjustment = (await db.query(`SELECT * FROM "BillingRecordAdjustment" WHERE id=$1`, [revised.adjustmentId])).rows[0];
    expect(adjustment).toMatchObject({ billingRecordId: correctedEvidence.id, previousVersionId: final.versionId,
      actorId: "draft-owner", requestId: "revision-one", reason: "Correct supported comparison amount",
      evidenceRef: "https://evidence.example.test/corrections/one", currency: "USD", previousAmount: "8.000",
      signedDelta: "1.000", revisedAmount: "9.000" });
    expect(adjustment.createdAt).toBeTruthy();
    const revisedVersion = (await db.query(`SELECT * FROM "BillingRecordVersion" WHERE id=$1`, [revised.versionId])).rows[0];
    expect(revisedVersion).toMatchObject({ predecessorId: final.versionId, adjustmentId: revised.adjustmentId,
      version: 2, approvedById: "draft-owner", amount: "9.000", currency: "USD", sourceEvents: version.sourceEvents,
      ratedSources: version.ratedSources });
    expect(revisedVersion.lines[0].amount).toBe("9.000");
    expect(revisedVersion.lines[0]).toMatchObject({ ratedAmount: "8.000", adjustmentAmount: "1.000",
      sourceEventIds: version.lines[0].sourceEventIds, unitPriceMicros: version.lines[0].unitPriceMicros });
    expect(revisedVersion.reconciliation).toMatchObject({ rated: { amount: "8.000", currency: "USD" },
      revised: { ratedAmount: "8.000", adjustmentAmount: "1.000", amount: "9.000", currency: "USD", balanced: true },
      adjustments: [{ previousAmount: "8.000", signedDelta: "1.000", revisedAmount: "9.000", adjustmentId: revised.adjustmentId }] });
    expect((await db.query(`SELECT lines, amount FROM "BillingRecordVersion" WHERE id=$1`, [final.versionId])).rows[0]).toEqual({ lines: version.lines, amount: "8.000" });
    expect((await db.query(`SELECT "currentFinalVersionId" FROM "BillingRecord" WHERE id=$1`, [correctedEvidence.id])).rows[0].currentFinalVersionId).toBe(revised.versionId);
    expect((await db.query(`SELECT type, payload, "billingRecordVersionId" FROM "WebhookEvent" WHERE id=$1`, [revised.eventId])).rows[0]).toMatchObject({
      type: "invoice.revised", billingRecordVersionId: revised.versionId,
      payload: { organizationId: "draft-a", billingRecordId: correctedEvidence.id, customerId: recoveryCustomer,
        versionId: revised.versionId, predecessorVersionId: final.versionId, adjustmentId: revised.adjustmentId,
        currency: "USD", previousAmount: "8.000", amount: "9.000" } });
    expect(await (await revision()).json()).toEqual(revised);
    const changedRevision = await revision({}, { reason: "A different correction" });
    expect(changedRevision.status()).toBe(409);
    expect(await changedRevision.json()).toMatchObject({ blockingReasons: [{ code: "REQUEST_ID_CONFLICT" }] });
    const revisionBinding = (await db.query(`SELECT * FROM "BillingRevisionRequest" WHERE "orgId"='draft-a' AND "requestId"='revision-one'`)).rows[0];
    expect(revisionBinding).toMatchObject({ billingRecordId: correctedEvidence.id, expectedVersionId: final.versionId,
      adjustmentId: revised.adjustmentId, versionId: revised.versionId, eventId: revised.eventId });
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRevisionRequest" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(1);
    expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent" WHERE "billingRecordVersionId"=$1 AND type='invoice.revised'`, [revised.versionId])).rows[0].n).toBe(1);
    const retryFinal = await (await finalize({}, winnerId)).json();
    expect(retryFinal).toEqual(final);
    expect((await db.query(`SELECT "currentFinalVersionId" FROM "BillingRecord" WHERE id=$1`, [correctedEvidence.id])).rows[0].currentFinalVersionId).toBe(revised.versionId);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(2);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordAdjustment" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(1);
    const competing = (requestId: string) => revision({}, { expectedVersionId: revised.versionId, requestId,
      signedDelta: "1.000", revisedAmount: "10.000", affectedLines: [{ lineIndex: 0,
        sourceEventIds: revisedVersion.lines[0].sourceEventIds, signedDelta: "1.000", revisedAmount: "10.000" }] });
    const [raceA, raceB] = await Promise.all([competing("revision-race-a"), competing("revision-race-b")]);
    expect([raceA.status(), raceB.status()].sort()).toEqual([200, 409]);
    const winnerRequestId = raceA.status() === 200 ? "revision-race-a" : "revision-race-b";
    const loserRequestId = raceA.status() === 409 ? "revision-race-a" : "revision-race-b";
    const raceWinner = await (raceA.status() === 200 ? raceA : raceB).json();
    await db.query(`UPDATE "WebhookEndpoint" SET active=false WHERE id='billing-target-a'`);
    await db.query(`UPDATE "WebhookEndpoint" SET active=false WHERE id='billing-target-b'`);
    worker = spawn("./node_modules/.bin/tsx", ["worker/index.ts"], { env: process.env, stdio: "ignore" });
    await expect.poll(async () => (await db.query(`SELECT status FROM "WebhookEvent" WHERE id=$1`, [raceWinner.eventId])).rows[0].status,
      { timeout: 20_000 }).toBe("FAILED");
    expect((await db.query(`SELECT status, "responseBody" FROM "WebhookDelivery" WHERE "webhookEventId"=$1 ORDER BY "endpointId"`,
      [raceWinner.eventId])).rows).toEqual([
      { status: "SKIPPED", responseBody: "Endpoint disabled" },
      { status: "SKIPPED", responseBody: "Endpoint disabled" },
    ]);
    expect(received.filter(({ body }) => JSON.parse(body).id === raceWinner.eventId)).toHaveLength(0);
    expect(await (await competing(winnerRequestId)).json()).toEqual(raceWinner);
    const staleRevision = await competing(loserRequestId);
    expect(staleRevision.status()).toBe(409);
    expect(await staleRevision.json()).toMatchObject({ blockingReasons: [{ code: "STALE_VERSION", currentVersionId: raceWinner.versionId }] });
    expect((await db.query(`SELECT "currentFinalVersionId" FROM "BillingRecord" WHERE id=$1`, [correctedEvidence.id])).rows[0].currentFinalVersionId).toBe(raceWinner.versionId);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(3);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordAdjustment" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(2);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRevisionRequest" WHERE "billingRecordId"=$1`, [correctedEvidence.id])).rows[0].n).toBe(2);
    expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent" WHERE type='invoice.revised' AND "billingRecordVersionId" IN ($1,$2)`,
      [revised.versionId, raceWinner.versionId])).rows[0].n).toBe(2);
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE id='legacy-invoice'`)).rows[0].amount).toBe(999);
  } finally {
    for (const response of heldResponses.values()) response.writeHead(204).end();
    worker?.kill("SIGTERM");
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
    await owner.close(); await viewer.close(); await db.end();
  }
});
