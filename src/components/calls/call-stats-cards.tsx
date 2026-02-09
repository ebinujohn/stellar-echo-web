'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useCallsStats } from '@/lib/hooks/use-calls';
import { formatNumber, formatDurationShort, formatLatency, formatPercentage } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface CallStatsCardsProps {
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
}

export function CallStatsCards({ dateRange }: CallStatsCardsProps) {
  const { data: stats, isLoading } = useCallsStats(dateRange);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statsData = [
    {
      title: 'Total Calls',
      value: formatNumber(stats.totalCalls),
      icon: Phone,
      description: 'All calls in selected period',
      accentColor: 'text-primary',
    },
    {
      title: 'Avg Duration',
      value: formatDurationShort(stats.averageDuration),
      icon: Clock,
      description: 'Average call length',
      accentColor: 'text-cyan-500',
    },
    {
      title: 'Avg Latency',
      value: formatLatency(stats.averageLatency),
      icon: TrendingUp,
      description: 'First token response time',
      accentColor: 'text-amber-500',
    },
    {
      title: 'Success Rate',
      value: formatPercentage(stats.successRate),
      icon: CheckCircle2,
      description: 'Calls completed successfully',
      accentColor: 'text-emerald-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <Card key={stat.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-muted", stat.accentColor)}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
