"use client";

import { BarChart, Bar } from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartEmptyState,
} from "@/components/ui/chart";
import { chartColors } from "@/lib/charts/config";
import { formatNumber } from "@/lib/utils/formatters";

interface TokenUsageChartProps {
  metrics: {
    totalLlmTokens: number | null;
    totalTtsCharacters: number | null;
  };
  height?: number;
}

export function TokenUsageChart({
  metrics,
  height = 280,
}: TokenUsageChartProps) {
  const chartData = [
    {
      category: "LLM Tokens",
      value: metrics.totalLlmTokens || 0,
    },
    {
      category: "TTS Characters",
      value: metrics.totalTtsCharacters || 0,
    },
  ];

  if (chartData.every((item) => item.value === 0)) {
    return <ChartEmptyState message="No usage data available" height={height} />;
  }

  return (
    <ChartContainer height={height}>
      <BarChart data={chartData}>
        <ChartGrid />
        <ChartXAxis dataKey="category" />
        <ChartYAxis tickFormatter={(value) => formatNumber(value)} />
        <ChartTooltip
          formatter={(value: number) => formatNumber(value)}
        />
        <Bar
          dataKey="value"
          fill={chartColors.primary}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
