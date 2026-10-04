import path from "node:path";
import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  webpack(config) {
    // Alias targets differ by build mode; never reuse fixture modules in a normal export.
    if (config.cache && typeof config.cache === "object") {
      config.cache.version = `${config.cache.version ?? ""}|showcase-test=${process.env.SHOWCASE_TEST_BUILD === "1"}`;
    }
    config.resolve.alias["./initialization$"] = path.resolve(
      __dirname,
      process.env.SHOWCASE_TEST_BUILD === "1"
        ? "tests/fixtures/initialization.ts"
        : "app/initialization.ts",
    );
    return config;
  },
  outputFileTracingRoot: __dirname,
  trailingSlash: true,
  devIndicators: false,
};
export default config;
