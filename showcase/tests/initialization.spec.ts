import { test, expect } from "@playwright/test";

test("delayed initialization prevents partial acceptance", async ({ page }) => {
  test.skip(
    process.env.SHOWCASE_TEST_BUILD !== "1",
    "Isolated test build only",
  );
  await page.goto("/demo/?test-init=delay");
  await expect(page.getByRole("status")).toHaveText(
    "Preparing your local demo…",
  );
  await expect(
    page.getByRole("button", { name: "Accept event", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Accepted event evidence" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Quantity · API calls")).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await expect(
    page.getByText("Visitor events: 1", { exact: true }),
  ).toBeVisible();
});

for (const recovery of ["Retry initialization", "Reset initialization"]) {
  test(`recoverable initialization failure supports ${recovery}`, async ({
    page,
  }) => {
    test.skip(
      process.env.SHOWCASE_TEST_BUILD !== "1",
      "Isolated test build only",
    );
    await page.goto("/demo/?test-init=fail-once");
    await expect(
      page.getByRole("alert").filter({ hasText: "could not" }),
    ).toContainText("Your local demo could not be prepared");
    await expect(
      page.getByRole("button", { name: "Accept event", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("evt_demo_prior_01", { exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: recovery, exact: true }).click();
    await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
    await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
    await expect(
      page.getByText("Visitor events: 0", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .click();
    await expect(
      page.getByText("Visitor events: 1", { exact: true }),
    ).toBeVisible();
  });
}

test("normal build ignores initialization, fixture and clock parameters", async ({
  page,
}) => {
  test.skip(
    process.env.SHOWCASE_TEST_BUILD === "1",
    "Normal build isolation check",
  );
  await page.goto(
    "/demo/?test-init=fail-once&fixture=other&clock=2099&fault=true",
  );
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
  await expect(
    page.getByRole("button", { name: "Retry initialization" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Accepted event evidence" })
      .getByText("2026-09-28T14:32:02.000Z", { exact: true }),
  ).toBeVisible();
});
