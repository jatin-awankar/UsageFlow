import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Tab through the rendered interface: never focus a target programmatically.
async function activate(page: Page, target: Locator, tab: string) {
  for (let index = 0; index < 90; index++) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press(await page.getByRole("dialog").count() ? "Tab" : tab);
  }
  throw new Error(`Keyboard traversal did not reach ${await target.innerText()}`);
}

for (const width of [360, 768, 1440]) {
  test(`release complete keyboard journey, network, accessibility and layout ${width}px`, async ({
    page, browserName, browser,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    const requests: { method: string; url: string }[] = [];
    const failures: string[] = [];
    const cancelled: string[] = [];
    page.on("request", r => requests.push({ method: r.method(), url: r.url() }));
    page.on("requestfailed", r => {
      const error = r.failure()?.errorText ?? "unknown failure";
      if (/abort|cancel/i.test(error)) cancelled.push(`${r.method()} ${r.url()}: ${error}`);
      else failures.push(`${r.url()}: ${error}`);
    });
    page.on("response", r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
    page.on("pageerror", e => failures.push(e.message));
    page.on("websocket", socket => failures.push(`WebSocket: ${socket.url()}`));
    const button = (name: string) => page.getByRole("button", { name, exact: !/^0/.test(name) });
    const go = (name: string) => activate(page, button(name), tab);
    const capture = async (name: string) => {
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      await info.attach(`${name}-axe.json`, { body: JSON.stringify({ violations: result.violations, incomplete: result.incomplete }, null, 2), contentType: "application/json" });
      expect(result.violations).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${name}-${width}.png`), fullPage: true });
    };
    await page.goto("/");
    await capture("landing");
    await activate(page, page.getByRole("link", { name: "Explore the demo" }), tab);
    await go("Accept event");
    await go("Retry identical event");
    await expect(page.getByText("Identical retries: 1")).toBeVisible();
    await go("02 Inspect pricing");
    await go("Process & rate event");
    await expect(page.getByText("INR 3.13", { exact: true }).first()).toBeVisible();
    await capture("pricing");
    await activate(page, page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "How it works & evidence" }), tab);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How it works & evidence");
    await capture("evidence");
    await page.goBack();
    await expect(page.getByText("INR 3.13", { exact: true }).first()).toBeVisible();
    await page.goForward();
    await activate(page, page.getByRole("link", { name: "Return to the current demo", exact: true }), tab);
    await go("03 Monthly record");
    await expect(page.getByRole("region", { name: "Monthly BillingRecord draft" })).toContainText("Exact line total: INR 28.130");
    await go("Advance simulated time past close");
    await go("Finalize monthly record");
    await capture("approval");
    await go("Approve simulated finalization");
    await capture("finalized");
    await go("04 Webhook delivery");
    await activate(page, page.getByText("Inspect webhook payload", { exact: true }), tab);
    const payload = page.getByRole("region", { name: "Webhook payload JSON" });
    expect(JSON.parse(await payload.innerText()).amount).toBe("28.130");
    await go("Simulate delivery");
    await expect(page.getByText("DELIVERED · Simulated success", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Successful simulated attempt", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Completion actions" })).toContainText("View the email address and contact options. No message is sent automatically.");
    await capture("delivery");
    await page.getByRole("button", { name: "Discuss a pilot", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open email app", exact: true })).toHaveAttribute("href", "mailto:jatinawankar02@gmail.com");
    await expect(page.getByRole("link", { name: "Inspect the implementation", exact: true })).toHaveAttribute("href", "https://github.com/jatin-awankar/UsageFlow");
    await go("Reset demo");
    await page.keyboard.press("Escape");
    await expect(button("Reset demo")).toBeFocused();
    await expect(page.getByText("DELIVERED · Simulated success", { exact: true })).toBeVisible();
    await go("Reset demo");
    await go("Start fresh");
    await expect(page.getByLabel("Quantity · API calls")).toBeFocused();
    await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
    expect(failures).toEqual([]);
    expect(requests.filter(r => !["GET", "HEAD"].includes(r.method) || new URL(r.url).origin !== "http://127.0.0.1:3211")).toEqual([]);
    await info.attach("environment-network.json", { body: JSON.stringify({ browser: browserName, version: browser.version(), date: new Date().toISOString(), width, fixture: "public-default", reducedMotion: true, requests, cancelled }, null, 2), contentType: "application/json" });
  });
}

test("static direct pages, font decoding and licence asset serving", async ({ page, request }) => {
  for (const route of ["/", "/demo/", "/evidence/"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => [...document.fonts].map(font => font.status))).toEqual(["loaded", "loaded", "loaded"]);
  }
  for (const asset of ["THIRD-PARTY-NOTICES.txt", "fonts/Fraunces-OFL.txt", "fonts/Inter-OFL.txt", "fonts/README.txt", "fonts/fraunces-500.woff2", "fonts/inter-400.woff2", "fonts/inter-600.woff2"]) {
    const response = await request.get(`/${asset}`);
    expect(response.status()).toBe(200);
    if (asset.endsWith("woff2")) {
      expect(response.headers()["content-type"]).toContain("font/woff2");
      expect((await response.body()).subarray(0, 4).toString()).toBe("wOF2");
    } else expect(response.headers()["content-type"]).toContain("text/plain");
  }
  expect((await request.get("/not-a-showcase-page/")).status()).toBe(404);
});
