"use client";

import { BarChart, Bar } from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartEmptyState,
  ChartLoadingState,
} from "@/components/ui/chart";
import { useLatencyByAgent } from "@/lib/hooks/use-analytics";
import { chartColors } from "@/lib/charts/config";
import { formatLatency } from "@/lib/utils/formatters";

interface LatencyByAgentChartProps {
  height?: number;
}

export function LatencyByAgentChart({ height = 300 }: LatencyByAgentChartProps) {
  const { data, isLoading, error } = useLatencyByAgent();

  if (isLoading) {
    return <ChartLoadingState height={height} />;
  }

  if (error || !data) {
    return <ChartEmptyState message="Failed to load latency data" height={height} />;
  }

  if (data.length === 0) {
    return <ChartEmptyState message="No agent data available" height={height} />;
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    agent: item.agentName || "Unknown Agent",
    latency: Math.round(Number(item.avgLatency)),
    calls: Number(item.callCount),
  }));

  // Only rotate labels if there are multiple agents
  const shouldRotateLabels = chartData.length > 1;

  return (
    <ChartContainer height={height}>
      <BarChart data={chartData}>
        <ChartGrid />
        <ChartXAxis
          dataKey="agent"
          angle={shouldRotateLabels ? -45 : 0}
          height={shouldRotateLabels ? 80 : 60}
        />
        <ChartYAxis
          tickFormatter={(value) => formatLatency(value)}
        />
        <ChartTooltip
          formatter={(value: number, name: string, props: { payload: { calls: number } }) => {
            if (name === "latency") {
              return [formatLatency(value), `Avg Latency (${props.payload.calls} calls)`];
            }
            return [value, name];
          }}
        />
        <Bar
          dataKey="latency"
          fill={chartColors.primary}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
