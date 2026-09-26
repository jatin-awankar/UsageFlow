import { test, expect, type Page } from "@playwright/test";

const base = process.env.PRICE_TEST_BASE_URL!;
async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}
const path = `${base}/app/org-a/metrics/metric-a/pricing`;
async function submit(page: Page, price: string, currency = "USD", minutes = 10, metricPath = path) {
  await page.goto(metricPath);
  await page.getByLabel("Unit price").fill(price);
  await page.getByLabel("Currency").fill(currency);
  await page.getByLabel("Effective from (UTC, ISO 8601)").fill(new Date(Date.now() + minutes * 60_000).toISOString());
  await page.getByRole("button", { name: "Publish first price" }).click();
}
test("owner publishes exact maximum and inspects immutable evidence", async ({ page }) => {
  await signIn(page, "owner@example.test");
  await page.goto(`${base}/app/org-a/settings`);
  await page.getByLabel("ISO 4217 currency").fill("USD");
  await page.getByRole("button", { name: "Set currency" }).click();
  await page.goto(path);
  const publishForm = await page.locator("form").evaluate((form) => form.outerHTML);
  await submit(page, "999999.999999");
  await expect(page.getByText("Unit price: 999999.999999 USD")).toBeVisible();
  await expect(page.getByText(/Effective from \(UTC\): .*Z/)).toBeVisible();
  await expect(page.getByText("Published by: owner@example.test")).toBeVisible();
  await expect(page.getByText(/Published at \(UTC\): .*Z/)).toBeVisible();
  await page.evaluate((html) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.append(wrapper);
  }, publishForm);
  await page.getByLabel("Unit price").fill("1");
  await page.getByLabel("Effective from (UTC, ISO 8601)").fill(new Date(Date.now() + 900_000).toISOString());
  await page.getByRole("button", { name: "Publish first price" }).click();
  await expect(page.getByText("This metric already has a published first price.")).toBeVisible();
  await expect(page.getByText("Unit price: 999999.999999 USD")).toBeVisible();
  await page.goto(`${base}/app/org-a/settings`);
  await page.getByLabel("ISO 4217 currency").fill("EUR");
  await page.getByRole("button", { name: "Set currency" }).click();
  await expect(page.getByText("Published pricing locks this Organization's currency.")).toBeVisible();
  await expect(page.getByText("Current currency: USD.")).toBeVisible();
});
test("price boundaries, currency, and future guard reject without publication", async ({ page }) => {
  await signIn(page, "owner@example.test");
  for (const price of ["-1", "1.0000001", "1000000", "01", "1e2", "+1"]) {
    await submit(page, price, "USD", 10, `${base}/app/org-a/metrics/metric-boundary/pricing`);
    await expect(page.getByText("Enter a nonnegative unit price with at most six integer and six fractional digits.")).toBeVisible();
  }
  await submit(page, "1", "EUR", 10, `${base}/app/org-a/metrics/metric-boundary/pricing`);
  await expect(page.getByText("Price currency must match the Organization's explicit currency.")).toBeVisible();
  await submit(page, "1", "USD", 4, `${base}/app/org-a/metrics/metric-boundary/pricing`);
  await expect(page.getByText("Enter a UTC instant strictly later than server time plus five minutes.")).toBeVisible();
  await page.goto(`${base}/app/org-a/metrics/metric-zero/pricing`);
  await page.getByLabel("Unit price").fill("0");
  await page.getByLabel("Currency").fill("USD");
  await page.getByLabel("Effective from (UTC, ISO 8601)").fill(new Date(Date.now() + 600_000).toISOString());
  await page.getByRole("button", { name: "Publish first price" }).click();
  await expect(page.getByText("Unit price: 0.000000 USD")).toBeVisible();
});
test("admin and other Organization cannot publish or inspect", async ({ page, browser }) => {
  const owner = await browser.newPage();
  await signIn(owner, "owner@example.test");
  await owner.goto(`${base}/app/org-a/metrics/metric-boundary/pricing`);
  const form = await owner.locator("form").evaluate((element) => element.outerHTML);
  await owner.close();
  await signIn(page, "admin@example.test");
  await page.goto(`${base}/app/org-a/metrics/metric-boundary/pricing`);
  await expect(page.getByRole("button", { name: "Publish first price" })).toHaveCount(0);
  await page.evaluate((html) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.append(wrapper);
  }, form);
  await page.getByLabel("Unit price").fill("1");
  await page.getByLabel("Effective from (UTC, ISO 8601)").fill(new Date(Date.now() + 900_000).toISOString());
  await page.getByRole("button", { name: "Publish first price" }).click();
  await page.goto(`${base}/app/org-a/metrics/metric-boundary/pricing`);
  await expect(page.getByText("No published price.", { exact: false })).toBeVisible();
  await page.goto(`${base}/app/org-b/metrics/metric-a/pricing`);
  await expect(page.getByText(/Unit price:/)).toHaveCount(0);
});
