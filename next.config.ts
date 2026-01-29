import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker builds
  output: 'standalone',

  // Prevent 307 redirects on health check endpoint from trailing slash normalization
  skipTrailingSlashRedirect: true,
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project slug from Sentry
  org: "higgs-boson-llc-b7",
  project: "stellar-echo-web-non-prod",

  // Only print logs for uploading source maps in CI
  // Set to `true` to suppress logs
  silent: !process.env.CI,

  // Upload source maps during production builds for better error stack traces
  // Note: Requires SENTRY_AUTH_TOKEN environment variable to be set
  sourceMaps: {
    // Disable source map deletion to keep them available
    deleteSourceMapsAfterUpload: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js proxy
  tunnelRoute: "/monitoring-tunnel",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Disable the Sentry webpack plugin in development mode to speed up builds
  // Source maps will still be generated but not uploaded
  widenClientFileUpload: true,

  // Webpack-specific instrumentation options
  webpack: {
    // Automatically instrument Next.js data fetching methods and API routes
    autoInstrumentServerFunctions: true,

    // Automatically instrument Next.js middleware/proxy
    autoInstrumentMiddleware: true,

    // Tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

// Make sure adding Sentry options is the last code to run before exporting
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
