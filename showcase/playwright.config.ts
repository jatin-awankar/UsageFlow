import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  outputDir: "../test-results/showcase",
  use: { baseURL: "http://127.0.0.1:3211", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "python3 serve.py",
    url: "http://127.0.0.1:3211",
    reuseExistingServer: false,
  },
});
