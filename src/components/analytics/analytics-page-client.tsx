"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LatencyByAgentChart } from "./latency-by-agent-chart";
import { TokenUsageTrendsChart } from "./token-usage-trends-chart";
import { useCallsStats } from "@/lib/hooks/use-calls";
import { useLatencyByAgent } from "@/lib/hooks/use-analytics";
import { formatLatency, formatPercentage, formatNumber } from "@/lib/utils/formatters";
import { Lightbulb, TrendingUp, AlertTriangle, Zap } from "lucide-react";

export function AnalyticsPageClient() {
  const { data: stats } = useCallsStats();
  const { data: latencyData } = useLatencyByAgent();

  // Generate insights from available data
  const insights: { icon: typeof Lightbulb; label: string; value: string; variant: 'info' | 'success' | 'warning' }[] = [];

  if (latencyData && latencyData.length > 0) {
    const highest = latencyData.reduce((max, item) => (item.avgLatency > max.avgLatency ? item : max), latencyData[0]);
    insights.push({
      icon: AlertTriangle,
      label: `Highest latency agent: ${highest.agentName || 'Unknown'}`,
      value: formatLatency(highest.avgLatency),
      variant: 'warning',
    });
  }

  if (stats) {
    insights.push({
      icon: TrendingUp,
      label: 'Overall success rate',
      value: formatPercentage(stats.successRate),
      variant: stats.successRate >= 80 ? 'success' : 'warning',
    });
    insights.push({
      icon: Zap,
      label: 'Average response time',
      value: formatLatency(stats.averageLatency),
      variant: stats.averageLatency < 1000 ? 'success' : 'warning',
    });
    insights.push({
      icon: Lightbulb,
      label: 'Total calls processed',
      value: formatNumber(stats.totalCalls),
      variant: 'info',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Deep dive into call metrics and performance analytics
        </p>
      </div>

      {/* Performance Insights */}
      {insights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
          {insights.map((insight, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <insight.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground truncate">{insight.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold">{insight.value}</span>
                      <Badge variant={insight.variant} className="text-xs">
                        {insight.variant === 'success' ? 'Good' : insight.variant === 'warning' ? 'Review' : 'Info'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
}
