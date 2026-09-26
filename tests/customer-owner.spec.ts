import { test, expect, type Page } from "@playwright/test";

const baseURL = process.env.CUSTOMER_TEST_BASE_URL!;

async function signIn(page: Page, email: string) {
  await page.goto(`${baseURL}/login`);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("TestPass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("one owner creates independent Customers with the same external ID in two Organizations", async ({ page }) => {
  await signIn(page, "owner@example.test");
  for (const orgId of ["org-a", "org-b"]) {
    await page.goto(`${baseURL}/app/${orgId}/customers`);
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    if (orgId === "org-b") {
      await expect(page.getByRole("listitem").filter({ hasText: "shared-id" })).toHaveCount(0);
    }
    await page.getByLabel("External customer ID").fill("shared-id");
    await page.getByRole("button", { name: "Create customer" }).click();
    await expect(page.getByRole("status")).toHaveText("Customer created.");
    await expect(page.getByRole("listitem").filter({ hasText: "shared-id" })).toBeVisible();
  }
});

test("duplicate and invalid external IDs show errors without adding a Customer", async ({ page }) => {
  await signIn(page, "owner@example.test");
  await page.goto(`${baseURL}/app/org-a/customers`);
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  await page.getByLabel("External customer ID").fill("duplicate-id");
  await page.getByRole("button", { name: "Create customer" }).click();
  await expect(page.getByRole("status")).toHaveText("Customer created.");
  await page.getByLabel("External customer ID").fill("duplicate-id");
  await page.getByRole("button", { name: "Create customer" }).click();
  await expect(page.getByText("This customer ID already exists in this organization.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "duplicate-id" })).toHaveCount(1);

  await page.getByLabel("External customer ID").fill(" padded ");
  await page.getByRole("button", { name: "Create customer" }).click();
  await expect(page.getByText("Enter a nonblank ID without surrounding whitespace.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "padded" })).toHaveCount(0);

  await page.getByLabel("External customer ID").fill(" ");
  await page.getByRole("button", { name: "Create customer" }).click();
  await expect(page.getByText("Enter a nonblank ID without surrounding whitespace.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "padded" })).toHaveCount(0);
});

test("a non-owner cannot create a Customer", async ({ page }) => {
  await signIn(page, "viewer@example.test");
  await page.goto(`${baseURL}/app/org-a/customers`);
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create customer" })).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "existing-id" })).toBeVisible();
});

test("the server denies a non-owner who submits the owner form", async ({ browser }) => {
  const owner = await browser.newPage();
  await signIn(owner, "owner@example.test");
  await owner.goto(`${baseURL}/app/org-a/customers`);
  const ownerForm = await owner.locator("form").filter({ has: owner.getByLabel("External customer ID") }).evaluate((form) => form.outerHTML);
  await owner.close();

  const viewer = await browser.newPage();
  await signIn(viewer, "viewer@example.test");
  await viewer.goto(`${baseURL}/app/org-a/customers`);
  await expect(viewer.getByRole("heading", { name: "Customers" })).toBeVisible();
  await viewer.evaluate((html) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.append(wrapper);
  }, ownerForm);
  await viewer.getByLabel("External customer ID").fill("forbidden-id");
  const submission = viewer.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/app/org-a/customers"));
  await viewer.getByRole("button", { name: "Create customer" }).click();
  await submission;
  await viewer.goto(`${baseURL}/app/org-a/customers`);
  await expect(viewer.getByRole("heading", { name: "Customers" })).toBeVisible();
  await expect(viewer.getByRole("listitem").filter({ hasText: "forbidden-id" })).toHaveCount(0);
  await viewer.close();
});
