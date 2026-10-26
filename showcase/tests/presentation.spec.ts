import { test, expect, type Page } from "@playwright/test";

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function prepareApproval(page: Page) {
  await page.goto("/demo/");
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "Next: Inspect pricing" }).click();
  await page.getByRole("button", { name: "Process & rate event", exact: true }).click();
  await page.getByRole("button", { name: "Next: Monthly record" }).click();
  await page.getByRole("button", { name: "Advance simulated time past close" }).click();
}

test("distinct page titles and comfortable standalone link targets", async ({ page }) => {
  for (const [route, title] of [["/", "UsageFlow — Every number has a story"], ["/demo/", "Guided demo — UsageFlow"], ["/evidence/", "Engineering evidence — UsageFlow"]]) {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
  }
  await page.goto("/");
  for (const name of ["View source code", "Engineering evidence", "Third-party notices"]) {
    const box = await page.getByRole("link", { name, exact: true }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("320px reflow, short dialogs and keyboard payload inspection", async ({ page, browserName }, info) => {
  await page.setViewportSize({ width: 320, height: 256 });
  for (const route of ["/", "/evidence/"]) {
    await page.goto(route);
    await noOverflow(page);
  }
  await prepareApproval(page);
  await page.getByRole("button", { name: "Finalize monthly record", exact: true }).press("Enter");
  const dialog = page.getByRole("dialog");
  const cancel = page.getByRole("button", { name: "Keep reviewing" });
  await expect(cancel).toBeFocused();
  const box = await cancel.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(256);
  expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("short-dialog.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Finalize monthly record", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Approve simulated finalization" }).press("Enter");
  await page.getByRole("button", { name: "Next: Webhook delivery" }).click();
  await page.getByText("Inspect webhook payload", { exact: true }).press("Enter");
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const payload = page.getByRole("region", { name: "Webhook payload JSON" });
  await expect(payload).toBeFocused();
  await expect(payload).toHaveCSS("outline-width", "3px");
  await expect(payload).toHaveCSS("outline-style", "solid");
  expect(await payload.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  expect(JSON.parse(await payload.innerText()).amount).toBe("28.130");
  await noOverflow(page);
  await page.getByRole("button", { name: "Reset demo", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Keep exploring" })).toBeFocused();
  await page.getByRole("button", { name: "Start fresh" }).press("Enter");
  await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
});

// Stress text independently of layout; this does not impersonate native browser zoom.
async function doubleText(page: Page) {
  await page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    const sizes = elements.map(e => parseFloat(getComputedStyle(e).fontSize));
    elements.forEach((e, i) => { e.style.fontSize = `${sizes[i] * 2}px`; });
  });
}

test("200 percent text stress retains pages, contact and approval controls", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const route of ["/", "/evidence/", "/demo/"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (route !== "/demo/") await page.getByRole("button", { name: "Contact Jatin" }).click();
    await doubleText(page);
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`text-200-${route.replaceAll("/", "") || "landing"}.png`), fullPage: true });
  }
  await prepareApproval(page);
  await page.getByRole("button", { name: "Finalize monthly record", exact: true }).click();
  await doubleText(page);
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Approve simulated finalization" }).click();
  await expect(page.getByRole("region", { name: "Finalized BillingRecord" })).toBeVisible();
});

test("touch emulation supports error correction, contact and reset", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://127.0.0.1:3211" });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Contact Jatin" }).tap();
  await expect(page.getByRole("region", { name: "Project contact details" })).toBeVisible();
  await page.getByRole("link", { name: "Try demo", exact: true }).tap();
  const quantity = page.getByLabel("Quantity · API calls");
  await quantity.fill("0");
  await page.getByRole("button", { name: "Accept event", exact: true }).tap();
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await expect(quantity).toBeFocused();
  await quantity.fill("1250");
  await page.getByRole("button", { name: "Accept event", exact: true }).tap();
  await expect(page.getByText("Visitor events: 1")).toBeVisible();
  await page.getByRole("button", { name: "Reset demo", exact: true }).tap();
  await page.getByRole("button", { name: "Start fresh" }).tap();
  await expect(quantity).toHaveValue("1250");
  await noOverflow(page);
  await context.close();
});
