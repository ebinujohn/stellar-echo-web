"use client";

import { LineChart, Line } from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartEmptyState,
  ChartLoadingState,
} from "@/components/ui/chart";
import { useCallVolume } from "@/lib/hooks/use-dashboard";
import { chartColors } from "@/lib/charts/config";

interface CallVolumeChartProps {
  days?: number;
  height?: number;
}

export function CallVolumeChart({ days = 7, height = 280 }: CallVolumeChartProps) {
  const { data, isLoading, error } = useCallVolume(days);

  if (isLoading) {
    return <ChartLoadingState height={height} />;
  }

  if (error || !data) {
    return <ChartEmptyState message="Failed to load call volume data" height={height} />;
  }

  if (data.length === 0) {
    return <ChartEmptyState message="No call data available for this period" height={height} />;
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    calls: Number(item.count),
  }));

  return (
    <ChartContainer height={height}>
      <LineChart data={chartData}>
        <ChartGrid />
        <ChartXAxis
          dataKey="date"
          angle={-45}
          height={60}
        />
        <ChartYAxis
          tickFormatter={(value) => Math.round(value).toString()}
        />
        <ChartTooltip
          formatter={(value: number) => [`${value} calls`, "Calls"]}
        />
        <Line
          type="monotone"
          dataKey="calls"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={{ fill: chartColors.primary, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
