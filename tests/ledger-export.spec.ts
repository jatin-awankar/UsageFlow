import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { spawn } from "node:child_process";

const base = process.env.CUSTOMER_TEST_BASE_URL!;
const period = "2026-10";

async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("owner export freezes rows, states, failure reasons and totals across pages", async ({ browser, request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const owner = await browser.newPage();
  const viewer = await browser.newPage();
  let worker: ReturnType<typeof spawn> | undefined;
  try {
    await signIn(owner, "owner@example.test");
    await signIn(viewer, "viewer@example.test");
    const create = (page: Page, orgId = "org-c") => page.request.post(`${base}/api/ledger-exports`, { data: { orgId, period } });
    expect((await create(viewer)).status()).toBe(403);
    expect((await create(owner, "org-other")).status()).toBe(403);
    expect((await request.post(`${base}/api/ledger-exports`, { data: { orgId: "org-c", period } })).status()).toBe(401);
    const accept = async (key: string) => {
      const response = await request.post(`${base}/api/track`, {
        headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": key },
        data: { customerId: "customer-c", metric: "calls", amount: 3, timestamp: "2026-10-04T00:00:00.000Z", metadata: { secret: "never-export-me" } },
      });
      expect(response.status()).toBe(200);
      return (await response.json()).eventId as string;
    };
    const ids: string[] = [];
    for (let i = 0; i < 101; i++) ids.push(await accept(`export-${i}`));
    const firstCreate = await create(owner);
    expect(firstCreate.status()).toBe(201);
    const first = await firstCreate.json();
    expect(first.rowCount).toBe(101);
    expect(first.totals).toEqual([{ externalCustomerId: "customer-c", metric: "CALLS", count: 101, quantity: 303 }]);
    const creationRows = (await db.query(`SELECT e.id, e."processingState", e.amount, c."externalId", i."failureReason" FROM "UsageEvent" e JOIN "Customer" c ON c.id = e."billedCustomerId" JOIN "LedgerProcessingIntent" i ON i."eventId" = e.id WHERE e."orgId" = 'org-c' AND e.timestamp >= '2026-10-01' AND e.timestamp < '2026-11-01' ORDER BY e.timestamp, e.id`)).rows;
    expect(creationRows).toHaveLength(first.rowCount);
    expect(creationRows.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0)).toBe(first.totals[0].quantity);
    const get = (id: string, cursor?: string) => owner.request.get(`${base}/api/ledger-exports/${id}?orgId=org-c${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    const page1 = await (await get(first.id)).json();
    expect(page1.rows).toHaveLength(100);
    expect(page1.nextCursor).toBeTruthy();
    expect(page1.rows.every((row: { processingState: string }) => row.processingState === "PENDING")).toBe(true);
    expect((await viewer.request.get(`${base}/api/ledger-exports/${first.id}?orgId=org-c`)).status()).toBe(403);
    expect((await owner.request.get(`${base}/api/ledger-exports/${first.id}?orgId=org-other`)).status()).toBe(403);
    expect((await get(first.id, "invalid")).status()).toBe(400);

    const laterId = await accept("export-later");
    worker = spawn("./node_modules/.bin/tsx", ["worker/index.ts"], { env: { ...process.env, LEDGER_TEST_FAIL_PROJECTION: "true" }, stdio: "ignore" });
    const failedDeadline = Date.now() + 30_000;
    while (Date.now() < failedDeadline) {
      const result = await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id = $1`, [ids[0]]);
      if (result.rows[0]?.processingState === "FAILED") break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect((await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id = $1`, [ids[0]])).rows[0].processingState).toBe("FAILED");
    const failedExport = await (await create(owner)).json();
    const failedPage = await (await get(failedExport.id)).json();
    expect(failedPage.rows.find((row: { eventId: string }) => row.eventId === ids[0])).toMatchObject({ processingState: "FAILED", failureReason: "LEDGER_PROJECTION_FAILED" });
    worker.kill("SIGTERM");
    await new Promise((resolve) => worker!.once("exit", resolve));
    await db.query(`UPDATE "LedgerProcessingIntent" SET "leaseUntil" = now() - interval '1 second' WHERE "eventId" = ANY($1)`, [ids]);
    worker = spawn("./node_modules/.bin/tsx", ["worker/index.ts"], { env: process.env, stdio: "ignore" });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const result = await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id = $1`, [ids[0]]);
      if (result.rows[0]?.processingState === "PROCESSED") break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect((await db.query(`SELECT "processingState" FROM "UsageEvent" WHERE id = $1`, [ids[0]])).rows[0].processingState).toBe("PROCESSED");
    const page2 = await (await get(first.id, page1.nextCursor)).json();
    expect(page2.rows).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
    expect(page2.totals).toEqual(first.totals);
    expect(page2.rows[0].failureReason).toBeNull();
    expect(page2.rows[0].processingState).toBe("PENDING");
    const frozenRows = [...page1.rows, ...page2.rows];
    expect(new Set(frozenRows.map((row: { eventId: string }) => row.eventId))).toEqual(new Set(ids));
    for (const [index, row] of creationRows.entries()) {
      expect(frozenRows[index]).toMatchObject({ eventId: row.id, processingState: row.processingState, quantity: row.amount, externalCustomerId: row.externalId, failureReason: row.failureReason });
    }
    const failedPageAfterRecovery = await (await get(failedExport.id)).json();
    expect(failedPageAfterRecovery.rows.find((row: { eventId: string }) => row.eventId === ids[0])).toMatchObject({ processingState: "FAILED", failureReason: "LEDGER_PROJECTION_FAILED" });
    for (const page of [page1, page2]) {
      const serialized = JSON.stringify(page);
      for (const privateValue of ["never-export-me", "Private owner", "Private Org", "Private API key", "secret-org-c", "customer-row-c"]) expect(serialized).not.toContain(privateValue);
      expect(page.rows.every((row: { keyReference: string }) => row.keyReference.length === 16)).toBe(true);
    }
    const second = await (await create(owner)).json();
    expect(second.rowCount).toBe(102);
    expect(second.totals[0].quantity).toBe(306);
    const freshPage = await (await get(second.id)).json();
    expect(freshPage.rows.some((row: { eventId: string }) => row.eventId === laterId)).toBe(true);
    expect(freshPage.rows.some((row: { eventId: string; processingState: string }) => row.eventId === ids[0] && row.processingState === "PROCESSED")).toBe(true);
  } finally {
    worker?.kill("SIGTERM");
    await owner.close(); await viewer.close(); await db.end();
  }
});
