// Firefox 155 on macOS 27 can fail while resolving shared app data.
// Isolate only this test process; never change HOME or system privacy settings.
// Upstream: https://github.com/microsoft/playwright/issues/42768
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const isolatedData = process.platform === "darwin"
  ? mkdtempSync(join(tmpdir(), "usageflow-firefox-appdata-"))
  : undefined;
try {
  const result = spawnSync(process.execPath, [
    join(dirname(require.resolve("playwright/package.json")), "cli.js"), "test", "--project=firefox", ...process.argv.slice(2),
  ], {
    stdio: "inherit",
    env: isolatedData ? { ...process.env, CFFIXED_USER_HOME: isolatedData } : process.env,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (isolatedData) {
    try {
      rmSync(isolatedData, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
    } catch (error) {
      // macOS may protect newly created app-data subdirectories even after exit.
      // Keep the browser-test result intact and disclose the temporary leftovers.
      if (!["ENOTEMPTY", "EACCES", "EPERM"].includes(error.code)) throw error;
      console.warn(`Temporary Firefox app data could not be fully removed (${error.code}): ${isolatedData}`);
    }
  }
}
