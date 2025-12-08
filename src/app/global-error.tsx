"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

/**
 * Global error boundary for the Next.js App Router.
 * Catches unhandled errors during React rendering and reports them to Sentry.
 *
 * Note: This component only captures errors that aren't caught by more specific
 * error boundaries. Each route segment can have its own error.tsx file.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "global",
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
          <h1 className="text-2xl font-bold text-red-600">
            Something went wrong!
          </h1>
          <p className="text-gray-600">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try again
          </button>
          {/* NextError renders a generic error message with the status code.
              Since App Router doesn't expose status codes, we pass 0. */}
          <div className="hidden">
            <NextError statusCode={0} />
          </div>
        </div>
      </body>
    </html>
  );
}
