import { test, expect, type Page } from "@playwright/test";

const base = process.env.PRICE_TEST_BASE_URL!;
const path = `${base}/app/org-a/metrics/metric-a/pricing`;
async function signIn(page: Page, email: string) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}
async function publish(page: Page, price: string, at: Date, button: string) {
  await page.goto(path);
  await page.getByLabel("Unit price").fill(price);
  await page.getByLabel("Currency").fill("USD");
  await page.getByLabel("Effective from (UTC, ISO 8601)").fill(at.toISOString());
  await page.getByRole("button", { name: button }).click();
  if (price !== "4") await expect(page.getByRole("status")).toHaveText("Price version published.");
}

test("owner publishes later immutable versions and sees half-open UTC intervals", async ({ page }) => {
  await signIn(page, "owner@example.test");
  await page.goto(`${base}/app/org-a/settings`);
  await page.getByLabel("ISO 4217 currency").fill("USD");
  await page.getByRole("button", { name: "Set currency" }).click();
  const first = new Date(Date.now() + 20 * 60_000);
  const second = new Date(first.getTime() + 1000);
  const third = new Date(second.getTime() + 1000);
  await publish(page, "1", first, "Publish first price");
  await publish(page, "2", second, "Publish scheduled price");
  await publish(page, "3", third, "Publish scheduled price");
  const entries = page.getByRole("article");
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText(`Effective from (UTC): ${first.toISOString()}`);
  await expect(entries.nth(0)).toContainText(`Applies until (UTC, exclusive): ${second.toISOString()}`);
  await expect(entries.nth(1)).toContainText(`Effective from (UTC): ${second.toISOString()}`);
  await expect(entries.nth(1)).toContainText(`Applies until (UTC, exclusive): ${third.toISOString()}`);
  await expect(entries.nth(2)).toContainText("No scheduled end");
  for (const [at, expected] of [
    [new Date(first.getTime() - 1), "No applicable price at this instant."],
    [first, "Applicable unit price: 1.000000 USD"],
    [new Date(second.getTime() - 1), "Applicable unit price: 1.000000 USD"],
    [second, "Applicable unit price: 2.000000 USD"],
    [new Date(second.getTime() + 1), "Applicable unit price: 2.000000 USD"],
    [third, "Applicable unit price: 3.000000 USD"],
  ] as const) {
    await page.goto(`${path}?at=${encodeURIComponent(at.toISOString())}`);
    await expect(page.getByRole("status")).toHaveText(expected);
  }
  for (const at of [second, new Date(second.getTime() - 1), new Date(second.getTime() + 1)]) {
    await publish(page, "4", at, "Publish scheduled price");
    await expect(page.getByText("The start must be later than every published version for this metric.")).toBeVisible();
  }
  await publish(page, "4", new Date(Date.now() + 4 * 60_000), "Publish scheduled price");
  await expect(page.getByText("Enter a UTC instant strictly later than server time plus five minutes.")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.goto(`${base}/app/org-b/metrics/metric-b/pricing`);
  await expect(page.getByText("No published price.", { exact: false })).toBeVisible();
});

test("other roles and Organizations cannot inspect or append the schedule", async ({ page, browser }) => {
  const owner = await browser.newPage();
  await signIn(owner, "owner@example.test");
  await owner.goto(path);
  const forgedForm = await owner.locator("form[method='POST']").evaluate((form) => form.outerHTML);
  await owner.close();
  await signIn(page, "admin@example.test");
  await page.goto(path);
  await expect(page.getByRole("button", { name: "Publish scheduled price" })).toHaveCount(0);
  await page.evaluate((html) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.append(wrapper);
  }, forgedForm);
  const forged = page.locator("form[method='POST']");
  await forged.getByLabel("Unit price").fill("9");
  await forged.getByLabel("Effective from (UTC, ISO 8601)").fill(new Date(Date.now() + 30 * 60_000).toISOString());
  await forged.getByRole("button", { name: "Publish scheduled price" }).click();
  await page.goto(path);
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.goto(`${base}/app/org-b/metrics/metric-b/pricing`);
  await expect(page).not.toHaveURL(/org-b\/metrics\/metric-b\/pricing/);
  await page.goto(`${base}/app/org-b/metrics/metric-a/pricing`);
  await expect(page).not.toHaveURL(/org-b\/metrics\/metric-a\/pricing/);
});
