import { test, expect, type Page } from "@playwright/test";
async function finalize(page: Page, quantity = "1250") {
  await page.getByLabel("Quantity · API calls").fill(quantity);
  for (const name of [
    "Accept event",
    "02 Inspect pricing",
    "Process & rate event",
    "03 Monthly record",
    "Advance simulated time past close",
    "Finalize monthly record",
    "Approve simulated finalization",
    "04 Webhook delivery",
  ]) {
    await page
      .getByRole("button", { name, exact: !/^0/.test(name) })
      .press("Enter");
  }
}
test("delivery requires finalization and an explicit simulated attempt", async ({
  page,
}) => {
  await page.goto("/demo/");
  await page.getByRole("button", { name: "04 Webhook delivery" }).click();
  await expect(
    page.getByRole("button", { name: "Simulate delivery", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("No webhook event or delivery attempt exists", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "01 Accept usage" }).click();
  await finalize(page);
  const delivery = page.getByRole("region", {
    name: "Simulated webhook delivery",
  });
  await expect(delivery).toContainText("PENDING · No delivery attempt");
  await page
    .getByRole("button", { name: "Simulate delivery", exact: true })
    .press("Enter");
  await expect(delivery).toContainText("DELIVERED · Simulated success");
  await expect(delivery).toContainText("attempt_demo_1");
  await expect(page.getByRole("status")).toContainText(
    "No receiver request was sent",
  );
});

for (const [quantity, source, exactSource, total, amount] of [
  ["1250", "3.13", "3.130", "28.13", "28.130"],
  ["1500", "3.75", "3.750", "28.75", "28.750"],
])
  test(`${quantity}: exact payload and frozen references survive delivery, retries and navigation`, async ({
    page,
  }) => {
    const unexpected: string[] = [];
    page.on("request", (r) => {
      if (
        !["GET", "HEAD"].includes(r.method()) ||
        new URL(r.url()).origin !== "http://127.0.0.1:3211"
      )
        unexpected.push(r.url());
    });
    await page.goto("/demo/");
    await finalize(page, quantity);
    await page
      .getByText("Inspect webhook payload", { exact: true })
      .press("Enter");
    const payload = page.getByRole("region", { name: "Webhook payload JSON" });
    const original = await payload.innerText();
    expect(JSON.parse(original)).toEqual({
      organizationId: "org_demo_northstar",
      billingRecordId: "br_demo_sep_2026",
      customerId: "orbit_studio",
      periodStart: "2026-09-01T00:00:00.000Z",
      periodEnd: "2026-10-01T00:00:00.000Z",
      versionId: "brv_demo_sep_2026_1",
      version: 1,
      currency: "INR",
      amount,
    });
    await page
      .getByText("Inspect frozen version", { exact: true })
      .press("Enter");
    const frozen = await page.getByLabel("Frozen version JSON").innerText();
    const version = JSON.parse(frozen);
    expect(version).toMatchObject({
      id: "brv_demo_sep_2026_1",
      amount,
      lines: [
        {
          sourceEventIds: [
            "evt_demo_prior_01",
            "evt_demo_prior_02",
            "evt_demo_0125",
          ],
          amount,
        },
      ],
    });
    expect(version.ratedSources[2]).toMatchObject({
      eventId: "evt_demo_0125",
      amount: exactSource,
      price: { id: "pv_api_sep_01" },
    });
    await expect(
      page.getByText(
        `Frozen source evt_demo_0125: INR ${source} · exact ${exactSource}`,
      ),
    ).toBeVisible();
    await expect(page.getByText(`INR ${total}`, { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Simulate delivery", exact: true })
      .press("Enter");
    await page
      .getByRole("button", { name: "Simulate delivery", exact: true })
      .press("Enter");
    await page.getByRole("button", { name: "01 Accept usage" }).press("Enter");
    await page
      .getByRole("button", { name: "Retry identical event" })
      .press("Enter");
    await page.getByRole("link", { name: "Landing", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Every number has a story." }),
    ).toBeVisible();
    await page.goBack();
    await page
      .getByRole("button", { name: "04 Webhook delivery" })
      .press("Enter");
    await page
      .getByText("Inspect webhook payload", { exact: true })
      .press("Enter");
    await expect(payload).toHaveText(original);
    await page
      .getByText("Inspect frozen version", { exact: true })
      .press("Enter");
    await expect(page.getByLabel("Frozen version JSON")).toHaveText(frozen);
    await expect(
      page.getByText("Attempts: 1 · No HTTP request occurred."),
    ).toBeVisible();
    expect(unexpected).toEqual([]);
  });

test("no target never reports success; normal builds ignore fixture", async ({
  page,
}) => {
  await page.goto("/demo/?test-delivery=no-target");
  await finalize(page);
  const button = page.getByRole("button", {
    name: "Simulate delivery",
    exact: true,
  });
  if (process.env.SHOWCASE_TEST_BUILD === "1") {
    await expect(button).toBeDisabled();
    await expect(page.getByText(/NO_TARGET/)).toBeVisible();
    await expect(
      page.getByText("Successful simulated attempt", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Completion actions" }),
    ).toHaveCount(0);
  } else {
    await button.press("Enter");
    await expect(
      page.getByText("DELIVERED · Simulated success", { exact: true }),
    ).toBeVisible();
  }
});

for (const width of [360, 768, 1440])
  test(`keyboard delivery, completion and reset at ${width}px`, async ({
    page,
    context,
    browserName,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo/?test-delivery=contact");
    await finalize(page);
    await expect(
      page.getByRole("heading", { name: "A record your system can follow." }),
    ).toBeFocused();
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await page.keyboard.press(tab);
    await expect(
      page.getByText("Inspect selected synthetic endpoint", { exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("https://receiver.example.invalid/usageflow", {
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press(tab);
    await expect(
      page.getByText("Inspect webhook payload", { exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press(tab);
    await expect(
      page.getByRole("region", { name: "Webhook payload JSON" }),
    ).toBeFocused();
    await expect(
      page.getByRole("region", { name: "Webhook payload JSON" }),
    ).toHaveCSS("overflow-x", "auto");
    await page.keyboard.press(tab);
    await expect(
      page.getByRole("button", { name: "Simulate delivery", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(
      "Simulated delivery succeeded",
    );
    await page.keyboard.press(tab);
    const completion = page.getByRole("region", { name: "Completion actions" });
    await expect(completion).toContainText(
      "Pilot discussions are exploratory. Onboarding is subject to readiness review.",
    );
    const contact =
      process.env.SHOWCASE_TEST_BUILD === "1"
        ? page.getByRole("link", { name: "Discuss a pilot" })
        : page.getByRole("button", { name: "Discuss a pilot" });
    await expect(contact).toBeFocused();
    if (process.env.SHOWCASE_TEST_BUILD === "1")
      await expect(contact).toHaveAttribute(
        "href",
        "mailto:pilot@example.invalid",
      );
    else {
      await expect(contact).toBeDisabled();
      await expect(completion).toContainText("Publication remains blocked");
    }
    await page.keyboard.press(tab);
    await expect(
      page.getByRole("link", {
        name: "Inspect the implementation",
        exact: true,
      }),
    ).toBeFocused();
    await expect(
      page.getByRole("link", {
        name: "Inspect the implementation",
        exact: true,
      }),
    ).toHaveAttribute("href", "https://github.com/jatin-awankar/UsageFlow");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: info.outputPath(`delivery-${width}.png`),
      fullPage: true,
    });
    const other = await context.newPage();
    await other.goto("/demo/");
    await finalize(other, "1500");
    await other
      .getByRole("button", { name: "Simulate delivery", exact: true })
      .press("Enter");
    const reset = page.getByRole("button", { name: "Reset demo", exact: true });
    await reset.press("Enter");
    await expect(
      page.getByRole("button", { name: "Keep exploring" }),
    ).toBeFocused();
    await page.keyboard.press(tab);
    await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(reset).toBeFocused();
    await expect(
      page.getByText("Attempts: 1 · No HTTP request occurred."),
    ).toBeVisible();
    await reset.press("Enter");
    await page.getByRole("button", { name: "Start fresh" }).press("Enter");
    await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
    await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
    await expect(page.getByText("Visitor events: 0")).toBeVisible();
    await expect(page.getByText("Identical retries: 0")).toBeVisible();
    await page
      .getByRole("button", { name: "03 Monthly record" })
      .press("Enter");
    await expect(
      page.getByRole("region", { name: "Monthly BillingRecord draft" }),
    ).toContainText("Exact line total: INR 25.000");
    await expect(
      page.getByRole("region", { name: "Scenario time transition" }),
    ).toContainText("2026-09-28T14:32:02.000Z");
    await page
      .getByRole("button", { name: "04 Webhook delivery" })
      .press("Enter");
    await expect(
      page.getByRole("region", { name: "Finalized BillingRecord" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Successful simulated attempt", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Simulate delivery", exact: true }),
    ).toBeDisabled();
    await expect(
      other.getByText("DELIVERED · Simulated success", { exact: true }),
    ).toBeVisible();
    await other.close();
  });
