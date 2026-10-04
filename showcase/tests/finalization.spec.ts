import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page, quantity = "1250") {
  await page.getByLabel("Quantity · API calls").fill(quantity);
  await page.getByRole("button", { name: "Accept event", exact: true }).click();
  await page.getByRole("button", { name: "02 Inspect pricing" }).click();
  await page
    .getByRole("button", { name: "Process & rate event", exact: true })
    .click();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  await page
    .getByRole("button", { name: "Advance simulated time past close" })
    .click();
}
async function approve(page: Page) {
  await page
    .getByRole("button", { name: "Finalize monthly record", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Approve simulated finalization",
      exact: true,
    })
    .click();
}
test("explicit owner approval freezes one linked version and pending event", async ({
  page,
}) => {
  await page.goto("/demo/");
  await ready(page);
  await expect(
    page.getByRole("region", { name: "Finalized BillingRecord" }),
  ).toHaveCount(0);
  await approve(page);
  const result = page.getByRole("region", { name: "Finalized BillingRecord" });
  await expect(result).toContainText(
    "Finalized versions: 1 · Outbound events: 1",
  );
  await expect(result).toContainText("INR 28.13");
  await expect(result).toContainText("Exact frozen total: INR 28.130");
  await result.getByText("Inspect frozen version", { exact: true }).click();
  await expect(result).toContainText('"amount": "28.130"');
  await expect(result).toContainText('"amount": "3.130"');
  await result
    .getByText("Inspect pending event payload", { exact: true })
    .click();
  await expect(result).toContainText('"versionId": "brv_demo_sep_2026_1"');
  await expect(result).toContainText("PENDING · No delivery attempt");
});

for (const [quantity, calls, sourceDisplay, sourceExact, total, exact] of [
  ["1250", "11,250", "3.13", "3.130", "28.13", "28.130"],
  ["1500", "11,500", "3.75", "3.750", "28.75", "28.750"],
])
  test(`${quantity}: repeats, retries and navigation preserve frozen references and amounts`, async ({
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
    await ready(page, quantity);
    // Retrying after close, before owner approval, cannot add usage.
    await page.getByRole("button", { name: "01 Accept usage" }).click();
    await page
      .getByRole("button", { name: "Retry identical event" })
      .dblclick();
    await page.getByRole("button", { name: "03 Monthly record" }).click();
    await page
      .getByRole("button", { name: "Finalize monthly record", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Approve simulated finalization",
        exact: true,
      })
      .dblclick();
    const result = page.getByRole("region", {
      name: "Finalized BillingRecord",
    });
    await expect(result).toContainText(`Accepted: 3 events · ${calls} calls`);
    await expect(result).toContainText(`Rated: 3 events · ${calls} calls`);
    await expect(
      result.getByText(`INR ${total}`, { exact: true }),
    ).toBeVisible();
    await expect(result).toContainText(
      `Frozen source evt_demo_0125: INR ${sourceDisplay} · exact ${sourceExact}`,
    );
    await result.getByText("Inspect frozen version", { exact: true }).click();
    await result
      .getByText("Inspect pending event payload", { exact: true })
      .click();
    const versionJSON = page.getByLabel("Frozen version JSON");
    const eventJSON = page.getByLabel("Pending event JSON");
    const version = await versionJSON.innerText();
    const event = await eventJSON.innerText();
    const parsed = JSON.parse(version);
    expect(parsed).toMatchObject({
      id: "brv_demo_sep_2026_1",
      amount: exact,
      approvedById: "owner_demo_simulated",
      finalizedAt: "2026-10-04T00:00:00.001Z",
      lines: [
        {
          id: "line_demo_api_sep_1",
          amount: exact,
          sourceEventIds: [
            "evt_demo_prior_01",
            "evt_demo_prior_02",
            "evt_demo_0125",
          ],
        },
      ],
    });
    expect(parsed.sourceEvents[2]).toMatchObject({
      id: "evt_demo_0125",
      quantity: Number(quantity),
      occurredAt: "2026-09-28T14:32:00.000Z",
    });
    expect(parsed.ratedSources[2]).toMatchObject({
      eventId: "evt_demo_0125",
      amount: sourceExact,
      price: {
        id: "pv_api_sep_01",
        unitPrice: "0.0025",
        effectiveFrom: "2026-09-01T00:00:00.000Z",
      },
    });
    expect(JSON.parse(event)).toMatchObject({
      id: "wh_demo_finalized_1",
      createdAt: "2026-10-04T00:00:00.001Z",
      type: "invoice.finalized",
      status: "PENDING",
      billingRecordVersionId: "brv_demo_sep_2026_1",
      payload: {
        versionId: "brv_demo_sep_2026_1",
        amount: exact,
        version: 1,
        currency: "INR",
      },
    });
    await page
      .getByRole("button", { name: "Finalize monthly record", exact: true })
      .press("Enter");
    await page
      .getByRole("button", { name: "Finalize monthly record", exact: true })
      .press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "01 Accept usage" }).click();
    await expect(page.getByLabel("Quantity · API calls")).toHaveAttribute(
      "readonly",
      "",
    );
    await page
      .getByRole("button", { name: "Retry identical event" })
      .dblclick();
    await page.getByRole("button", { name: "02 Inspect pricing" }).click();
    await page
      .getByRole("button", { name: "Process & rate event", exact: true })
      .press("Enter");
    await page.getByRole("button", { name: "03 Monthly record" }).click();
    await page.getByRole("link", { name: "Landing", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Every number has a story." }),
    ).toBeVisible();
    await page.goBack();
    await result.getByText("Inspect frozen version", { exact: true }).click();
    await result
      .getByText("Inspect pending event payload", { exact: true })
      .click();
    await expect(versionJSON).toHaveText(version);
    await expect(eventJSON).toHaveText(event);
    await expect(result).toContainText(
      "Finalized versions: 1 · Outbound events: 1",
    );
    await page.getByRole("button", { name: "04 Webhook delivery" }).click();
    await expect(
      page.getByRole("button", { name: "Simulate delivery" }),
    ).toBeDisabled();
    await expect(result).toContainText("PENDING · No delivery attempt");
    await expect(page.getByText(/delivered|delivery succeeded/i)).toHaveCount(
      0,
    );
    expect(writes).toEqual([]);
  });

