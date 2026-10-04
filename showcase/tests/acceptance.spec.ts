import { test, expect } from "@playwright/test";

test("invalid demo quantities have associated feedback and cannot create evidence", async ({
  page,
}) => {
  await page.goto("/demo/");
  const quantity = page.getByLabel("Quantity · API calls");
  for (const value of ["", "0", "-1", "1.5", "hello", "10001"]) {
    await quantity.fill(value);
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .click();
    await expect(quantity).toHaveAttribute("aria-invalid", "true");
    await expect(quantity).toHaveAccessibleDescription(
      /Enter a whole number from 1 to 10,000/,
    );
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a whole number" }),
    ).toContainText("Enter a whole number");
    await expect(
      page.getByRole("region", { name: "Accepted event evidence" }),
    ).toHaveCount(0);
  }
});

for (const value of ["1", "10000", "1250"]) {
  test(`accept ${value} once and retain immutable evidence through rapid retries`, async ({
    page,
  }) => {
    const unexpectedRequests: string[] = [];
    page.on("request", (request) => {
      if (
        !["GET", "HEAD"].includes(request.method()) ||
        new URL(request.url()).origin !== "http://127.0.0.1:3211"
      )
        unexpectedRequests.push(request.url());
    });
    await page.goto("/demo/");
    await page.getByLabel("Quantity · API calls").fill(value);
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .dblclick();
    const evidence = page.getByRole("region", {
      name: "Accepted event evidence",
    });
    await expect(evidence).toBeVisible();
    for (const text of [
      "evt_demo_0125",
      "Orbit Studio · orbit_studio",
      "API_CALL",
      value,
      "2026-09-28T14:32:00.000Z",
      "2026-09-28T14:32:02.000Z",
      "PENDING",
      "LEDGER_PENDING",
      "Awaiting processing",
      "Not created",
    ]) {
      await expect(evidence.getByText(text, { exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Quantity · API calls")).toHaveAttribute(
      "readonly",
      "",
    );
    const original = await evidence.innerText();
    await page
      .getByRole("button", { name: "Retry identical event", exact: true })
      .dblclick();
    await page
      .getByRole("button", { name: "Retry identical event", exact: true })
      .click();
    await expect(evidence).toHaveText(original, { useInnerText: true });
    await expect(
      page.getByText("Identical retries: 3", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Visitor events: 1", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("2 events · 10,000 calls", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/UNRATED|NO_APPLICABLE_PRICE/)).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText(
      "Original event evt_demo_0125 returned",
    );
    expect(unexpectedRequests).toEqual([]);
  });
}

test("accepted run survives pages, chapters, disclosures and history; reload starts fresh", async ({
  page,
}) => {
  await page.goto("/demo/");
  await page.getByLabel("Quantity · API calls").fill("1500");
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "Retry identical event" }).click();
  const evidence = page.getByRole("region", {
    name: "Accepted event evidence",
  });
  const original = await evidence.innerText();
  await page.getByText("Inspect 6,000-call source", { exact: true }).click();
  await expect(evidence).toHaveText(original, { useInnerText: true });
  for (const chapter of [
    "02 Inspect pricing",
    "03 Monthly record",
    "04 Webhook delivery",
  ]) {
    await page.getByRole("button", { name: chapter }).click();
    await expect(
      page.getByText("Identical retries: 1", { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "Landing", exact: true }).click();
  await page.getByRole("link", { name: "Explore the demo" }).click();
  await expect(
    page.getByRole("button", { name: "04 Webhook delivery" }),
  ).toHaveAttribute("aria-current", "step");
  await page.goBack();
  await page.goForward();
  await page.getByRole("button", { name: "01 Accept usage" }).click();
  await expect(evidence).toHaveText(original, { useInnerText: true });
  await expect(
    page.getByText("Identical retries: 1", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
  await expect(evidence).toHaveCount(0);
  await expect(
    page.getByText("Visitor events: 0", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Identical retries: 0", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2 events · 10,000 calls", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  await expect(
    page.getByRole("region", { name: "Scenario time transition" }),
  ).toContainText("Current scenario time2026-09-28T14:32:02.000Z");
});

test("contexts and sibling tabs retain independent accepted runs after reset", async ({
  page,
  context,
  browser,
}) => {
  const separate = await browser.newContext();
  const sibling = await context.newPage();
  const stranger = await separate.newPage();
  try {
    for (const [tab, value] of [
      [page, "1"],
      [sibling, "10000"],
      [stranger, "1500"],
    ] as const) {
      await tab.goto("/demo/");
      await tab.getByLabel("Quantity · API calls").fill(value);
      await tab
        .getByRole("button", { name: "Accept event", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Retry identical event" }).click();
    for (const tab of [sibling, stranger])
      await expect(
        tab.getByText("Identical retries: 0", { exact: true }),
      ).toBeVisible();
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    await page
      .getByRole("button", { name: "Start fresh", exact: true })
      .click();
    await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
    await expect(sibling.getByLabel("Quantity · API calls")).toHaveValue(
      "10000",
    );
    await expect(stranger.getByLabel("Quantity · API calls")).toHaveValue(
      "1500",
    );
    for (const tab of [sibling, stranger])
      await expect(
        tab.getByText("Visitor events: 1", { exact: true }),
      ).toBeVisible();
  } finally {
    await separate.close();
    await sibling.close();
  }
});

test("keyboard validation, acceptance, retry and reset with containment and restored focus", async ({
  page,
  browserName,
}) => {
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const backTab = browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab";
  await page.goto("/demo/");
  await page.keyboard.press(tab);
  await page.keyboard.press("Enter"); // skip to main
  for (let i = 0; i < 6; i++) await page.keyboard.press(tab);
  const quantity = page.getByLabel("Quantity · API calls");
  await expect(quantity).toBeFocused();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("0");
  await page.keyboard.press(tab);
  await page.keyboard.press("Enter");
  await expect(quantity).toBeFocused();
  await expect(quantity).toHaveCSS("outline-width", "3px");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("1500");
  await page.keyboard.press(tab);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("accepted");
  await page.keyboard.press(tab);
  await expect(
    page.getByRole("button", { name: "Retry identical event" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Identical retry 1");
  // Back through the read-only input and four chapter controls to reset.
  for (let i = 0; i < 6; i++) await page.keyboard.press(backTab);
  const reset = page.getByRole("button", { name: "Reset demo", exact: true });
  await expect(reset).toBeFocused();
  const before = await page.getByRole("main").innerText();
  await page.keyboard.press("Enter");
  const cancel = page.getByRole("button", { name: "Keep exploring" });
  await expect(cancel).toBeFocused();
  await page.keyboard.press(backTab);
  await expect(
    page.getByRole("button", { name: "Start fresh", exact: true }),
  ).toBeFocused();
  await page.keyboard.press(tab);
  await expect(cancel).toBeFocused();
  // At the boundary, browsers may wrap or retain the last focused control.
  // In either case focus must remain contained within the dialog.
  await page.keyboard.press(tab);
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press(backTab);
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(reset).toBeFocused();
  await expect(page.getByRole("main")).toHaveText(before, {
    useInnerText: true,
  });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter"); // cancel
  await expect(reset).toBeFocused();
  await expect(page.getByRole("main")).toHaveText(before, {
    useInnerText: true,
  });
  await page.keyboard.press("Enter");
  await page.keyboard.press(backTab);
  await page.keyboard.press("Enter");
  await expect(quantity).toBeFocused();
  await expect(quantity).toHaveValue("1250");
  await expect(quantity).not.toHaveAttribute("readonly", "");
  await expect(page.getByRole("status")).toContainText("Demo reset");
  await expect(
    page.getByRole("region", { name: "Accepted event evidence" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Identical retries: 0", { exact: true }),
  ).toBeVisible();
});

test("reset from a later chapter preserves state on cancel and restores the first chapter on confirmation", async ({
  page,
}) => {
  await page.goto("/demo/");
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "Retry identical event" }).click();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  const before = await page.getByRole("main").innerText();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await expect(page.getByRole("main")).toHaveText(before, {
    useInnerText: true,
  });
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
  await expect(
    page.getByRole("button", { name: "01 Accept usage" }),
  ).toHaveAttribute("aria-current", "step");
  await expect(
    page.getByText("Visitor events: 0", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Identical retries: 0", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2 events · 10,000 calls", { exact: true }),
  ).toBeVisible();
});

for (const width of [320, 360, 768, 1440]) {
  test(`accepted evidence and reset at ${width}px with reduced motion`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo/");
    await page.getByLabel("Quantity · API calls").fill("10000");
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .click();
    await page.getByRole("button", { name: "Retry identical event" }).click();
    await expect(
      page.getByRole("region", { name: "Accepted event evidence" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: testInfo.outputPath(`accepted-${width}.png`),
      fullPage: true,
    });
    await testInfo.attach(`accepted-${width}`, {
      path: testInfo.outputPath(`accepted-${width}.png`),
      contentType: "image/png",
    });
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Keep exploring" }),
    ).toHaveCSS("outline-width", "3px");
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(1000);
    await page.screenshot({
      path: testInfo.outputPath(`reset-${width}.png`),
      fullPage: false,
    });
    await page
      .getByRole("button", { name: "Start fresh", exact: true })
      .press("Enter");
    await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
  });
}
