// This file configures the initialization of Sentry for edge functions.
// The config you add here will be used whenever an edge function is executed.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production,
  // or use tracesSampler for greater control.
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Capture errors only in production and staging environments
  enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLED === "true",

  // Filter out noisy errors
  ignoreErrors: [
    "Unauthorized",
    "Invalid token",
    "ECONNREFUSED",
    "ECONNRESET",
  ],
});
