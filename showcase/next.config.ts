import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  outputFileTracingRoot: __dirname,
  trailingSlash: true,
  devIndicators: false,
};
export default config;
