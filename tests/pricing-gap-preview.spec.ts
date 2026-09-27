import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const base = process.env.CUSTOMER_TEST_BASE_URL!;
const start = "2026-09-01T00:00:00.000Z";
const end = "2026-10-01T00:00:00.000Z";

async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("owner previews only exact Customer, metric, Organization and half-open UTC events without writes", async ({ page, request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const seed = async (id: string, orgId: string, customerId: string, metricId: string, at: string, reason = "NO_APPLICABLE_PRICE") => {
      const suffix = orgId === "gap-a" ? "a" : "b";
      await db.query(`INSERT INTO "UsageEvent" (id,"metricKey",amount,"billedCustomerId","billingTreatment","receivedAt","processingState",timestamp,"orgId","subscriptionId","apiKeyId","metricId") VALUES ($1,$2,2,$3,'LEDGER_ONLY',$4,'PROCESSED',$4,$5,$6,$7,$8)`, [id, metricId === "gap-other-metric" ? "OTHER" : "CALLS", customerId, at, orgId, `gap-sub-${suffix}`, `gap-key-${suffix}`, metricId]);
      await db.query(`INSERT INTO "UnratedEvent" ("eventId","orgId","billedCustomerId","metricId",reason) VALUES ($1,$2,$3,$4,$5)`, [id, orgId, customerId, metricId, reason]);
    };
    await seed("in-start", "gap-a", "gap-customer-a", "gap-metric-a", start);
    await seed("in-last", "gap-a", "gap-customer-a", "gap-metric-a", "2026-09-30T23:59:59.999Z");
    await seed("out-before", "gap-a", "gap-customer-a", "gap-metric-a", "2026-08-31T23:59:59.999Z");
    await seed("out-end", "gap-a", "gap-customer-a", "gap-metric-a", end);
    await seed("out-customer", "gap-a", "gap-other-a", "gap-metric-a", start);
    await seed("out-metric", "gap-a", "gap-customer-a", "gap-other-metric", start);
    await seed("out-org", "gap-b", "gap-customer-b", "gap-metric-b", start);
    const count = async (table: string) => Number((await db.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n);
    const before = [await count("RatedEvent"), await count("UnratedEvent"), await count("PriceVersion")];
    const url = (overrides: Record<string, string> = {}) => `${base}/api/organizations/gap-a/pricing-gap-preview?${new URLSearchParams({ metricId: "gap-metric-a", customerId: "gap-customer-a", start, end, ...overrides })}`;
    expect((await request.get(url())).status()).toBe(401);
    await signIn(page, "gap-owner@example.test");
    const response = await page.request.get(url());
    expect(response.status()).toBe(200);
    const preview = await response.json();
    expect(preview).toMatchObject({ orgId: "gap-a", metricId: "gap-metric-a", customerId: "gap-customer-a", externalCustomerId: "same-external", currency: "USD", start, end, eligibleEventIds: ["in-start", "in-last"] });
    expect(preview.events).toEqual([
      expect.objectContaining({ eventId: "in-start", occurredAt: start, quantity: 2, metric: "CALLS", ratingState: "UNRATED" }),
      expect.objectContaining({ eventId: "in-last", occurredAt: "2026-09-30T23:59:59.999Z", ratingReason: "NO_APPLICABLE_PRICE" }),
    ]);
    await page.goto(`${base}/app/gap-a/metrics/gap-metric-a/pricing/gap-preview?${new URLSearchParams({ customerId: "gap-customer-a", start, end })}`);
    await expect(page.getByRole("heading", { name: "Preview pricing gap for Calls" })).toBeVisible();
    await expect(page.getByText("Eligible UNRATED event IDs: in-start, in-last")).toBeVisible();
    const rejected: Record<string, string>[] = [
      { customerId: "gap-customer-b" }, { metricId: "gap-metric-b" },
      { start: end, end: "2026-10-02T00:00:00.000Z" },
      { start: "2026-09-30T23:59:59.999Z", end: "2026-10-01T00:00:00.001Z" },
      { start: end, end },
    ];
    for (const overrides of rejected) expect((await page.request.get(url(overrides))).status()).toBe(400);
    const otherCustomer = await page.request.get(url({ customerId: "gap-other-a" }));
    expect((await otherCustomer.json()).eligibleEventIds).toEqual(["out-customer"]);
    const otherOrg = await page.request.get(`${base}/api/organizations/gap-b/pricing-gap-preview?${new URLSearchParams({ metricId: "gap-metric-b", customerId: "gap-customer-b", start, end })}`);
    expect(otherOrg.status()).toBe(403);
    expect([await count("RatedEvent"), await count("UnratedEvent"), await count("PriceVersion")]).toEqual(before);
  } finally { await db.end(); }
});

test("viewer and outsider cannot preview", async ({ page }) => {
  const url = `${base}/api/organizations/gap-a/pricing-gap-preview?${new URLSearchParams({ metricId: "gap-metric-a", customerId: "gap-customer-a", start, end })}`;
  await signIn(page, "gap-viewer@example.test");
  expect((await page.request.get(url)).status()).toBe(403);
  await signIn(page, "gap-outsider@example.test");
  expect((await page.request.get(url)).status()).toBe(403);
});