for (const fixture of [
  "close-before",
  "close-exact",
  "pending",
  "processed",
  "inconsistent",
])
  test(`${fixture}: blocked activation creates neither version nor event`, async ({
    page,
  }) => {
    test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
    await page.goto(`/demo/?test-monthly=${fixture}`);
    await page.getByRole("button", { name: "03 Monthly record" }).click();
    const draft = page.getByRole("region", {
      name: "Monthly BillingRecord draft",
    });
    await expect(draft).toContainText(
      fixture.startsWith("close-") ? "OPEN" : "BLOCKED",
    );
    const approval = page.getByRole("button", {
      name: "Finalize monthly record",
      exact: true,
    });
    await expect(approval).toBeDisabled();
    // aria-disabled stays focusable so invoking it exercises the current eligibility guard.
    await approval.press("Enter");
    await approval.press("Space");
    await expect(page.getByRole("status")).toContainText(
      "Finalization blocked",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Finalized BillingRecord" }),
    ).toHaveCount(0);
    await expect(draft).toContainText(
      "No finalized version or outbound event exists",
    );
    await expect(page.getByText(/UNRATED|NO_APPLICABLE_PRICE/)).toHaveCount(0);
    if (["pending", "processed"].includes(fixture)) {
      await expect(
        page.getByRole("article", { name: "Source evt_demo_0125" }),
      ).toContainText(
        fixture === "pending"
          ? "PENDING / LEDGER_PENDING"
          : "PROCESSED / RATING_PENDING",
      );
      await page.getByRole("button", { name: "02 Inspect pricing" }).click();
      await page
        .getByRole("button", { name: "Process & rate event", exact: true })
        .click();
      await page.getByRole("button", { name: "03 Monthly record" }).click();
      await approve(page);
      await expect(
        page.getByRole("region", { name: "Finalized BillingRecord" }),
      ).toContainText("Exact frozen total: INR 28.130");
    }
  });

