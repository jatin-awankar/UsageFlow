import { test, expect } from "@playwright/test";
import { Client } from "pg";

const base = process.env.CUSTOMER_TEST_BASE_URL!;

test("deployed finalization gate keeps the owner action closed", async ({ page }) => {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill("gate@example.test");
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
  const response = await page.request.post(`${base}/api/organizations/gate-org/billing-records`, {
    data: { action: "finalize", month: "2024-02", billedCustomerId: "gate-customer" },
  });
  expect(response.status()).toBe(404);
  const revision = await page.request.post(`${base}/api/organizations/gate-org/billing-records`, {
    data: { action: "revise", month: "2024-02", billedCustomerId: "gate-customer" },
  });
  expect(revision.status()).toBe(404);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordVersion"`)).rows[0].n).toBe(0);
    expect((await db.query(`SELECT count(*)::int AS n FROM "WebhookEvent"`)).rows[0].n).toBe(0);
    expect((await db.query(`SELECT count(*)::int AS n FROM "BillingRecordAdjustment"`)).rows[0].n).toBe(0);
  } finally { await db.end(); }
});
