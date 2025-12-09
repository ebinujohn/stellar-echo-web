"use client";

import { LineChart, Line, Dot } from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
  ChartEmptyState,
} from "@/components/ui/chart";
import { chartPalette } from "@/lib/charts/config";
import { formatLatency } from "@/lib/utils/formatters";
import type { TurnMetrics } from "@/lib/db/queries/call-details";

interface LatencyOverTimeChartProps {
  metricsData: TurnMetrics[] | null;
  height?: number;
}

// Custom dot component to highlight interruptions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;

  if (payload.wasInterrupted) {
    return (
      <svg x={cx - 6} y={cy - 6} width={12} height={12}>
        <circle cx={6} cy={6} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
      </svg>
    );
  }

  return <Dot {...props} />;
};

export function LatencyOverTimeChart({
  metricsData,
  height = 350,
}: LatencyOverTimeChartProps) {
  if (!metricsData || metricsData.length === 0) {
    return <ChartEmptyState message="No per-turn metrics available" height={height} />;
  }

  // Transform data for chart
  const chartData = metricsData.map((turn) => ({
    turn: turn.turnNumber,
    pipelineTotal: turn.pipelineTotalMs || 0,
    llmProcessing: turn.llmProcessingMs || 0,
    llmTtfb: turn.llmTtfbMs || 0,
    sttDelay: turn.sttDelayMs || 0,
    llmToTts: turn.llmToTtsGapMs || 0,
    transcriptLlmGap: turn.transcriptLlmGapMs || 0,
    ragProcessing: turn.ragProcessingMs || 0,
    variableExtraction: turn.variableExtractionMs || 0,
    wasInterrupted: turn.wasInterrupted || false,
  }));

  // Determine which metrics have data
  const hasData = {
    pipelineTotal: chartData.some(d => d.pipelineTotal > 0),
    llmProcessing: chartData.some(d => d.llmProcessing > 0),
    llmTtfb: chartData.some(d => d.llmTtfb > 0),
    sttDelay: chartData.some(d => d.sttDelay > 0),
    llmToTts: chartData.some(d => d.llmToTts > 0),
    ragProcessing: chartData.some(d => d.ragProcessing > 0),
    variableExtraction: chartData.some(d => d.variableExtraction > 0),
  };

  return (
    <ChartContainer height={height}>
      <LineChart data={chartData}>
        <ChartGrid />
        <ChartXAxis
          dataKey="turn"
          label="Turn Number"
        />
        <ChartYAxis
          label="Latency (ms)"
          tickFormatter={(value) => formatLatency(value)}
        />
        <ChartTooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: number, name: string, props: any) => {
            const labels: Record<string, string> = {
              pipelineTotal: "Pipeline Total",
              llmProcessing: "LLM Processing",
              llmTtfb: "LLM TTFB",
              sttDelay: "STT Delay",
              llmToTts: "LLM→TTS Gap",
              transcriptLlmGap: "Transcript→LLM Gap",
              ragProcessing: "RAG Processing",
              variableExtraction: "Variable Extraction",
            };
            const label = labels[name] || name;
            const interrupted = props.payload.wasInterrupted ? " ⚠️ INTERRUPTED" : "";
            return [formatLatency(value), label + interrupted];
          }}
          labelFormatter={(turn) => `Turn ${turn}`}
        />
        <ChartLegend />

        {/* Show lines only for metrics that have data */}
        {hasData.pipelineTotal && (
          <Line
            type="monotone"
            dataKey="pipelineTotal"
            name="Pipeline Total"
            stroke={chartPalette[0]}
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ r: 6 }}
          />
        )}
        {hasData.llmProcessing && (
          <Line
            type="monotone"
            dataKey="llmProcessing"
            name="LLM Processing"
            stroke={chartPalette[1]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
        {hasData.llmTtfb && (
          <Line
            type="monotone"
            dataKey="llmTtfb"
            name="LLM TTFB"
            stroke={chartPalette[2]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
        {hasData.sttDelay && (
          <Line
            type="monotone"
            dataKey="sttDelay"
            name="STT Delay"
            stroke={chartPalette[3]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
        {hasData.llmToTts && (
          <Line
            type="monotone"
            dataKey="llmToTts"
            name="LLM→TTS Gap"
            stroke={chartPalette[4]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
        {hasData.ragProcessing && (
          <Line
            type="monotone"
            dataKey="ragProcessing"
            name="RAG Processing"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
        {hasData.variableExtraction && (
          <Line
            type="monotone"
            dataKey="variableExtraction"
            name="Variable Extraction"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
      </LineChart>
    </ChartContainer>
  );
}
