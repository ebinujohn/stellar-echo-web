"use client";

import { PieChart, Pie, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartEmptyState,
  ChartLoadingState,
} from "@/components/ui/chart";
import { useSentimentDistribution } from "@/lib/hooks/use-dashboard";
import { sentimentColors } from "@/lib/charts/config";

interface SentimentDistributionChartProps {
  height?: number;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: sentimentColors.positive,
  neutral: sentimentColors.neutral,
  negative: sentimentColors.negative,
  mixed: sentimentColors.mixed,
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  mixed: "Mixed",
};

export function SentimentDistributionChart({ height = 280 }: SentimentDistributionChartProps) {
  const { data, isLoading, error } = useSentimentDistribution();

  if (isLoading) {
    return <ChartLoadingState height={height} />;
  }

  if (error || !data) {
    return <ChartEmptyState message="Failed to load sentiment data" height={height} />;
  }

  // Filter out null sentiments and format data
  const chartData = data
    .filter((item) => item.sentiment !== null)
    .map((item) => ({
      name: SENTIMENT_LABELS[item.sentiment!] || item.sentiment!,
      value: Number(item.count),
      sentiment: item.sentiment!,
    }));

  if (chartData.length === 0) {
    return <ChartEmptyState message="No sentiment data available" height={height} />;
  }

  return (
    <ChartContainer height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={SENTIMENT_COLORS[entry.sentiment] || "#888"}
            />
          ))}
        </Pie>
        <ChartTooltip
          formatter={(value: number, name: string) => [`${value} calls`, name]}
        />
        <ChartLegend />
      </PieChart>
    </ChartContainer>
  );
}
