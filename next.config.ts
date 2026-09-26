import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  agentRules: false,
  env: {
    APP_VERSION: packageJson.version,
  },
  output: 'standalone',
  outputFileTracingIncludes: {
    '/': ['./public/**/*'],
  },
};

export default nextConfig;
