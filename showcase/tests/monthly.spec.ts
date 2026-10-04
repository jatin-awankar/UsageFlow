import { test, expect, type Page } from "@playwright/test";
async function review(page: Page, quantity = "1250") {
  await page.getByLabel("Quantity · API calls").fill(quantity);
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "02 Inspect pricing" }).click();
  await page
    .getByRole("button", { name: "Process & rate event", exact: true })
    .click();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
}
test("default monthly draft reconciles inspectable source and line evidence", async ({
  page,
}) => {
  await page.goto("/demo/");
  await review(page);
  const draft = page.getByRole("region", {
    name: "Monthly BillingRecord draft",
  });
  await expect(
    draft.getByText("Accepted: 3 events · 11,250 calls", { exact: true }),
  ).toBeVisible();
  await expect(
    draft.getByText("Rated: 3 events · 11,250 calls", { exact: true }),
  ).toBeVisible();
  await expect(draft.getByText("INR 28.13", { exact: true })).toBeVisible();
  await expect(
    draft.getByText("Exact line total: INR 28.130", { exact: true }),
  ).toBeVisible();
  await page.getByText("Inspect source evt_demo_0125", { exact: true }).click();
  const source = page.getByRole("article", { name: "Source evt_demo_0125" });
  await expect(source.getByText("INR 3.13", { exact: true })).toBeVisible();
  await expect(source.getByText("INR 3.130", { exact: true })).toBeVisible();
  await expect(
    draft.getByText(
      "Reconciled: accepted and rated sources, counts, quantities and exact contributions agree.",
      { exact: true },
    ),
  ).toBeVisible();
});

for (const [quantity, calls, contribution, exact, total, totalExact] of [
  ["1500", "11,500", "3.75", "3.750", "28.75", "28.750"],
  ["1", "10,001", "0.00", "0.000", "25.00", "25.000"],
  ["2", "10,002", "0.01", "0.010", "25.01", "25.010"],
])
  test(`${quantity} calls retain independently specified event and monthly amounts`, async ({
    page,
  }) => {
    await page.goto("/demo/");
    await review(page, quantity);
    const draft = page.getByRole("region", {
      name: "Monthly BillingRecord draft",
    });
    await expect(
      draft.getByText(`Accepted: 3 events · ${calls} calls`, { exact: true }),
    ).toBeVisible();
    await expect(
      draft.getByText(`Rated: 3 events · ${calls} calls`, { exact: true }),
    ).toBeVisible();
    await expect(
      draft.getByText(`INR ${total}`, { exact: true }),
    ).toBeVisible();
    await expect(
      draft.getByText(`Exact line total: INR ${totalExact}`, { exact: true }),
    ).toBeVisible();
    await expect(
      draft.getByText(`Exact BillingRecord total: INR ${totalExact}`, {
        exact: true,
      }),
    ).toBeVisible();
    const source = page.getByRole("article", { name: "Source evt_demo_0125" });
    await source
      .getByText("Inspect source evt_demo_0125", { exact: true })
      .click();
    await expect(
      source.getByText(`INR ${contribution}`, { exact: true }),
    ).toBeVisible();
    await expect(
      source.getByText(`INR ${exact}`, { exact: true }),
    ).toBeVisible();
  });

