import { test, expect } from "@playwright/test";

test("default event is explicitly rated with exact evidence", async ({
  page,
}) => {
  await page.goto("/demo/");
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "02 Inspect pricing" }).click();
  await page
    .getByRole("button", { name: "Process & rate event", exact: true })
    .click();
  const pricing = page.getByRole("region", {
    name: "Visitor pricing evidence",
  });
  await expect(pricing.getByText("INR 3.13", { exact: true })).toBeVisible();
  await pricing.getByText("Inspect event calculation", { exact: true }).click();
  await expect(
    pricing.getByText("1,250 × 0.0025 = 3.125", { exact: true }),
  ).toBeVisible();
  await expect(pricing.getByText("INR 3.130", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Current contribution total: INR 28.13", { exact: true }),
  ).toBeVisible();
});

for (const [quantity, product, display, exact, total] of [
  ["1500", "3.75", "3.75", "3.750", "28.750"],
  ["1", "0.0025", "0.00", "0.000", "25.000"],
  ["2", "0.005", "0.01", "0.010", "25.010"],
])
  test(`${quantity} calls retain independently specified rounded amounts`, async ({
    page,
  }) => {
    await page.goto("/demo/");
    await page.getByLabel("Quantity · API calls").fill(quantity);
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .click();
    const accepted = page.getByRole("region", {
      name: "Accepted event evidence",
    });
    await expect(accepted.getByText("PENDING", { exact: true })).toBeVisible();
    await expect(
      accepted.getByText("LEDGER_PENDING", { exact: true }),
    ).toBeVisible();
    await expect(
      accepted.getByText("Not created", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry identical event" }).click();
    await page.getByRole("button", { name: "02 Inspect pricing" }).click();
    await page
      .getByRole("button", { name: "Process & rate event", exact: true })
      .click();
    const pricing = page.getByRole("region", {
      name: "Visitor pricing evidence",
    });
    await pricing
      .getByText("Inspect event calculation", { exact: true })
      .click();
    for (const value of [
      `INR ${display}`,
      `INR ${exact}`,
      `Exact total: INR ${total}`,
    ])
      await expect(pricing.getByText(value, { exact: true })).toBeVisible();
    await expect(
      pricing.getByText(
        `${Number(quantity).toLocaleString("en-IN")} × 0.0025 = ${product}`,
        { exact: true },
      ),
    ).toBeVisible();
    const before = await pricing.innerText();
    await page
      .getByRole("button", { name: "Retry identical event" })
      .dblclick();
    expect(await pricing.innerText()).toBe(before);
    await expect(
      accepted.getByText("evt_demo_0125", { exact: true }),
    ).toBeVisible();
    await expect(
      accepted.getByText("PROCESSED", { exact: true }),
    ).toBeVisible();
    await expect(accepted.getByText("RATED", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Identical retries: 3", { exact: true }),
    ).toBeVisible();
  });

test("processed fixture is rating-pending with no contribution until explicit rating", async ({
  page,
}) => {
  test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
  await page.goto("/demo/?test-pricing=processed");
  await page.getByRole("button", { name: "02 Inspect pricing" }).click();
  const accepted = page.getByRole("region", {
    name: "Accepted event evidence",
  });
  await expect(accepted.getByText("PROCESSED", { exact: true })).toBeVisible();
  await expect(
    accepted.getByText("RATING_PENDING", { exact: true }),
  ).toBeVisible();
  await expect(
    accepted.getByText("Not created", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/NO_APPLICABLE_PRICE|UNRATED/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Process & rate event", exact: true })
    .click();
  await expect(accepted.getByText("RATED", { exact: true })).toBeVisible();
});

for (const timezoneId of ["UTC", "Asia/Kolkata"])
  test(`price selection follows occurrence across a later price boundary in ${timezoneId}`, async ({
    browser,
  }) => {
    test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date("2040-01-01T00:00:00Z"));
    await page.goto("/demo/?test-pricing=occurrence");
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .click();
    await page.getByRole("button", { name: "02 Inspect pricing" }).click();
    await page
      .getByRole("button", { name: "Process & rate event", exact: true })
      .click();
    const pricing = page.getByRole("region", {
      name: "Visitor pricing evidence",
    });
    await pricing
      .getByText("Inspect event calculation", { exact: true })
      .click();
    for (const value of [
      "pv_api_sep_01",
      "2026-09-01T00:00:00.000Z",
      "2026-09-28T14:32:00.000Z",
      "2026-10-02T00:00:00.000Z",
      "INR 0.0025 / API_CALL",
      "INR 3.130",
    ])
      await expect(pricing.getByText(value, { exact: true })).toBeVisible();
    await context.close();
  });

test("a recoverable rating action preserves accepted and baseline evidence", async ({
  page,
}) => {
  test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
  await page.goto("/demo/?test-pricing=fail-once");
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "02 Inspect pricing" }).click();
  const accepted = page.getByRole("region", {
    name: "Accepted event evidence",
  });
  const before = await accepted.innerText();
  await page.getByText("Inspect 6,000-call source", { exact: true }).click();
  await page.getByText("Inspect 4,000-call source", { exact: true }).click();
  const rate = page.getByRole("button", {
    name: "Process & rate event",
    exact: true,
  });
  await rate.press("Enter");
  await expect(
    page.getByRole("alert").filter({ hasText: "Prior evidence" }),
  ).toContainText("Prior evidence is unchanged");
  expect(await accepted.innerText()).toBe(before);
  await expect(rate).toBeFocused();
  await expect(page.getByText("INR 15.000", { exact: true })).toBeVisible();
  await expect(page.getByText("INR 10.000", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Inspect event calculation", { exact: true }),
  ).toHaveCount(0);
  await rate.press("Enter");
  await expect(
    page.getByRole("alert").filter({ hasText: "Prior evidence" }),
  ).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "processed and rated. Contribution INR 3.13",
  );
  await expect(accepted.getByText("RATED", { exact: true })).toBeVisible();
});

for (const width of [360, 768, 1440])
  test(`keyboard pricing and inline disclosures at ${width}px with reduced motion`, async ({
    page,
    browserName,
  }, testInfo) => {
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo/");
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .press("Enter");
    await page
      .getByRole("button", { name: "Next: Inspect pricing" })
      .press("Enter");
    await expect(
      page.getByRole("heading", { name: "The price at that moment." }),
    ).toBeFocused();
    await page.keyboard.press(tab);
    const rate = page.getByRole("button", {
      name: "Process & rate event",
      exact: true,
    });
    await expect(rate).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(rate).toBeFocused();
    await expect(rate).toHaveAttribute("aria-disabled", "true");
    await expect(rate).toHaveCSS("outline-width", "3px");
    await expect(page.getByRole("status")).toContainText(
      "Contribution INR 3.13",
    );
    // Re-activation cannot duplicate or recalculate evidence.
    await page.keyboard.press("Enter");
    await page.keyboard.press(tab);
    await expect(
      page.getByRole("button", { name: "Retry identical event" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press(tab); // Previous chapter
    await page.keyboard.press(tab); // Next chapter
    await page.keyboard.press(tab); // Margin inspector, next in reading order
    const disclosure = page.getByText("Inspect event calculation", {
      exact: true,
    });
    await expect(disclosure).toBeFocused();
    await page.keyboard.press("Enter");
    const pricing = page.getByRole("region", {
      name: "Visitor pricing evidence",
    });
    for (const text of [
      "pv_api_sep_01",
      "2026-09-01T00:00:00.000Z",
      "INR 0.0025 / API_CALL",
      "INR 3.130",
      "Rated sources: 3 · Rated calls: 11,250",
      "Exact total: INR 28.130",
    ])
      await expect(pricing.getByText(text, { exact: true })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(
      pricing.getByText("INR 3.130", { exact: true }),
    ).not.toBeVisible();
    await expect(disclosure).toBeFocused();
    await page.keyboard.press("Enter");
    for (const [calls, display, exact] of [
      ["6,000", "15.00", "15.000"],
      ["4,000", "10.00", "10.000"],
    ]) {
      await page.keyboard.press(tab);
      await expect(
        page.getByText(`Inspect ${calls}-call source`, { exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        page.getByText(`INR ${display}`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(`INR ${exact}`, { exact: true }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const focus = await page.locator(":focus").boundingBox();
    expect(focus!.x).toBeGreaterThanOrEqual(5);
    expect(focus!.x + focus!.width).toBeLessThanOrEqual(width - 5);
    const main = await page
      .getByRole("region", { name: "The price at that moment." })
      .boundingBox();
    const inspector = await pricing.boundingBox();
    if (width === 360)
      expect(inspector!.y).toBeGreaterThan(main!.y + main!.height);
    else expect(inspector!.x).toBeGreaterThan(main!.x + main!.width);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: testInfo.outputPath(`pricing-${width}.png`),
      fullPage: true,
    });
    await testInfo.attach(`pricing-${width}.png`, {
      path: testInfo.outputPath(`pricing-${width}.png`),
      contentType: "image/png",
    });
  });

test("rated evidence survives navigation and retry, and reset clears only this run", async ({
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
  await page.goto("/demo/");
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "02 Inspect pricing" }).click();
  await page
    .getByRole("button", { name: "Process & rate event", exact: true })
    .click();
  await page.getByRole("link", { name: "Landing", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every number has a story." }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByText("Exact total: INR 28.130", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "01 Accept usage" }).click();
  await page.getByRole("button", { name: "Retry identical event" }).click();
  await expect(
    page
      .getByRole("region", { name: "Accepted event evidence" })
      .getByText("INR 3.13", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await expect(page.getByText("RATED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
  await page.getByRole("button", { name: "02 Inspect pricing" }).click();
  await expect(
    page.getByText("Exact total: INR 25.000", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Inspect event calculation", { exact: true }),
  ).toHaveCount(0);
  expect(requests).toEqual([]);
});

for (const fixture of ["processed", "occurrence", "fail-once"])
  test(`normal build ignores pricing fixture ${fixture}`, async ({ page }) => {
    test.skip(process.env.SHOWCASE_TEST_BUILD === "1", "Normal build only");
    await page.goto(`/demo/?test-pricing=${fixture}`);
    await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
    await expect(
      page.getByText("Visitor events: 0", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .click();
    const accepted = page.getByRole("region", {
      name: "Accepted event evidence",
    });
    await expect(
      accepted.getByText("2026-09-28T14:32:02.000Z", { exact: true }),
    ).toBeVisible();
    await expect(accepted.getByText("PENDING", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "02 Inspect pricing" }).click();
    await page
      .getByRole("button", { name: "Process & rate event", exact: true })
      .click();
    await expect(
      page.getByText("Exact total: INR 28.130", { exact: true }),
    ).toBeVisible();
  });
