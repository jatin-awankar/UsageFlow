import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const base = process.env.CUSTOMER_TEST_BASE_URL!;
const start = "2026-09-30T00:00:00.000Z";
const end = "2026-10-01T00:00:00.000Z";

async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("owner previews only exact Customer, metric, Organization and half-open UTC events without writes", async ({ page, request }) => {
  test.setTimeout(90_000);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const legacyTables = ["Plan", "AggregatedUsage", "Invoice"] as const;
    const legacyRowsBefore = await Promise.all(legacyTables.map(async (table) =>
      (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows));
    const send = async (key: string, metric: string, customerId: string, at: string, apiKey = "secret-org-c") => {
      const response = await request.post(`${base}/api/track`, {
        headers: { "x-usageflow-api-key": apiKey, "idempotency-key": key },
        data: { metric, customerId, amount: 2, timestamp: at },
      });
      expect(response.status()).toBe(200);
      return (await response.json()).eventId as string;
    };
    await signIn(page, "gap-owner@example.test");
    await page.goto(`${base}/app/gap-a/settings`);
    await page.getByLabel("ISO 4217 currency").fill("USD");
    await page.getByRole("button", { name: "Set currency" }).click();
    await page.goto(`${base}/app/gap-a/metrics/gap-metric-a/pricing`);
    await page.getByLabel("Unit price").fill("1");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Effective from (UTC, ISO 8601)").fill(end);
    await page.getByRole("button", { name: "Publish first price" }).click();
    await expect(page.getByRole("status")).toContainText("Price version published.");
    const inStart = await send("in-start", "calls", "same-external", start);
    const inLast = await send("in-last", "calls", "same-external", "2026-09-30T23:59:59.999Z");
    const outBefore = await send("out-before", "calls", "same-external", "2026-09-29T23:59:59.999Z");
    const outEnd = await send("out-end", "calls", "same-external", end);
    const outCustomer = await send("out-customer", "calls", "other-external", start);
    const outMetric = await send("out-metric", "other", "same-external", start);
    const outOrg = await send("out-org", "calls", "same-external", start, "secret-org-b");
    const reconciliation = async () => (await (await page.request.get(`${base}/api/organizations/gap-a/usage-events`)).json()).rows as Array<{ eventId: string; ratingState: string; ratingReason: string | null }>;
    await expect.poll(async () => {
      const rows = await reconciliation();
      return [inStart, inLast, outBefore, outCustomer, outMetric].map((id) => rows.find((row) => row.eventId === id)?.ratingState);
    }, { timeout: 30_000 }).toEqual(["UNRATED", "UNRATED", "UNRATED", "UNRATED", "UNRATED"]);
    await expect.poll(async () => (await reconciliation()).find((row) => row.eventId === outEnd)?.ratingState).toBe("RATED");
    await expect.poll(async () => (await db.query(`SELECT count(*)::int AS n FROM "UnratedEvent" WHERE "eventId"=$1`, [outOrg])).rows[0].n).toBe(1);
    const count = async (table: string) => Number((await db.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n);
    const before = [await count("RatedEvent"), await count("UnratedEvent"), await count("PriceVersion")];
    const url = (overrides: Record<string, string> = {}) => `${base}/api/organizations/gap-a/pricing-gap-preview?${new URLSearchParams({ metricId: "gap-metric-a", customerId: "gap-customer-a", start, end, ...overrides })}`;
    expect((await request.get(url())).status()).toBe(401);
    const response = await page.request.get(url());
    expect(response.status()).toBe(200);
    const preview = await response.json();
    expect(preview).toMatchObject({ orgId: "gap-a", metricId: "gap-metric-a", customerId: "gap-customer-a", externalCustomerId: "same-external", currency: "USD", start, end, eligibleEventIds: [inStart, inLast] });
    expect(preview.eligibleEventIds).not.toContain("gap-linked-legacy");
    expect(preview.events).toEqual([
      expect.objectContaining({ eventId: inStart, occurredAt: start, quantity: 2, metric: "CALLS", ratingState: "UNRATED" }),
      expect.objectContaining({ eventId: inLast, occurredAt: "2026-09-30T23:59:59.999Z", ratingReason: "NO_APPLICABLE_PRICE" }),
    ]);
    await page.goto(`${base}/app/gap-a/metrics/gap-metric-a/pricing/gap-preview?${new URLSearchParams({ customerId: "gap-customer-a", start, end })}`);
    await expect(page.getByRole("heading", { name: "Preview pricing gap for Calls" })).toBeVisible();
    await expect(page.getByText(`Eligible UNRATED event IDs: ${inStart}, ${inLast}`)).toBeVisible();
    const rejected: Record<string, string>[] = [
      { customerId: "gap-customer-b" }, { metricId: "gap-metric-b" },
      { start: end, end: "2026-10-02T00:00:00.000Z" },
      { start: "2026-09-30T23:59:59.999Z", end: "2026-10-01T00:00:00.001Z" },
      { start: end, end },
    ];
    for (const overrides of rejected) expect((await page.request.get(url(overrides))).status()).toBe(400);
    const otherCustomer = await page.request.get(url({ customerId: "gap-other-a" }));
    expect((await otherCustomer.json()).eligibleEventIds).toEqual([outCustomer]);
    const otherOrg = await page.request.get(`${base}/api/organizations/gap-b/pricing-gap-preview?${new URLSearchParams({ metricId: "gap-metric-b", customerId: "gap-customer-b", start, end })}`);
    expect(otherOrg.status()).toBe(403);
    expect([await count("RatedEvent"), await count("UnratedEvent"), await count("PriceVersion")]).toEqual(before);
    const approval = { metricId: "gap-metric-a", customerId: "gap-customer-a", start, end,
      reviewedAt: preview.reviewedAt, reviewToken: preview.reviewToken, eligibleEventIds: [inStart, inLast], unitPrice: "1.234567",
      currency: "USD", reason: "Documented historical gap", evidence: "review-case-07" };
    const approve = (changes: Record<string, unknown> = {}) => page.request.post(`${base}/api/organizations/gap-a/pricing-gap-corrections`, { data: { ...approval, ...changes } });
    expect((await request.post(`${base}/api/organizations/gap-a/pricing-gap-corrections`, { data: approval })).status()).toBe(401);
    for (const ids of [[inStart], [inStart, inLast, "missing"], [inStart, inLast, "gap-linked-legacy"], [inStart, inLast, outCustomer],
      [inStart, inLast, outMetric], [inStart, inLast, outBefore], [inStart, inLast, outEnd], [inStart, inLast, outOrg]]) {
      expect((await approve({ eligibleEventIds: ids })).status()).toBe(409);
      expect([await count("RatedEvent"), await count("PricingGapCorrection"), await count("PriceVersion")]).toEqual([before[0], 0, before[2]]);
    }
    expect((await approve({ customerId: "gap-other-a" })).status()).toBe(409);
    expect((await approve({ metricId: "gap-other-metric" })).status()).toBe(409);
    const overlap = await approve({ end: "2026-10-01T00:00:00.001Z" });
    expect(overlap.status()).toBe(409);
    expect((await overlap.json()).error).toContain("published price");
    expect((await approve({ currency: "JPY" })).status()).toBe(409);
    expect((await approve({ unitPrice: "1000000" })).status()).toBe(409);
    expect((await approve({ reviewToken: "" })).status()).toBe(409);
    expect((await approve({ reviewedAt: "2099-01-01T00:00:00.000Z" })).status()).toBe(409);
    expect((await approve({ reviewedAt: "2000-01-01T00:00:00.000Z" })).status()).toBe(409);
    expect([await count("RatedEvent"), await count("PricingGapCorrection"), await count("PriceVersion")]).toEqual([before[0], 0, before[2]]);
    await page.getByLabel("Approved unit price").fill(approval.unitPrice);
    await page.getByLabel("Reason").fill(approval.reason);
    await page.getByLabel("Evidence reference or retained evidence").fill(approval.evidence);
    await page.getByRole("button", { name: "Approve correction" }).click();
    await expect(page.getByRole("status")).toContainText("Correction approved:");
    const correctionId = (await db.query(`SELECT id FROM "PricingGapCorrection"`)).rows[0].id as string;
    expect((await approve()).status()).toBe(409);
    const later = await send("later-in-gap", "calls", "same-external", start);
    await expect.poll(async () => (await reconciliation()).find((row) => row.eventId === later)?.ratingState).toBe("UNRATED");
    expect((await approve({ eligibleEventIds: [later, inStart] })).status()).toBe(409);
    expect(await count("PricingGapCorrection")).toBe(1);
    expect(await count("RatedEvent")).toBe(before[0] + 2);
    expect((await reconciliation()).find((row) => row.eventId === later)?.ratingState).toBe("UNRATED");
    const correction = (await db.query(`SELECT * FROM "PricingGapCorrection" WHERE id=$1`, [correctionId])).rows[0];
    expect(correction).toMatchObject({ orgId: "gap-a", metricId: "gap-metric-a", billedCustomerId: "gap-customer-a", currency: "USD",
      reason: approval.reason, evidence: approval.evidence, approvedById: "gap-owner", affectedEventIds: [inStart, inLast], resultingRatingIds: [inStart, inLast] });
    expect(correction.reviewedAt).toBeInstanceOf(Date);
    expect(correction.reviewedAt.getTime()).toBeLessThanOrEqual(correction.approvedAt.getTime());
    expect(correction.start.toISOString()).toBe(start);
    expect(correction.end.toISOString()).toBe(end);
    expect(correction.approvedAt).toBeInstanceOf(Date);
    const ratings = (await db.query(`SELECT "eventId", amount::text, "priceVersionId", "correctionId", "unitPriceMicros"::text FROM "RatedEvent" WHERE "correctionId"=$1 ORDER BY "eventId"`, [correctionId])).rows;
    expect(ratings).toEqual([inStart, inLast].sort().map((eventId) => ({ eventId, amount: "2.470", priceVersionId: null, correctionId, unitPriceMicros: "1234567" })));
    expect(await count("PriceVersion")).toBe(before[2]);
    expect((await db.query(`SELECT "basePrice" FROM "Plan" WHERE id='gap-plan-a'`)).rows[0].basePrice).toBe(0);
    expect((await db.query(`SELECT total FROM "AggregatedUsage" WHERE id='gap-aggregate'`)).rows[0].total).toBe(11);
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE id='gap-invoice'`)).rows[0].amount).toBe(1234);
    expect((await db.query(`SELECT id, "basePrice" FROM "Plan" ORDER BY id`)).rows).toEqual([
      { id: "gap-plan-a", basePrice: 0 }, { id: "gap-plan-b", basePrice: 0 },
    ]);
    expect((await db.query(`SELECT id, total FROM "AggregatedUsage"`)).rows).toEqual([{ id: "gap-aggregate", total: 11 }]);
    expect((await db.query(`SELECT id, amount FROM "Invoice"`)).rows).toEqual([{ id: "gap-invoice", amount: 1234 }]);
    for (const [index, table] of legacyTables.entries()) {
      expect((await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows).toEqual(legacyRowsBefore[index]);
    }
    expect((await db.query(`SELECT id, "billingTreatment", "billedCustomerId" FROM "UsageEvent" WHERE id='gap-linked-legacy'`)).rows)
      .toEqual([{ id: "gap-linked-legacy", billingTreatment: "LEGACY", billedCustomerId: "gap-customer-a" }]);
    expect((await db.query(`SELECT count(*)::int AS n FROM "RatedEvent" WHERE "eventId"='gap-linked-legacy'`)).rows[0].n).toBe(0);
  } finally { await db.end(); }
});

test("viewer and outsider cannot preview", async ({ page }) => {
  const url = `${base}/api/organizations/gap-a/pricing-gap-preview?${new URLSearchParams({ metricId: "gap-metric-a", customerId: "gap-customer-a", start, end })}`;
  await signIn(page, "gap-viewer@example.test");
  expect((await page.request.get(url)).status()).toBe(403);
  await signIn(page, "gap-outsider@example.test");
  expect((await page.request.get(url)).status()).toBe(403);
});
