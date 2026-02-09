'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Phone, TrendingUp, TrendingDown, Clock, type LucideIcon } from 'lucide-react';
import { useCallsStats } from '@/lib/hooks/use-calls';
import { formatNumber, formatDurationShort, formatLatency, formatPercentage } from '@/lib/utils/formatters';
import { CallVolumeChart } from './call-volume-chart';
import { SentimentDistributionChart } from './sentiment-distribution-chart';
import { RecentCallsTable } from './recent-calls-table';
import { cn } from '@/lib/utils';

interface StatCard {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor: string;
}

export function DashboardPageClient() {
  const { data: stats, isLoading } = useCallsStats();

  const comparisonChange = stats?.comparisonPeriod?.percentageChange;

  const statsCards: StatCard[] = [
    {
      title: 'Total Calls',
      value: stats ? formatNumber(stats.totalCalls) : '...',
      icon: Phone,
      description: 'All time calls',
      trend: comparisonChange !== undefined ? { value: comparisonChange, isPositive: comparisonChange >= 0 } : undefined,
      accentColor: 'text-primary',
    },
    {
      title: 'Avg Duration',
      value: stats ? formatDurationShort(stats.averageDuration) : '...',
      icon: Clock,
      description: 'Average call length',
      accentColor: 'text-cyan-500',
    },
    {
      title: 'Avg Response Time',
      value: stats ? formatLatency(stats.averageLatency) : '...',
      icon: TrendingUp,
      description: 'User to bot latency',
      accentColor: 'text-amber-500',
    },
    {
      title: 'Success Rate',
      value: stats ? formatPercentage(stats.successRate) : '...',
      icon: BarChart3,
      description: 'Completed successfully',
      accentColor: 'text-emerald-500',
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-muted", stat.accentColor)}>
                <stat.icon className="h-4 w-4" />
              </div>
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
                  <div className="flex items-center gap-2 mt-1">
                    {stat.trend && (
                      <span className={cn(
                        "flex items-center gap-0.5 text-xs font-medium",
                        stat.trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {stat.trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {stat.trend.isPositive ? '+' : ''}{stat.trend.value.toFixed(1)}%
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Volume</CardTitle>
            <CardDescription>Calls over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <CallVolumeChart days={7} height={280} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Call sentiment analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentDistributionChart height={280} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>Latest call activity</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentCallsTable />
        </CardContent>
      </Card>
    </div>
  );
}
