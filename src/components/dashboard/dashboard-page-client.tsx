'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Phone, TrendingUp, Clock } from 'lucide-react';
import { useCallsStats } from '@/lib/hooks/use-calls';
import { formatNumber, formatDurationShort, formatLatency, formatPercentage } from '@/lib/utils/formatters';

export function DashboardPageClient() {
  const { data: stats, isLoading } = useCallsStats();

  const statsCards = [
    {
      title: 'Total Calls',
      value: stats ? formatNumber(stats.totalCalls) : '...',
      icon: Phone,
      description: 'All time calls',
    },
    {
      title: 'Avg Duration',
      value: stats ? formatDurationShort(stats.averageDuration) : '...',
      icon: Clock,
      description: 'Average call length',
    },
    {
      title: 'Avg Latency',
      value: stats ? formatLatency(stats.averageLatency) : '...',
      icon: TrendingUp,
      description: 'First token response',
    },
    {
      title: 'Success Rate',
      value: stats ? formatPercentage(stats.successRate) : '...',
      icon: BarChart3,
      description: 'Completed successfully',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your call analytics and agent performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Volume</CardTitle>
            <CardDescription>Calls over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              Chart will be implemented with Recharts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Call sentiment analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              Chart will be implemented with Recharts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>Latest call activity - Click "Calls" in sidebar to see full list</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Navigate to the Calls page to view and filter all calls with advanced search options.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
