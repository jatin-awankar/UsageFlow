import { test, expect } from "@playwright/test";
test("public entry explains the product and opens an editable prepared demo", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every number has a story." }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic data · Local simulation", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore the demo" }).click();
  await expect(
    page.getByRole("heading", { name: "One customer. One month." }),
  ).toBeVisible();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
  await page.getByLabel("Quantity · API calls").fill("1500");
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
});

test("direct demo exposes baseline sources and guards every future action", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      !["GET", "HEAD"].includes(request.method()) ||
      new URL(request.url()).origin !== "http://127.0.0.1:3211"
    )
      requests.push(request.url());
  });
  await page.goto("/demo/?fixture=other&clock=2099&fault=true");
  for (const text of [
    "Northstar API",
    "Orbit Studio",
    "September 2026 · INR",
    "evt_demo_prior_01",
    "evt_demo_prior_02",
    "INR 25.00",
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  for (const [quantity, amount] of [
    ["6,000", "15.000"],
    ["4,000", "10.000"],
  ]) {
    await page
      .getByText(`Inspect ${quantity}-call source`, { exact: true })
      .click();
    await expect(
      page.getByText(`INR ${amount}`, { exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Accept event", exact: true }),
  ).toBeEnabled();
  for (const [chapter, action, evidence] of [
    [
      "02 Inspect pricing",
      "Process & rate event",
      "No visitor rating or contribution exists.",
    ],
    [
      "03 Monthly record",
      "Finalize monthly record",
      "No finalized version or outbound event exists.",
    ],
    [
      "04 Webhook delivery",
      "Simulate delivery",
      "No webhook event or delivery attempt exists.",
    ],
  ]) {
    await page.getByRole("button", { name: chapter, exact: false }).click();
    await expect(
      page.getByRole("button", { name: action, exact: true }),
    ).toBeDisabled();
    await expect(page.getByText(evidence, { exact: false })).toBeVisible();
  }
  expect(requests).toEqual([]);
});

test("quantity survives navigation and history, but resets on reload and is independent in tabs", async ({
  page,
  context,
}) => {
  await page.goto("/demo/");
  await page.getByLabel("Quantity · API calls").fill("1500");
  await page
    .getByRole("button", { name: "02 Inspect pricing", exact: false })
    .click();
  await page
    .getByRole("button", { name: "01 Accept usage", exact: false })
    .click();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
  await page.getByRole("link", { name: "Landing", exact: true }).click();
  await page.getByRole("link", { name: "Explore the demo" }).click();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
  await page.goBack();
  await page.goForward();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
  const other = await context.newPage();
  await other.goto("/demo/");
  await expect(other.getByLabel("Quantity · API calls")).toHaveValue("1250");
  await page.reload();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
});

test("keyboard skip, navigation, quantity, chapters and reset have visible focus", async ({
  page, browserName,
}) => {
  // macOS WebKit uses Option-Tab to include links in keyboard traversal.
  const tabKey = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const backTabKey = browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab";
  await page.goto("/");
  await page.keyboard.press(tabKey);
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press(tabKey);
  await expect(
    page.getByRole("link", { name: "Explore the demo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Quantity · API calls")).toBeVisible();
  // Starting at the skip link establishes a deterministic tab sequence on each engine.
  await page.goto("/demo/");
  await page.keyboard.press(tabKey);
  await page.keyboard.press("Enter");
  await page.keyboard.press(tabKey);
  await expect(
    page.getByRole("button", { name: "Reset demo", exact: true }),
  ).toBeFocused();
  await page.keyboard.press(tabKey);
  await page.keyboard.press(tabKey);
  await expect(
    page.getByRole("button", { name: "02 Inspect pricing", exact: false }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", {
    name: "The price at that moment.",
  });
  await expect(heading).toBeFocused();
  await expect(heading).toHaveCSS("outline-style", "solid");
  await expect(heading).toHaveCSS("outline-width", "3px");
  await page.keyboard.press(backTabKey);
  await page.keyboard.press(backTabKey);
  await page.keyboard.press(backTabKey);
  await page.keyboard.press(backTabKey);
  await expect(
    page.getByRole("button", { name: "01 Accept usage", exact: false }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "A little usage. A lasting record." }),
  ).toBeFocused();
  await page.keyboard.press(tabKey);
  await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("1500");
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
  await page.getByRole("button", { name: "Reset demo", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Reset demo", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Start fresh", exact: true })
    .press("Enter");
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
});

for (const width of [360, 768, 1440])
  test(`responsive ${width}px with reduced motion and visual evidence`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of ["/", "/demo/"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const name = `${route === "/" ? "landing" : "demo"}-${width}.png`;
      await page.screenshot({
        path: testInfo.outputPath(name),
        fullPage: true,
      });
      await testInfo.attach(name, {
        path: testInfo.outputPath(name),
        contentType: "image/png",
      });
    }
    for (const chapter of [
      "02 Inspect pricing",
      "03 Monthly record",
      "04 Webhook delivery",
    ]) {
      await page.getByRole("button", { name: chapter, exact: false }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("heading", { level: 2 }).first(),
      ).toBeFocused();
    }
  });

test('320px reflow retains the form, source disclosure and unobscured focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/demo/');
  await page.getByLabel('Quantity · API calls').focus();
  await expect(page.getByLabel('Quantity · API calls')).toHaveCSS('outline-width', '3px');
  await page.getByText('Inspect 6,000-call source', { exact: true }).press('Enter');
  await expect(page.getByText('INR 15.000', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const focused = await page.locator(':focus').boundingBox();
  expect(focused).not.toBeNull();
  expect(focused!.x).toBeGreaterThanOrEqual(5);
  expect(focused!.x + focused!.width).toBeLessThanOrEqual(315);
});
