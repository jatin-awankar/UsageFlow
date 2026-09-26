import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { createHash } from "node:crypto";
import { processAggregation } from "../worker/processors/aggregateUsage";
import { processInvoice } from "../worker/processors/generateInvoice";

const baseURL = process.env.CUSTOMER_TEST_BASE_URL!;

test("Customer ingestion resolves within the API key Organization and never bills legacy usage", async ({ page, request }) => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await page.goto(`${baseURL}/login`);
    await page.getByPlaceholder("you@example.com").fill("owner@example.test");
    await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app/);

    for (const [orgId, externalId] of [["org-a", "shared-id"], ["org-b", "shared-id"], ["org-b", "other-only"], ["org-a", "inactive-id"]]) {
      await page.goto(`${baseURL}/app/${orgId}/customers`);
      await page.getByLabel("External customer ID").fill(externalId);
      await page.getByRole("button", { name: "Create customer" }).click();
      await expect(page.getByRole("status")).toHaveText("Customer created.");
    }
    await db.query(`UPDATE "Customer" SET active = false WHERE "orgId" = 'org-a' AND "externalId" = 'inactive-id'`);
    await db.query(`INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-a', 'Plan', 0, 'MONTHLY', 'org-a')`);
    await db.query(`INSERT INTO "Subscription" (id, status, "periodStart", "periodEnd", "orgId", "planId", "externalCustomerId") VALUES ('subscription-a', 'ACTIVE', '2026-09-01', '2026-10-01', 'org-a', 'plan-a', 'owner-user')`);
    await db.query(`INSERT INTO "Metric" (id, name, key, unit, "orgId") VALUES ('metric-a', 'Calls', 'CALLS', 'calls', 'org-a'), ('metric-b', 'Calls', 'CALLS', 'calls', 'org-b')`);
    for (const orgId of ["org-a", "org-b"]) {
      await db.query(`INSERT INTO "ApiKey" (id, name, "hashedKey", "orgId") VALUES ($1, 'Test', $2, $3)`, [`key-${orgId}`, createHash("sha256").update(`secret-${orgId}`).digest("hex"), orgId]);
    }

    let requestNumber = 0;
    const track = (orgId: string, customerId?: string) => request.post(`${baseURL}/api/track`, {
      headers: { "x-usageflow-api-key": `secret-${orgId}`, "idempotency-key": `customer-ingestion-${++requestNumber}` },
      data: { metric: "CALLS", amount: 3, timestamp: "2026-09-03T00:00:00.000Z", ...(customerId === undefined ? {} : { customerId }) },
    });
    const count = async () => Number((await db.query(`SELECT count(*)::int AS n FROM "UsageEvent"`)).rows[0].n);
    for (const customerId of [undefined, "", " ", " shared-id ", "unknown-id", "inactive-id", "other-only"]) {
      const before = await count();
      const response = await track("org-a", customerId);
      expect(response.status()).toBe(400);
      expect((await response.json()).error).toBe(customerId === undefined || !customerId.trim() || customerId !== customerId.trim()
        ? "Invalid payload" : "Unknown or inactive customer ID");
      expect(await count()).toBe(before);
    }
    const beforeNoSubscription = await count();
    const noSubscription = await track("org-b", "shared-id");
    expect(noSubscription.status()).toBe(403);
    expect(await noSubscription.json()).toEqual({ error: "No active subscription" });
    expect(await count()).toBe(beforeNoSubscription);

    await db.query(`INSERT INTO "Plan" (id, name, "basePrice", "billingPeriod", "orgId") VALUES ('plan-b', 'Plan', 0, 'MONTHLY', 'org-b')`);
    await db.query(`INSERT INTO "Subscription" (id, status, "periodStart", "periodEnd", "orgId", "planId") VALUES ('subscription-b', 'ACTIVE', '2026-09-01', '2026-10-01', 'org-b', 'plan-b')`);
    for (const orgId of ["org-a", "org-b"]) expect((await track(orgId, "shared-id")).status()).toBe(200);
    const rows = (await db.query(`SELECT e."orgId", e."subscriptionId", e."customerId", e."billedCustomerId", e."billingTreatment", e.timestamp::text AS "occurrenceTime", c."orgId" AS "customerOrgId" FROM "UsageEvent" e JOIN "Customer" c ON c.id = e."billedCustomerId" ORDER BY e."orgId"`)).rows;
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.customerId).toBe("shared-id");
      expect(row.billedCustomerId).toBeTruthy();
      expect(row.customerOrgId).toBe(row.orgId);
      expect(row.subscriptionId).toBe(`subscription-${row.orgId.slice(-1)}`);
      expect(row.billingTreatment).toBe("LEDGER_ONLY");
      expect(row.occurrenceTime).toBe("2026-09-03 00:00:00");
    }
    expect(rows[0].billedCustomerId).not.toBe(rows[1].billedCustomerId);
    await processAggregation({ orgId: "org-a", subscriptionId: "subscription-a" });
    expect(Number((await db.query(`SELECT count(*)::int AS n FROM "AggregatedUsage"`)).rows[0].n)).toBe(0);
    await db.query(`INSERT INTO "PlanMetric" (id, "includedUnits", "pricePerUnit", "planId", "metricId") VALUES ('plan-metric-a', 0, 10, 'plan-a', 'metric-a')`);
    await db.query(`INSERT INTO "UsageEvent" (id, "metricKey", amount, "customerId", timestamp, "orgId", "subscriptionId", "apiKeyId", "billingTreatment") VALUES ('later-legacy', 'CALLS', 2, 'unverified-legacy-id', '2026-09-03', 'org-a', 'subscription-a', 'key-org-a', 'LEGACY')`);
    await processAggregation({ orgId: "org-a", subscriptionId: "subscription-a" });
    const aggregate = (await db.query(`SELECT total FROM "AggregatedUsage" WHERE "orgId" = 'org-a' AND "subscriptionId" = 'subscription-a'`)).rows;
    expect(aggregate).toEqual([{ total: 2 }]);
    await processInvoice({ subscriptionId: "subscription-a" });
    expect((await db.query(`SELECT amount FROM "Invoice" WHERE "subscriptionId" = 'subscription-a'`)).rows).toEqual([{ amount: 20 }]);
    expect((await db.query(`SELECT to_regclass('"BillingRecord"') AS name`)).rows[0].name).toBeNull();
  } finally {
    await db.end();
  }
});
