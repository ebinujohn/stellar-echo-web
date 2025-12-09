// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  // Adds request headers and IP for users
  sendDefaultPii: true,

  // Setting up profiling - optional performance profiling
  profilesSampleRate: 0.1,

  // Configure which requests should create spans
  integrations: [
    // Add integrations as needed
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Ignore common transient errors
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    // Ignore auth errors that are expected
    "Unauthorized",
    "Invalid token",
  ],

  // Before sending an event, you can modify it or return null to drop it
  beforeSend(event) {
    // Drop 4xx errors for certain known endpoints
    const statusCode = event.contexts?.response?.status_code;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      // Keep 401/403 errors but drop other client errors that are expected
      if (statusCode !== 401 && statusCode !== 403) {
        return null;
      }
    }
    return event;
  },
});
