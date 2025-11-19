'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, MessageSquare, Activity, TrendingUp } from 'lucide-react';
import { useCallMetrics } from '@/lib/hooks/use-call-detail';
import { formatLatency, formatNumber } from '@/lib/utils/formatters';

interface CallMetricsTabProps {
  callId: string;
}

export function CallMetricsTab({ callId }: CallMetricsTabProps) {
  const { data: metrics, isLoading, error } = useCallMetrics(callId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading metrics: {error.message}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No metrics data available for this call.</p>
      </div>
    );
  }

  const metricsCards = [
    {
      title: 'Avg TTFB',
      value: formatLatency(metrics.avgLlmTtfbMs),
      description: 'LLM time to first byte',
      icon: Zap,
    },
    {
      title: 'Avg Pipeline Time',
      value: formatLatency(metrics.avgPipelineTotalMs),
      description: 'Total pipeline latency',
      icon: TrendingUp,
    },
    {
      title: 'Total LLM Tokens',
      value: formatNumber(metrics.totalLlmTokens),
      description: 'LLM tokens used',
      icon: MessageSquare,
    },
    {
      title: 'TTS Characters',
      value: formatNumber(metrics.totalTtsCharacters),
      description: 'Text-to-speech chars',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>


      {/* Charts Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Latency Over Time</CardTitle>
          <CardDescription>Response latency throughout the call</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Chart will be implemented with Recharts (showing latency per message)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Usage</CardTitle>
          <CardDescription>Token consumption by message role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Chart will be implemented with Recharts (showing token breakdown)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
