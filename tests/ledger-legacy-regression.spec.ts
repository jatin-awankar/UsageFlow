import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { processAggregation } from "../worker/processors/aggregateUsage";
import { processInvoice } from "../worker/processors/generateInvoice";
import { processLedgerEvent } from "../worker/processors/processLedgerEvent";

test("rating and correction preserve legacy billing after an old event gains a Customer link", async ({ page, request }) => {
  test.setTimeout(90_000);
  const base = process.env.CUSTOMER_TEST_BASE_URL!;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const legacyRows = async () => Promise.all(["Plan", "PlanMetric", "AggregatedUsage", "Invoice"].map(async (table) =>
      (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows));
    await processAggregation({ orgId: "org-c", subscriptionId: "subscription-c" });
    await processInvoice({ subscriptionId: "subscription-c" });
    expect((await db.query(`SELECT total FROM "AggregatedUsage" WHERE "subscriptionId"='subscription-c'`)).rows).toEqual([{ total: 7 }]);
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE "subscriptionId"='subscription-c'`)).rows).toEqual([{ amount: 70 }]);
    const recordedLegacyRows = await legacyRows();

    await page.goto(`${base}/login`);
    await page.getByPlaceholder("you@example.com").fill("legacy-owner@example.test");
    await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app/);
    await page.goto(`${base}/app/org-c/settings`);
    await page.getByLabel("ISO 4217 currency").fill("USD");
    await page.getByRole("button", { name: "Set currency" }).click();
    await page.goto(`${base}/app/org-c/metrics/metric-c/pricing`);
    await page.getByLabel("Unit price").fill("2.50");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Effective from (UTC, ISO 8601)").fill("2026-10-01T00:00:00.000Z");
    await page.getByRole("button", { name: "Publish first price" }).click();
    await expect(page.getByRole("status")).toContainText("Price version published.");

    const send = async (key: string, timestamp: string, amount: number) => {
      const response = await request.post(`${base}/api/track`, {
        headers: { "x-usageflow-api-key": "secret-org-c", "idempotency-key": key },
        data: { customerId: "customer-c", metric: "calls", amount, timestamp },
      });
      expect(response.status()).toBe(200);
      return (await response.json()).eventId as string;
    };
    const rated = await send("legacy-regression-rated", "2026-10-01T12:00:00.000Z", 4);
    const gap = await send("legacy-regression-gap", "2026-09-30T12:00:00.000Z", 3);
    await expect.poll(async () => (await db.query(`SELECT amount::text FROM "RatedEvent" WHERE "eventId"=$1`, [rated])).rows[0]?.amount, { timeout: 30_000 }).toBe("10.000");
    await expect.poll(async () => (await db.query(`SELECT reason FROM "UnratedEvent" WHERE "eventId"=$1`, [gap])).rows[0]?.reason, { timeout: 30_000 }).toBe("NO_APPLICABLE_PRICE");

    // Synthetic historical mapping leaves LEGACY treatment intact.
    await db.query(`UPDATE "UsageEvent" SET "billedCustomerId"='customer-row-c', "customerId"='customer-c', "metricId"='metric-c' WHERE id='historical'`);
    await processLedgerEvent("historical");
    expect((await db.query(`SELECT "billingTreatment", "billedCustomerId" FROM "UsageEvent" WHERE id='historical'`)).rows)
      .toEqual([{ billingTreatment: "LEGACY", billedCustomerId: "customer-row-c" }]);
    const start = "2026-09-30T00:00:00.000Z";
    const end = "2026-10-01T00:00:00.000Z";
    const previewUrl = `${base}/api/organizations/org-c/pricing-gap-preview?${new URLSearchParams({ metricId: "metric-c", customerId: "customer-row-c", start, end })}`;
    const previewResponse = await page.request.get(previewUrl);
    expect(previewResponse.status()).toBe(200);
    const preview = await previewResponse.json();
    expect(preview.eligibleEventIds).toEqual([gap]);
    const approval = await page.request.post(`${base}/api/organizations/org-c/pricing-gap-corrections`, { data: {
      metricId: "metric-c", customerId: "customer-row-c", start, end,
      reviewedAt: preview.reviewedAt, reviewToken: preview.reviewToken, eligibleEventIds: [gap],
      unitPrice: "1.25", currency: "USD", reason: "Reviewed synthetic price gap", evidence: "legacy-regression-08",
    } });
    expect(approval.status()).toBe(201);
    expect((await db.query(`SELECT amount::text, "correctionId" IS NOT NULL AS corrected FROM "RatedEvent" WHERE "eventId"=$1`, [gap])).rows)
      .toEqual([{ amount: "3.750", corrected: true }]);
    expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"='historical'`)).rows[0].n).toBe(0);
    expect((await db.query(`SELECT count(*)::int AS n FROM "UnratedEvent" WHERE "eventId"='historical'`)).rows[0].n).toBe(0);

    await processAggregation({ orgId: "org-c", subscriptionId: "subscription-c" });
    await processInvoice({ subscriptionId: "subscription-c" });
    expect(await legacyRows()).toEqual(recordedLegacyRows);
  } finally {
    await db.end();
  }
});
