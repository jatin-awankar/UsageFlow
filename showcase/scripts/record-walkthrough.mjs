// Run against `npm --prefix showcase run serve` after a normal static build.
// Pauses are intentional reading time for the recording, not test synchronization.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const destination = resolve(process.argv[2] ?? "test-results/showcase-walkthrough");
await mkdir(destination, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: destination, size: { width: 1280, height: 900 } },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const started = Date.now();
const chapters = [];
async function show(text, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded();
  const start = (Date.now() - started) / 1000;
  await page.waitForTimeout(3000);
  chapters.push({ start, end: (Date.now() - started) / 1000, text });
}
const button = name => page.getByRole("button", { name, exact: true });
try {
  await page.goto("http://127.0.0.1:3211/");
  await expect(page.getByRole("link", { name: "Try demo", exact: true })).toBeVisible();
  await show("UsageFlow: a browser simulation with synthetic data. No signup or live billing.");
  await page.getByRole("link", { name: "Try demo", exact: true }).click();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
  await show("Start with 1,250 API calls. The guidance explains the next action.", page.getByLabel("Quantity · API calls"));
  await button("Accept event").click();
  await button("Retry identical event").click();
  await expect(page.getByText("Identical retries: 1")).toBeVisible();
  await show("An identical retry keeps one visitor event. Acceptance is separate from rating.", page.getByText("Identical retries: 1"));
  await button("Next: Inspect pricing").click();
  await button("Process & rate event").click();
  await expect(page.getByText("INR 3.13", { exact: true }).first()).toBeVisible();
  await show("Occurrence-time pricing produces INR 3.13 for this event.", page.getByText("INR 3.13", { exact: true }).first());
  await button("Next: Monthly record").click();
  await show("Review the month: baseline contributions plus the new event.", page.getByRole("region", { name: "Monthly BillingRecord draft" }));
  await button("Advance simulated time past close").click();
  await button("Finalize monthly record").click();
  await show("Owner approval is explicit. This is a comparison calculation, not a payment.", page.getByRole("dialog"));
  await button("Approve simulated finalization").click();
  await button("Next: Webhook delivery").click();
  await page.getByText("Inspect webhook payload", { exact: true }).click();
  await show("Inspect the frozen amount and stable event identity in the synthetic payload.", page.getByRole("region", { name: "Webhook payload JSON" }));
  await button("Simulate delivery").click();
  await show("Demo complete. Delivery is simulated; no receiver request occurs.", page.getByRole("region", { name: "Completion actions" }));
  await button("Contact Jatin").click();
  await show("Copy the public email address or inspect the source. Nothing is sent automatically.", page.getByRole("region", { name: "Project contact details" }));
  await button("Reset demo").click();
  await show("Reset requires confirmation and restores the prepared local scenario.", page.getByRole("dialog"));
  await button("Start fresh").click();
  await expect(page.getByLabel("Quantity · API calls")).toHaveValue("1250");
  await show("Ready to explore again. Other tabs and real data are unaffected.", page.getByLabel("Quantity · API calls"));
} finally {
  await context.close();
  try {
    await page.video().saveAs(resolve(destination, "walkthrough.webm"));
    await page.video().delete();
  } finally {
    await browser.close();
  }
}
const time = seconds => new Date(seconds * 1000).toISOString().slice(11, 23);
await writeFile(resolve(destination, "walkthrough.vtt"), "WEBVTT\n\n" + chapters.map(({ start, end, text }) => `${time(start)} --> ${time(end)}\n${text}\n`).join("\n"));
await writeFile(resolve(destination, "walkthrough.json"), JSON.stringify({ browser: "Chromium", recordedAt: new Date().toISOString(), viewport: "1280x900", captions: chapters }, null, 2) + "\n");
console.log(`Walkthrough and captions saved to ${destination}`);
