import { defineConfig } from "@playwright/test";
import local from "./playwright.config";

const target = new URL(process.env.SHOWCASE_HOSTED_URL ?? "");
if (
  target.protocol !== "https:" ||
  target.username || target.password ||
  target.pathname !== "/" || target.search || target.hash
) throw new Error("SHOWCASE_HOSTED_URL must be an HTTPS origin without credentials, path, query, or fragment");
if (process.env.SHOWCASE_TEST_BUILD === "1")
  throw new Error("Hosted checks must use the normal publication build");

export default defineConfig(local, {
  testMatch: "release.spec.ts",
  outputDir: "../test-results/showcase-hosted",
  use: { baseURL: target.origin },
  webServer: undefined,
});
