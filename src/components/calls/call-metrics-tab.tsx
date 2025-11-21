'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, MessageSquare, Activity, TrendingUp, Repeat } from 'lucide-react';
import { useCallMetrics } from '@/lib/hooks/use-call-detail';
import { formatLatency, formatNumber, formatPercentage } from '@/lib/utils/formatters';
import { TokenUsageChart } from './token-usage-chart';
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
      title: 'User→Bot Latency',
      value: formatLatency(metrics.avgUserToBotLatencyMs),
      description: `Most important UX metric | Min: ${formatLatency(metrics.minUserToBotLatencyMs)} | Max: ${formatLatency(metrics.maxUserToBotLatencyMs)}`,
      icon: TrendingUp,
      tooltip: 'User stopped speaking → Bot started speaking (500-2500ms expected)',
    },
    {
      title: 'STT Processing',
      value: formatLatency(metrics.avgSttProcessingMs),
      description: `Deepgram performance | Min: ${formatLatency(metrics.minSttProcessingMs)} | Max: ${formatLatency(metrics.maxSttProcessingMs)}`,
      icon: Activity,
      tooltip: 'Recommended metric for Deepgram Flux (100-300ms expected)',
    },
    {
      title: 'LLM Processing',
      value: formatLatency(metrics.avgLlmProcessingMs),
      description: `Response generation | Min: ${formatLatency(metrics.minLlmProcessingMs)} | Max: ${formatLatency(metrics.maxLlmProcessingMs)}`,
      icon: Zap,
      tooltip: 'LLM start → Response complete (400-2000ms expected)',
    },
    {
      title: 'TTS TTFB',
      value: formatLatency(metrics.avgTtsTtfbMs),
      description: `ElevenLabs latency | Min: ${formatLatency(metrics.minTtsTtfbMs)} | Max: ${formatLatency(metrics.maxTtsTtfbMs)}`,
      icon: MessageSquare,
      tooltip: 'Time to first audio chunk (200-500ms expected)',
    },
  ];

  const costMetricsCards = [
    {
      title: 'Total Turns',
      value: metrics.totalTurns ? formatNumber(metrics.totalTurns) : '0',
      description: metrics.totalInterruptions
        ? `${metrics.totalInterruptions} interruption${metrics.totalInterruptions > 1 ? 's' : ''} (${formatPercentage((metrics.totalInterruptions / (metrics.totalTurns || 1)) * 100)})`
        : 'No interruptions',
      icon: Repeat,
    },
    {
      title: 'LLM Tokens',
      value: formatNumber(metrics.totalLlmTokens),
      description: 'Total prompt + completion tokens',
      icon: MessageSquare,
    },
    {
      title: 'TTS Characters',
      value: formatNumber(metrics.totalTtsCharacters),
      description: 'Total characters sent to TTS',
      icon: Activity,
    },
    {
      title: 'Pipeline Total',
      value: formatLatency(metrics.avgPipelineTotalMs),
      description: `Min: ${formatLatency(metrics.minPipelineTotalMs)} | Max: ${formatLatency(metrics.maxPipelineTotalMs)}`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Performance Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Primary Performance Metrics</h3>
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
      </div>

      {/* Cost Tracking & Usage Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Cost Tracking & Usage</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {costMetricsCards.map((metric) => (
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
      </div>

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
