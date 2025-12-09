"use client";

import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartTooltip,
  ChartEmptyState,
} from "@/components/ui/chart";
import { chartPalette, axisStyle } from "@/lib/charts/config";
import { formatLatency } from "@/lib/utils/formatters";

interface MetricsBreakdownChartProps {
  metrics: {
    avgLlmTtfbMs: number | null;
    avgPipelineTotalMs: number | null;
    avgSttDelayMs?: number | null;
    avgLlmProcessingMs?: number | null;
    avgRagProcessingMs?: number | null;
  };
  height?: number;
}

export function MetricsBreakdownChart({
  metrics,
  height = 280,
}: MetricsBreakdownChartProps) {
  const chartData = [
    {
      name: "LLM TTFB",
      value: metrics.avgLlmTtfbMs ? Number(metrics.avgLlmTtfbMs) : 0,
      label: "Time to First Byte",
    },
    {
      name: "Pipeline Total",
      value: metrics.avgPipelineTotalMs ? Number(metrics.avgPipelineTotalMs) : 0,
      label: "Total Pipeline Time",
    },
    {
      name: "STT Delay",
      value: metrics.avgSttDelayMs ? Number(metrics.avgSttDelayMs) : 0,
      label: "Speech-to-Text",
    },
    {
      name: "LLM Processing",
      value: metrics.avgLlmProcessingMs ? Number(metrics.avgLlmProcessingMs) : 0,
      label: "LLM Processing",
    },
    {
      name: "RAG Processing",
      value: metrics.avgRagProcessingMs ? Number(metrics.avgRagProcessingMs) : 0,
      label: "RAG Queries",
    },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return <ChartEmptyState message="No latency metrics available" height={height} />;
  }

  return (
    <ChartContainer height={height}>
      <BarChart data={chartData} layout="vertical">
        <ChartGrid />
        <XAxis
          type="number"
          tickFormatter={(value) => formatLatency(value)}
          {...axisStyle}
          tick={{ fill: axisStyle.stroke }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          {...axisStyle}
          tick={{ fill: axisStyle.stroke }}
        />
        <ChartTooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: number, _name: string, props: any) => [
            formatLatency(value),
            props.payload.label,
          ]}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartPalette[index % chartPalette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
