import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const base = process.env.CUSTOMER_TEST_BASE_URL!;

async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("owner report counts only Organization and UTC-period LEGACY evidence while drafts exclude it", async ({ browser }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const owner = await browser.newPage();
  const viewer = await browser.newPage();
  try {
    await signIn(owner, "owner@example.test");
    await signIn(viewer, "viewer@example.test");
    await owner.goto(`${base}/app/report-a/customers`);
    await owner.getByLabel("External customer ID").fill("verified");
    await owner.getByRole("button", { name: "Create customer" }).click();
    await expect(owner.getByRole("status")).toHaveText("Customer created.");
    const customerId = (await db.query(`SELECT id FROM "Customer" WHERE "orgId"='report-a'`)).rows[0].id;
    const seed = async (id: string, orgId: string, metric: string, amount: number, timestamp: string, rawId: string | null, linked = false) => {
      await db.query(`INSERT INTO "UsageEvent" (id,"metricKey",amount,"customerId","billedCustomerId","billingTreatment",timestamp,"orgId","subscriptionId","apiKeyId","metricId")
        VALUES ($1,$2,$3,$4,$5,'LEGACY',$6,$7,$8,$9,$10)`,
      [id, metric, amount, rawId, linked ? customerId : null, timestamp, orgId, orgId === "report-a" ? "report-sub-a" : "report-sub-b", orgId === "report-a" ? "report-key-a" : "report-key-b", orgId === "report-a" ? "report-metric-a" : "report-metric-b"]);
    };
    await seed("legacy-missing", "report-a", "CALLS", 2, "2024-02-01T00:00:00.000Z", null);
    await seed("legacy-ambiguous", "report-a", "CALLS", 3, "2024-02-15T00:00:00.000Z", "user-shaped-id");
    await seed("legacy-linked", "report-a", "CALLS", 5, "2024-02-29T23:59:59.999Z", "verified", true);
    await seed("legacy-other-metric", "report-a", "STORAGE", 7, "2024-02-20T00:00:00.000Z", "arbitrary-id");
    await seed("legacy-next-month", "report-a", "CALLS", 11, "2024-03-01T00:00:00.000Z", null);
    await seed("legacy-other-org", "report-b", "CALLS", 13, "2024-02-20T00:00:00.000Z", "verified");
    await db.query(`INSERT INTO "UsageEvent" (id,"metricKey",amount,"customerId","billedCustomerId","billingTreatment",timestamp,"receivedAt","processingState","orgId","subscriptionId","apiKeyId","metricId")
      VALUES ('ledger-only','CALLS',19,'verified',$1,'LEDGER_ONLY','2024-02-10','2024-02-10','PENDING','report-a','report-sub-a','report-key-a','report-metric-a')`, [customerId]);

    const legacyBefore = await Promise.all(["Invoice", "AggregatedUsage"].map(async (table) =>
      (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows));
    const reportUrl = `${base}/app/report-a/billing/legacy-exclusions?month=2024-02`;
    await owner.goto(reportUrl);
    await expect(owner.getByRole("heading", { name: "Excluded legacy usage" })).toBeVisible();
    await expect(owner.getByText("Excluded LEGACY events: 4; quantity: 17")).toBeVisible();
    await expect(owner.getByRole("row", { name: "CALLS 3 10" })).toBeVisible();
    await expect(owner.getByRole("row", { name: "STORAGE 1 7" })).toBeVisible();
    await expect(owner.getByText("2024-02-01T00:00:00.000Z to 2024-03-01T00:00:00.000Z", { exact: false })).toBeVisible();
    expect(await owner.locator("body").innerText()).not.toContain("user-shaped-id");
    expect(await owner.locator("body").innerText()).not.toContain("verified");
    await owner.goto(`${base}/app/report-b/billing/legacy-exclusions?month=2024-02`);
    await expect(owner.getByText("Excluded LEGACY events: 1; quantity: 13")).toBeVisible();
    await owner.goto(`${base}/app/report-a/billing/legacy-exclusions?month=2024-03`);
    await expect(owner.getByText("Excluded LEGACY events: 1; quantity: 11")).toBeVisible();
    await viewer.goto(reportUrl);
    await expect(viewer).toHaveURL(`${base}/app/report-a/billing`);

    const draftUrl = `${base}/api/organizations/report-a/billing-records`;
    const draftResponse = await owner.request.post(draftUrl, { data: { month: "2024-02", billedCustomerId: customerId } });
    expect(draftResponse.status()).toBe(200);
    const draft = await draftResponse.json();
    expect(draft.snapshot.sourceEvents).toEqual([expect.objectContaining({ eventId: "ledger-only", quantity: 19 })]);
    expect(draft.snapshot.lines).toEqual([]);
    expect(draft.snapshot.eventOutcomes).toEqual([expect.objectContaining({ eventId: "ledger-only", state: "LEDGER_PENDING" })]);
    expect(draft.snapshot.reconciliation).toMatchObject({ accepted: { count: 1, quantity: "19" }, rated: { count: 0, quantity: "0", amount: "0.000" }, byMetricAndState: [{ metric: "CALLS", state: "LEDGER_PENDING", count: 1, quantity: "19" }] });
    expect(JSON.stringify(draft)).not.toContain("legacy-linked");
    expect((await db.query(`SELECT "billingTreatment", "billedCustomerId" FROM "UsageEvent" WHERE id='legacy-linked'`)).rows)
      .toEqual([{ billingTreatment: "LEGACY", billedCustomerId: customerId }]);
    const legacyAfter = await Promise.all(["Invoice", "AggregatedUsage"].map(async (table) =>
      (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows));
    expect(legacyAfter).toEqual(legacyBefore);
  } finally {
    await owner.close(); await viewer.close(); await db.end();
  }
});