test("recoverable failure discards candidate version and event, retaining valid draft for reapproval", async ({
  page,
}) => {
  test.skip(process.env.SHOWCASE_TEST_BUILD !== "1", "Isolated build only");
  await page.goto("/demo/?test-finalization=fail-once");
  await ready(page);
  await approve(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "No version or event was created. Draft evidence is unchanged.",
  );
  await expect(
    page.getByRole("region", { name: "Finalized BillingRecord" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Monthly BillingRecord draft" }),
  ).toContainText("Exact line total: INR 28.130");
  await expect(
    page.getByRole("button", { name: "Finalize monthly record", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "04 Webhook delivery" }).click();
  await expect(
    page.getByText("No webhook event or delivery attempt exists", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  await approve(page);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Finalized BillingRecord" }),
  ).toContainText("Finalized versions: 1 · Outbound events: 1");
});

test("reset cancellation preserves finalization; confirmation resets only this tab", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await other.goto("/demo/");
  await ready(other, "1500");
  await approve(other);
  await page.goto("/demo/");
  await ready(page);
  await approve(page);
  const reset = page.getByRole("button", { name: "Reset demo", exact: true });
  await reset.click();
  await expect(page.getByRole("dialog")).toContainText(
    "frozen version, pending event",
  );
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await expect(reset).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Finalized BillingRecord" }),
  ).toContainText("Exact frozen total: INR 28.130");
  await reset.click();
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
  await expect(page.getByLabel("Quantity · API calls")).toBeEditable();
  await page.getByRole("button", { name: "03 Monthly record" }).click();
  await expect(
    page.getByRole("region", { name: "Finalized BillingRecord" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Monthly BillingRecord draft" }),
  ).toContainText("Exact line total: INR 25.000");
  await expect(
    page.getByRole("region", { name: "Scenario time transition" }),
  ).toContainText("Current scenario time2026-09-28T14:32:02.000Z");
  await expect(
    page.getByRole("region", { name: "Monthly BillingRecord draft" }),
  ).toContainText("No finalized version or outbound event exists");
  await expect(
    other.getByRole("region", { name: "Finalized BillingRecord" }),
  ).toContainText("Exact frozen total: INR 28.750");
  await other.close();
});

for (const width of [360, 768, 1440])
  test(`keyboard approval and result inspection at ${width}px with reduced motion`, async ({
    page,
    browserName,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo/");
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await page
      .getByRole("button", { name: "Accept event", exact: true })
      .press("Enter");
    await page
      .getByRole("button", { name: "Next: Inspect pricing" })
      .press("Enter");
    await page
      .getByRole("button", { name: "Process & rate event", exact: true })
      .press("Enter");
    await page
      .getByRole("button", { name: "Next: Monthly record" })
      .press("Enter");
    await expect(
      page.getByRole("heading", {
        name: "Close the month. Review the evidence.",
      }),
    ).toBeFocused();
    await page.keyboard.press(tab);
    await expect(
      page.getByRole("button", { name: "Advance simulated time past close" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press(tab);
    const approval = page.getByRole("button", {
      name: "Finalize monthly record",
      exact: true,
    });
    await expect(approval).toBeFocused();
    await expect(approval).toHaveCSS("outline-width", "3px");
    await page.keyboard.press("Enter");
    const cancel = page.getByRole("button", { name: "Keep reviewing" });
    const confirm = page.getByRole("button", {
      name: "Approve simulated finalization",
      exact: true,
    });
    await expect(cancel).toBeFocused();
    await page.screenshot({
      path: testInfo.outputPath(`approval-${width}.png`),
    });
    await testInfo.attach(`approval-${width}.png`, {
      path: testInfo.outputPath(`approval-${width}.png`),
      contentType: "image/png",
    });
    const reverseTab = browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab";
    await page.keyboard.press(reverseTab);
    await expect(confirm).toBeFocused();
    await page.keyboard.press(tab);
    await expect(cancel).toBeFocused();
    await page.keyboard.press(tab);
    await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(approval).toBeFocused();
    await expect(
      page.getByRole("region", { name: "Finalized BillingRecord" }),
    ).toHaveCount(0);
    await page.keyboard.press("Enter");
    await expect(cancel).toBeFocused();
    await page.keyboard.press(reverseTab);
    await page.keyboard.press("Enter");
    await expect(approval).toBeFocused();
    await expect(page.getByRole("status")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await expect(page.getByRole("status")).toContainText(
      "No delivery attempt, payment or tax invoice",
    );
    // The two disclosures precede approval in reading and keyboard order.
    await page.keyboard.press(reverseTab);
    await expect(
      page.getByText("Inspect pending event payload", { exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Pending event JSON")).toBeVisible();
    await page.keyboard.press(reverseTab);
    await expect(
      page.getByText("Inspect frozen version", { exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Frozen version JSON")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Enter"); // collapse lengthy JSON for the review capture
    await page.keyboard.press(tab);
    await page.keyboard.press("Enter");
    await page.keyboard.press(tab);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: testInfo.outputPath(`finalization-${width}.png`),
      fullPage: true,
    });
    await testInfo.attach(`finalization-${width}.png`, {
      path: testInfo.outputPath(`finalization-${width}.png`),
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

test("normal export ignores finalization fault configuration", async ({
  page,
}) => {
  test.skip(process.env.SHOWCASE_TEST_BUILD === "1", "Normal build only");
  await page.goto("/demo/?test-finalization=fail-once");
  await ready(page);
  await approve(page);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Finalized BillingRecord" }),
  ).toContainText("Exact frozen total: INR 28.130");
});
