import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import packageJson from "./package.json";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

export default withNextIntl(nextConfig);
