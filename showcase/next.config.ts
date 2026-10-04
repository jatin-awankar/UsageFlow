import path from "node:path";
import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  webpack(config) {
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
