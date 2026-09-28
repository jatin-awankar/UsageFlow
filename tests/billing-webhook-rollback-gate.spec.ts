import { test, expect } from "@playwright/test";
import { Client } from "pg";

const base = process.env.CUSTOMER_TEST_BASE_URL!;

test("pre-delivery application keeps owner actions closed and preserves committed webhook evidence", async ({ page }) => {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill("upgrade@example.test");
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
  const url = `${base}/api/organizations/upgrade-org/billing-records`;
  for (const action of ["finalize", "revise"]) {
    const response = await page.request.post(url, {
      data: { action, month: "2026-08", billedCustomerId: "upgrade-customer" },
    });
    expect(response.status()).toBe(404);
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const counts = (await db.query(`SELECT
      (SELECT count(*)::int FROM "BillingRecordVersion") AS versions,
      (SELECT count(*)::int FROM "WebhookEvent") AS events,
      (SELECT count(*)::int FROM "WebhookDelivery") AS attempts,
      (SELECT count(*)::int FROM "BillingWebhookWork") AS pending_work`)).rows[0];
    expect(counts).toEqual({ versions: 1, events: 2, attempts: 1, pending_work: 1 });
    expect((await db.query(`SELECT status, "responseCode" FROM "WebhookDelivery" WHERE id='upgrade-attempt'`)).rows[0])
      .toEqual({ status: "FAILED", responseCode: 500 });
  } finally {
    await db.end();
  }
});
