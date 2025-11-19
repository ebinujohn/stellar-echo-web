"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LatencyByAgentChart } from "./latency-by-agent-chart";
import { TokenUsageTrendsChart } from "./token-usage-trends-chart";

export function AnalyticsPageClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Deep dive into call metrics and performance analytics
        </p>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latency by Agent</CardTitle>
            <CardDescription>Average response latency per agent</CardDescription>
          </CardHeader>
          <CardContent>
            <LatencyByAgentChart height={300} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token Usage Trends</CardTitle>
            <CardDescription>Last 30 days of token consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <TokenUsageTrendsChart days={30} height={300} />
          </CardContent>
        </Card>
      </div>

      {/* Top Issues Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key metrics and optimization opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Use the charts above to identify performance trends and optimize your agents.
            Navigate to the Calls page to investigate specific calls in detail.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
