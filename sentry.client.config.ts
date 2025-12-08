// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production,
  // or use tracesSampler for greater control.
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable session replay for error reproduction
  replaysOnErrorSampleRate: 1.0,
  // Capture Replay for 10% of all sessions, plus for all sessions with an error
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({
      // Additional configuration options
      colorScheme: "system",
      isNameRequired: false,
      isEmailRequired: false,
    }),
  ],

  // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/stellar-echo.*\.vercel\.app/,
    /^https:\/\/.*\.ngrok\.app/,
  ],

  // Enable Sentry when DSN is configured
  // In development, also requires NEXT_PUBLIC_SENTRY_ENABLED=true
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN &&
    (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true"),

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "http://tt.telewebion.com/v/p/TrueViewPlayer",
    "jigsaw is not defined",
    "ComboSearch is not defined",
    "http://loading.retry.widdit.com/",
    "atomicFindClose",
    // Facebook blocked
    "fb_xd_fragment",
    // Network errors
    "Network Error",
    "Failed to fetch",
    "NetworkError",
    "AbortError",
    // User cancellations
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
  ],

  // Prevent specific domains/URLs from being tracked
  denyUrls: [
    // Google Adsense
    /pagead\/js/i,
    // Facebook flance
    /graph\.facebook\.com/i,
    // Facebook blocked
    /connect\.facebook\.net\/en_US\/all\.js/i,
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
});
