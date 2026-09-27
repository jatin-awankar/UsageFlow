import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { spawn } from "node:child_process";

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
    const [blockedResponse, concurrentResponse] = await Promise.all([create("2024-02", customerA, "2024-03-04T00:00:00.001Z"), create("2024-02", customerA, "2024-03-04T00:00:00.001Z")]);
    expect(blockedResponse.status()).toBe(200);
    expect(concurrentResponse.status()).toBe(200);
    const blocked = await blockedResponse.json();
    expect(blocked.id).toBe(open.id);
    expect(blocked.snapshot.state).toBe("BLOCKED");
    expect(blocked.currentSnapshotId).not.toBe(open.currentSnapshotId);
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
  } finally {
    worker?.kill("SIGTERM");
    await owner.close(); await viewer.close(); await db.end();
  }
});
