"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging
    console.error("Dashboard error:", error);

    // Report error to Sentry with additional context
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "dashboard",
        page: "dashboard",
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your call analytics and agent performance
        </p>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Error Loading Dashboard</CardTitle>
          </div>
          <CardDescription>
            {error.message || "An unexpected error occurred"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
