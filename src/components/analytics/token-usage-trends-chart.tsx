"use client";

import { LineChart, Line, BarChart, Bar } from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
  ChartEmptyState,
  ChartLoadingState,
} from "@/components/ui/chart";
import { useTokenUsageTrends } from "@/lib/hooks/use-analytics";
import { chartColors } from "@/lib/charts/config";
import { formatNumber } from "@/lib/utils/formatters";

interface TokenUsageTrendsChartProps {
  days?: number;
  height?: number;
}

export function TokenUsageTrendsChart({
  days = 30,
  height = 300,
}: TokenUsageTrendsChartProps) {
  const { data, isLoading, error } = useTokenUsageTrends(days);

  if (isLoading) {
    return <ChartLoadingState height={height} />;
  }

  if (error || !data) {
    return <ChartEmptyState message="Failed to load token usage data" height={height} />;
  }

  if (data.length === 0) {
    return <ChartEmptyState message="No usage data available for this period" height={height} />;
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    tokens: Number(item.totalTokens) || 0,
    ttsChars: Number(item.totalTtsChars) || 0,
  }));

  // Use bar chart for sparse data (< 3 data points), line chart otherwise
  const useSparseVisualization = chartData.length < 3;

  return (
    <ChartContainer height={height}>
      {useSparseVisualization ? (
        <BarChart data={chartData}>
          <ChartGrid />
          <ChartXAxis
            dataKey="date"
          />
          <ChartYAxis
            tickFormatter={(value) => formatNumber(value)}
          />
          <ChartTooltip
            formatter={(value: number, name: string) => [
              formatNumber(value),
              name === "tokens" ? "LLM Tokens" : "TTS Characters"
            ]}
          />
          <ChartLegend />
          <Bar
            dataKey="tokens"
            name="LLM Tokens"
            fill={chartColors.primary}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="ttsChars"
            name="TTS Characters"
            fill={chartColors.secondary}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      ) : (
        <LineChart data={chartData}>
          <ChartGrid />
          <ChartXAxis
            dataKey="date"
            angle={-45}
            height={80}
          />
          <ChartYAxis
            tickFormatter={(value) => formatNumber(value)}
          />
          <ChartTooltip
            formatter={(value: number, name: string) => [
              formatNumber(value),
              name === "tokens" ? "LLM Tokens" : "TTS Characters"
            ]}
          />
          <ChartLegend />
          <Line
            type="monotone"
            dataKey="tokens"
            name="LLM Tokens"
            stroke={chartColors.primary}
            strokeWidth={2}
            dot={{ fill: chartColors.primary, r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="ttsChars"
            name="TTS Characters"
            stroke={chartColors.secondary}
            strokeWidth={2}
            dot={{ fill: chartColors.secondary, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      )}
    </ChartContainer>
  );
}
