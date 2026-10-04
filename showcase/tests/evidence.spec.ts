import { test, expect } from "@playwright/test";

const snapshot =
  "https://github.com/jatin-awankar/UsageFlow/blob/f6adc01f89a620d5a42d5790a759ff95af165d69/";
const destinations = [
  ["Read the domain glossary", "CONTEXT.md"],
  ["Inspect ingestion and retry handling", "app/api/track/route.ts"],
  ["Inspect occurrence-time rating", "worker/processors/rateCustomerEvent.ts"],
  ["Inspect exact money arithmetic", "lib/money-contract.ts"],
  ["Inspect monthly reconciliation", "lib/billing-record-calculation.ts"],
  ["Inspect atomic finalization", "lib/billing-record-finalization.ts"],
  ["Inspect delivery status semantics", "lib/webhooks/billing-status.ts"],
  ["Inspect the local simulation transitions", "showcase/app/run.ts"],
  [
    "Read the backend contract verification",
    "docs/public-showcase-contract-verification.md",
  ],
  [
    "Read local webhook readiness evidence",
    "docs/billing-webhook-readiness.md",
  ],
  [
    "Read the restored-copy rehearsal and limitations",
    "docs/rollout-item-3-rehearsal-2026-10-02.md",
  ],
  [
    "Read recorded browser checks and captures",
    "showcase/review/delivery/README.md",
  ],
  [
    "Inspect outstanding operations gates",
    "docs/rollout-item-3-rehearsal-2026-10-02.md",
  ],
];

test("three direct entries and ordinary navigation preserve quantity and browser history", async ({
  page,
}) => {
  for (const [path, heading] of [
    ["/", "Every number has a story."],
    ["/demo/", "One customer. One month."],
    ["/evidence/", "How it works & evidence"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  }
  await page
    .getByRole("link", { name: "Return to the current demo", exact: true })
    .click();
  await page.getByLabel("Quantity · API calls").fill("1500");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "How it works & evidence" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "How it works & evidence",
  );
  await page.goBack();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "How it works & evidence",
  );
  await page
    .getByRole("link", { name: "Continue the current demo", exact: true })
    .click();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
  await page.getByRole("link", { name: "Landing", exact: true }).click();
  await page
    .getByRole("main")
    .getByRole("link", { name: "How it works & evidence" })
    .click();
  await page
    .getByRole("link", { name: "Return to the current demo", exact: true })
    .click();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1500");
});

test("domain, simulation and dated readiness boundaries have traceable destinations", async ({
  page,
}) => {
  await page.goto("/evidence/");
  const main = page.getByRole("main");
  for (const text of [
    "Organization · Northstar API",
    "Customer · Orbit Studio",
    "distinct from a User",
    "comparison calculation",
    "not a tax invoice or payment request",
    "PENDING processing reconciles as LEDGER_PENDING",
    "PROCESSED without a rating",
    "RATING_PENDING",
    "UNRATED / NO_APPLICABLE_PRICE",
    "successfully rated zero",
    "all local simulations",
    "No authentication, production API, database write",
    "Pilot gates remain closed.",
    "Human usability sessions",
    "assessment remain pending",
    "jatinawankar02@gmail.com",
    "zero-cost static hosting is not confirmed",
    "Firefox failed to launch",
    "Later follow-ups supersede",
  ]) {
    await expect(main).toContainText(text);
  }
  for (const [name, path] of destinations)
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      snapshot + path,
    );
  await expect(
    page.getByRole("link", { name: "Inspect the implementation", exact: true }),
  ).toHaveAttribute("href", "https://github.com/jatin-awankar/UsageFlow");
  await page.getByRole("button", { name: "Discuss a pilot", exact: true }).click();
  await expect(page.getByRole("region", { name: "Pilot contact details" })).toContainText("jatinawankar02@gmail.com");
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Who owns the usage?",
    "From fact to notification.",
    "A synthetic run in this tab.",
    "Evidence has a boundary.",
    "Pilot gates remain closed.",
  ]);
});

for (const width of [360, 768, 1440])
  test(`evidence keyboard and readable reduced-motion layout ${width}px`, async ({
    page,
    browserName,
  }, testInfo) => {
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/evidence/");
    await page.keyboard.press(tab);
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    const links = page.getByRole("main").locator("a, button");
    for (let i = 0; i < (await links.count()); i++) {
      await page.keyboard.press(tab);
      await expect(links.nth(i)).toBeFocused();
      await expect(links.nth(i)).toHaveCSS("outline-width", "3px");
      const box = await links.nth(i).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(5);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width - 5);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const capture = testInfo.outputPath(`evidence-${width}.png`);
    await page.screenshot({ path: capture, fullPage: true });
    await testInfo.attach(`evidence-${width}`, {
      path: capture,
      contentType: "image/png",
    });
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Quantity · API calls")).toBeVisible();
  });
