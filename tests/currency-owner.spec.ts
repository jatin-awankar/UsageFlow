import { test, expect, type Page } from "@playwright/test";

const baseURL = process.env.CURRENCY_TEST_BASE_URL!;
async function signIn(page: Page, email: string) {
  await page.goto(`${baseURL}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("owner sets and inspects explicit currency separately in each Organization", async ({ page }) => {
  await signIn(page, "owner@example.test");
  await page.goto(`${baseURL}/app/org-a/settings`);
  await page.getByLabel("ISO 4217 currency").fill("USD");
  await page.getByRole("button", { name: "Set currency" }).click();
  await expect(page.getByText("Current currency: USD.")).toBeVisible();
  await page.goto(`${baseURL}/app/org-b/settings`);
  await page.getByLabel("ISO 4217 currency").fill("JPY");
  await page.getByRole("button", { name: "Set currency" }).click();
  await expect(page.getByText("Current currency: JPY.")).toBeVisible();
});

test("invalid currency is rejected without changing the stored value", async ({ page }) => {
  await signIn(page, "owner@example.test");
  await page.goto(`${baseURL}/app/org-a/settings`);
  await page.getByLabel("ISO 4217 currency").fill("USD");
  await page.getByRole("button", { name: "Set currency" }).click();
  await page.getByLabel("ISO 4217 currency").fill("ZZZ");
  await page.getByRole("button", { name: "Set currency" }).click();
  await expect(page.getByText("Enter a valid uppercase ISO 4217 currency.")).toBeVisible();
  await expect(page.getByText("Current currency: USD.")).toBeVisible();
});

test("admin cannot set currency and another Organization's owner cannot inspect it", async ({ page }) => {
  await signIn(page, "admin@example.test");
  await page.goto(`${baseURL}/app/org-a/settings`);
  await expect(page.getByText(/Current currency:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Set currency" })).toHaveCount(0);
  await page.goto(`${baseURL}/app/org-b/settings`);
  await expect(page.getByText(/Current currency:/)).toHaveCount(0);
});

test("owner with no membership cannot inspect another Organization", async ({ page }) => {
  await signIn(page, "single@example.test");
  await page.goto(`${baseURL}/app/org-b/settings`);
  await expect(page.getByText(/Current currency:/)).toHaveCount(0);
});

test("server denies a forged owner form from an admin", async ({ browser }) => {
  const owner = await browser.newPage();
  await signIn(owner, "owner@example.test");
  await owner.goto(`${baseURL}/app/org-a/settings`);
  await owner.getByLabel("ISO 4217 currency").fill("USD");
  await owner.getByRole("button", { name: "Set currency" }).click();
  const html = await owner.locator("form").filter({ has: owner.getByLabel("ISO 4217 currency") }).evaluate((form) => form.outerHTML);
  await owner.close();

  const admin = await browser.newPage();
  await signIn(admin, "admin@example.test");
  await admin.goto(`${baseURL}/app/org-a/settings`);
  await admin.evaluate((formHtml) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = formHtml;
    document.body.append(wrapper);
  }, html);
  await admin.getByLabel("ISO 4217 currency").fill("EUR");
  const submission = admin.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/app/org-a/settings"));
  await admin.getByRole("button", { name: "Set currency" }).click();
  await submission;
  await admin.goto(`${baseURL}/app/org-a/settings`);
  await expect(admin.getByText("Current currency: USD.")).toBeVisible();
  await admin.close();
});
