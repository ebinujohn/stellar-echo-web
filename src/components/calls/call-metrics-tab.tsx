'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Zap, MessageSquare, Activity, TrendingUp, Repeat, AlertCircle } from 'lucide-react';
import { useCallMetrics } from '@/lib/hooks/use-call-detail';
import { formatLatency, formatNumber, formatPercentage } from '@/lib/utils/formatters';
import { TokenUsageChart } from './token-usage-chart';
import { LatencyOverTimeChart } from './latency-over-time-chart';
import { ComprehensiveMetricsTable } from './comprehensive-metrics-table';

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
      title: 'Avg Pipeline Time',
      value: formatLatency(metrics.avgPipelineTotalMs),
      description: `Min: ${formatLatency(metrics.minPipelineTotalMs)} | Max: ${formatLatency(metrics.maxPipelineTotalMs)}`,
      icon: TrendingUp,
    },
    {
      title: 'Avg LLM Processing',
      value: formatLatency(metrics.avgLlmProcessingMs),
      description: 'LLM response time',
      icon: Zap,
    },
    {
      title: 'Total Turns',
      value: formatNumber(metrics.totalTurns),
      description: metrics.totalInterruptions
        ? `${metrics.totalInterruptions} interruptions (${formatPercentage((metrics.totalInterruptions / (metrics.totalTurns || 1)) * 100)})`
        : 'No interruptions',
      icon: Repeat,
    },
    {
      title: 'Total LLM Tokens',
      value: formatNumber(metrics.totalLlmTokens),
      description: `TTS: ${formatNumber(metrics.totalTtsCharacters)} chars`,
      icon: MessageSquare,
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


      {/* Latency Over Time - PRIMARY CHART */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Latency Over Time</CardTitle>
              <CardDescription>
                Per-turn latency metrics throughout the call
                {(metrics.totalInterruptions ?? 0) > 0 && (
                  <span className="ml-2">
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      {metrics.totalInterruptions} interruption{(metrics.totalInterruptions ?? 0) > 1 ? 's' : ''}
                    </Badge>
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LatencyOverTimeChart metricsData={metrics.metricsData} height={350} />
          {(metrics.totalInterruptions ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              🔴 Red dots indicate turns where the user interrupted the bot
            </p>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Latency Metrics - Min / Average / Max</CardTitle>
          <CardDescription>
            Complete breakdown of all pipeline latency components with statistical ranges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ComprehensiveMetricsTable metrics={metrics} />
        </CardContent>
      </Card>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>Total tokens and characters consumed</CardDescription>
        </CardHeader>
        <CardContent>
          <TokenUsageChart metrics={metrics} height={280} />
        </CardContent>
      </Card>
    </div>
  );
}