test("explicit time jump preserves evidence, announces readiness and creates no approval or outbound event", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      !["GET", "HEAD"].includes(request.method()) ||
      new URL(request.url()).origin !== "http://127.0.0.1:3211"
    )
      writes.push(request.url());
  });
  await page.goto("/demo/");
  await review(page);
  const draft = page.getByRole("region", {
    name: "Monthly BillingRecord draft",
  });
  await expect(draft.getByText("OPEN", { exact: true })).toBeVisible();
  const clock = page.getByRole("region", { name: "Scenario time transition" });
  await expect(
    clock.getByText("2026-09-28T14:32:02.000Z", { exact: true }),
  ).toHaveCount(2);
  await expect(
    clock.getByText("2026-10-04T00:00:00.001Z", { exact: true }),
  ).toBeVisible();
  await expect(clock).toContainText(
    "without waiting or changing your wall clock",
  );
  await page
    .getByRole("button", { name: "Advance simulated time past close" })
    .click();
  await expect(
    draft.getByText("READY_FOR_REVIEW", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "from 2026-09-28T14:32:02.000Z to 2026-10-04T00:00:00.001Z. Draft READY_FOR_REVIEW",
  );
  await expect(
    page.getByRole("button", { name: "Finalize monthly record" }),
  ).toBeDisabled();
  await expect(draft).toContainText(
    "No finalized version or outbound event exists",
  );
  await page.getByRole("button", { name: "01 Accept usage" }).click();
  await page.getByRole("button", { name: "Retry identical event" }).click();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  await expect(
    draft.getByText("Exact line total: INR 28.130", { exact: true }),
  ).toBeVisible();
  await expect(
    draft.getByText("Accepted: 3 events · 11,250 calls", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Landing", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every number has a story." }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    draft.getByText("READY_FOR_REVIEW", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  await expect(draft.getByText("OPEN", { exact: true })).toBeVisible();
  await expect(
    draft.getByText("Exact line total: INR 25.000", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

test("round each event before summing: 6,001 + 4,001 + 1 never becomes INR 25.01", async ({
  page,
}) => {
  test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
  await page.goto("/demo/?test-monthly=rounding");
  await review(page, "1");
  const draft = page.getByRole("region", {
    name: "Monthly BillingRecord draft",
  });
  await expect(
    draft.getByText("Accepted: 3 events · 10,003 calls", { exact: true }),
  ).toBeVisible();
  await expect(
    draft.getByText("Rated: 3 events · 10,003 calls", { exact: true }),
  ).toBeVisible();
  await expect(draft.getByText("INR 25.00", { exact: true })).toBeVisible();
  await expect(
    draft.getByText("Exact line total: INR 25.000", { exact: true }),
  ).toBeVisible();
  for (const [id, calls, exact] of [
    ["evt_demo_prior_01", "6,001", "15.000"],
    ["evt_demo_prior_02", "4,001", "10.000"],
    ["evt_demo_0125", "1", "0.000"],
  ]) {
    const source = page.getByRole("article", { name: `Source ${id}` });
    await source.getByText(`Inspect source ${id}`, { exact: true }).click();
    await expect(
      source.getByRole("heading", { name: `${calls} calls`, exact: true }),
    ).toBeVisible();
    await expect(
      source.getByText(`INR ${exact}`, { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Advance simulated time past close" })
    .click();
  await expect(
    draft.getByText("READY_FOR_REVIEW", { exact: true }),
  ).toBeVisible();
});

test("half-open occurrence month ignores differing receipt dates", async ({
  page,
}) => {
  test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
  await page.goto("/demo/?test-monthly=month-boundaries");
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  const draft = page.getByRole("region", {
    name: "Monthly BillingRecord draft",
  });
  await expect(
    draft.getByText("Accepted: 2 events · 10,000 calls", { exact: true }),
  ).toBeVisible();
  await expect(
    draft.getByText("Rated: 2 events · 10,000 calls", { exact: true }),
  ).toBeVisible();
  await expect(
    draft.getByText("Exact line total: INR 25.000", { exact: true }),
  ).toBeVisible();
  for (const [id, occurred] of [
    ["evt_demo_prior_01", "2026-09-01T00:00:00.000Z"],
    ["evt_demo_prior_02", "2026-09-30T23:59:59.999Z"],
  ]) {
    const source = page.getByRole("article", { name: `Source ${id}` });
    await source.getByText(`Inspect source ${id}`, { exact: true }).click();
    await expect(source.getByText(occurred, { exact: true })).toBeVisible();
    await expect(
      source.getByText("2026-10-02T12:00:00.000Z", { exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("region", { name: "Monthly source evidence" }),
  ).toContainText(
    "evt_oct_boundary · 100 calls · occurred 2026-10-01T00:00:00.000Z",
  );
  await expect(
    page.getByText("Inspect source evt_oct_boundary", { exact: true }),
  ).toHaveCount(0);
});

for (const timezoneId of ["UTC", "Asia/Kolkata"])
  for (const [fixture, instant, state] of [
    ["close-before", "2026-10-03T23:59:59.999Z", "OPEN"],
    ["close-exact", "2026-10-04T00:00:00.000Z", "OPEN"],
    ["close-after", "2026-10-04T00:00:00.001Z", "READY_FOR_REVIEW"],
  ])
    test(`${fixture} in ${timezoneId} is independent of wall clock`, async ({
      browser,
    }) => {
      test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();
      await page.clock.setFixedTime(
        new Date(
          timezoneId === "UTC"
            ? "2040-01-01T00:00:00Z"
            : "2000-01-01T00:00:00Z",
        ),
      );
      await page.goto(`/demo/?test-monthly=${fixture}`);
      await page.getByRole("button", { name: "03 Monthly record" }).click();
      await expect(
        page
          .getByRole("region", { name: "Monthly BillingRecord draft" })
          .getByText(state, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Scenario time transition" }),
      ).toContainText(`Current scenario time${instant}`);
      await expect(
        page.getByRole("button", { name: "Finalize monthly record" }),
      ).toBeDisabled();
      await expect(
        page.getByText(/No finalized version or outbound event exists/),
      ).toBeVisible();
      await context.close();
    });

for (const fixture of ["pending", "processed"])
  test(`after-close ${fixture} evidence stays blocked until explicit processing/rating`, async ({
    page,
  }) => {
    test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
    await page.goto(`/demo/?test-monthly=${fixture}`);
    await page.getByRole("button", { name: "03 Monthly record" }).click();
    const draft = page.getByRole("region", {
      name: "Monthly BillingRecord draft",
    });
    const source = page.getByRole("article", { name: "Source evt_demo_0125" });
    await expect(draft.getByText("BLOCKED", { exact: true })).toBeVisible();
    await expect(source).toContainText(
      fixture === "pending"
        ? "PENDING / LEDGER_PENDING"
        : "PROCESSED / RATING_PENDING",
    );
    await expect(source).toContainText("No contribution yet");
    await expect(source.getByText(/INR/)).toHaveCount(0);
    await expect(page.getByText(/UNRATED|NO_APPLICABLE_PRICE/)).toHaveCount(0);
    await expect(
      draft.getByText("Accepted: 3 events · 11,250 calls", { exact: true }),
    ).toBeVisible();
    await expect(
      draft.getByText("Rated: 2 events · 10,000 calls", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Advance simulated time past close" })
      .press("Enter");
    await page.getByRole("button", { name: "02 Inspect pricing" }).click();
    await page.getByRole("button", { name: "03 Monthly record" }).click();
    await expect(draft.getByText("BLOCKED", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Finalize monthly record" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "02 Inspect pricing" }).click();
    await page
      .getByRole("button", { name: "Process & rate event", exact: true })
      .click();
    await page.getByRole("button", { name: "03 Monthly record" }).click();
    await expect(
      draft.getByText("READY_FOR_REVIEW", { exact: true }),
    ).toBeVisible();
    await expect(
      draft.getByText("Exact line total: INR 28.130", { exact: true }),
    ).toBeVisible();
  });

test("inconsistent rated evidence cannot become ready just because counts agree", async ({
  page,
}) => {
  test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
  await page.goto("/demo/?test-monthly=inconsistent");
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  const draft = page.getByRole("region", {
    name: "Monthly BillingRecord draft",
  });
  await expect(
    draft.getByText("Rated: 3 events · 11,250 calls", { exact: true }),
  ).toBeVisible();
  await expect(draft.getByText("BLOCKED", { exact: true })).toBeVisible();
  await expect(draft).toContainText("Not reconciled");
});

for (const width of [360, 768, 1440])
  test(`monthly keyboard review, announcements and reduced motion at ${width}px`, async ({
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
    await expect(
      page.getByRole("button", { name: "Process & rate event", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(
      "processed and rated. Contribution INR 3.13",
    );
    await page
      .getByRole("button", { name: "Next: Monthly record" })
      .press("Enter");
    await expect(
      page.getByRole("heading", {
        name: "Close the month. Review the evidence.",
      }),
    ).toBeFocused();
    await page.keyboard.press(tab);
    const advance = page.getByRole("button", {
      name: "Advance simulated time past close",
    });
    await expect(advance).toBeFocused();
    await expect(advance).toHaveCSS("outline-width", "3px");
    await page.keyboard.press("Enter");
    await expect(advance).toBeFocused();
    await expect(advance).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("status")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await expect(page.getByRole("status")).toContainText(
      "Draft READY_FOR_REVIEW",
    );
    await page.keyboard.press(tab); // Previous
    await page.keyboard.press(tab); // Next
    for (const id of [
      "evt_demo_prior_01",
      "evt_demo_prior_02",
      "evt_demo_0125",
    ]) {
      await page.keyboard.press(tab);
      const disclosure = page.getByText(`Inspect source ${id}`, {
        exact: true,
      });
      await expect(disclosure).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        page
          .getByRole("article", { name: `Source ${id}` })
          .getByText("pv_api_sep_01", { exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Space");
      await expect(
        page
          .getByRole("article", { name: `Source ${id}` })
          .getByText("pv_api_sep_01", { exact: true }),
      ).not.toBeVisible();
      await expect(disclosure).toBeFocused();
    }
    await page.keyboard.press("Enter");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const focus = await page.locator(":focus").boundingBox();
    expect(focus!.x).toBeGreaterThanOrEqual(5);
    expect(focus!.x + focus!.width).toBeLessThanOrEqual(width - 5);
    const main = await page
      .getByRole("region", { name: "Close the month. Review the evidence." })
      .boundingBox();
    const sources = await page
      .getByRole("region", { name: "Monthly source evidence" })
      .boundingBox();
    if (width === 360)
      expect(sources!.y).toBeGreaterThan(main!.y + main!.height);
    else expect(sources!.x).toBeGreaterThan(main!.x + main!.width);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: testInfo.outputPath(`monthly-${width}.png`),
      fullPage: true,
    });
    await testInfo.attach(`monthly-${width}.png`, {
      path: testInfo.outputPath(`monthly-${width}.png`),
      contentType: "image/png",
    });
    if (width === 360) {
      await page.setViewportSize({ width: 320, height: 800 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });

for (const fixture of [
  "rounding",
  "month-boundaries",
  "close-before",
  "close-exact",
  "close-after",
  "pending",
  "processed",
  "inconsistent",
])
  test(`normal export ignores monthly fixture ${fixture}`, async ({ page }) => {
    test.skip(process.env.SHOWCASE_TEST_BUILD === "1", "Normal build only");
    await page.goto(
      `/demo/?test-monthly=${fixture}&test-clock=2026-10-04T00:00:00.001Z`,
    );
    await page.getByRole("button", { name: "03 Monthly record" }).click();
    const draft = page.getByRole("region", {
      name: "Monthly BillingRecord draft",
    });
    await expect(draft.getByText("OPEN", { exact: true })).toBeVisible();
    await expect(
      draft.getByText("Accepted: 2 events · 10,000 calls", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Scenario time transition" }),
    ).toContainText("Current scenario time2026-09-28T14:32:02.000Z");
    await expect(page.getByRole("textbox")).toHaveCount(0);
  });

test("public time transition cannot resolve accepted pending usage", async ({
  page,
}) => {
  await page.goto("/demo/");
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  const draft = page.getByRole("region", {
    name: "Monthly BillingRecord draft",
  });
  await expect(draft.getByText("OPEN", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Advance simulated time past close" })
    .click();
  await expect(draft.getByText("BLOCKED", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Draft BLOCKED");
  const source = page.getByRole("article", { name: "Source evt_demo_0125" });
  await expect(source).toContainText("PENDING / LEDGER_PENDING");
  await expect(source).toContainText("No contribution yet");
  await expect(
    draft.getByText("Exact line total: INR 25.000", { exact: true }),
  ).toBeVisible();
});
