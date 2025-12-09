"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { browserLoggers } from "@/lib/browser-logger";

const log = browserLoggers.sentry;

/**
 * SentryProvider initializes the Sentry client-side SDK.
 * This component ensures Sentry is properly initialized in the browser
 * for client-side error tracking, performance monitoring, and session replay.
 */
export function SentryProvider() {
  useEffect(() => {
    // Only initialize if not already initialized and DSN is provided
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const isEnabled =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true";

    if (!dsn || !isEnabled) {
      log.debug("Client SDK disabled", { hasDsn: !!dsn, isEnabled });
      return;
    }

    // Check if Sentry is already initialized
    const client = Sentry.getClient();
    if (client) {
      log.debug("Client SDK already initialized");
      return;
    }

    // Initialize Sentry for client-side
    Sentry.init({
      dsn,
      tracesSampleRate: 1.0,
      debug: false,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
        Sentry.browserTracingIntegration(),
        Sentry.feedbackIntegration({
          colorScheme: "system",
          isNameRequired: false,
          isEmailRequired: false,
        }),
      ],
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/stellar-echo.*\.vercel\.app/,
        /^https:\/\/.*\.ngrok\.app/,
      ],
      ignoreErrors: [
        "top.GLOBALS",
        "Network Error",
        "Failed to fetch",
        "NetworkError",
        "AbortError",
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
      ],
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
      ],
    });

    log.debug("Client SDK initialized successfully");
  }, []);

  // This component doesn't render anything
  return null;
}
