"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatLatency } from "@/lib/utils/formatters";
import type { CallMetrics } from "@/lib/db/queries/call-details";

interface ComprehensiveMetricsTableProps {
  metrics: CallMetrics;
}

interface MetricRow {
  name: string;
  description: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  category: "primary" | "processing" | "gaps" | "optional";
}

export function ComprehensiveMetricsTable({ metrics }: ComprehensiveMetricsTableProps) {
  const metricRows: MetricRow[] = [
    // Primary Metrics
    {
      name: "User→Bot Latency",
      description: "Most important UX metric - User stopped speaking → Bot started speaking",
      avg: metrics.avgUserToBotLatencyMs,
      min: metrics.minUserToBotLatencyMs,
      max: metrics.maxUserToBotLatencyMs,
      category: "primary",
    },
    {
      name: "Pipeline Total",
      description: "User stopped speaking → TTS audio ready",
      avg: metrics.avgPipelineTotalMs,
      min: metrics.minPipelineTotalMs,
      max: metrics.maxPipelineTotalMs,
      category: "primary",
    },
    // Processing Metrics
    {
      name: "STT Processing",
      description: "Recommended metric for Deepgram Flux (100-300ms)",
      avg: metrics.avgSttProcessingMs,
      min: metrics.minSttProcessingMs,
      max: metrics.maxSttProcessingMs,
      category: "processing",
    },
    {
      name: "STT Delay",
      description: "User stopped → Transcript received (usually 0-10ms for Flux)",
      avg: metrics.avgSttDelayMs,
      min: metrics.minSttDelayMs,
      max: metrics.maxSttDelayMs,
      category: "processing",
    },
    {
      name: "STT TTFB",
      description: "Deepgram API → First response (N/A for Flux)",
      avg: metrics.avgSttTtfbMs,
      min: metrics.minSttTtfbMs,
      max: metrics.maxSttTtfbMs,
      category: "processing",
    },
    {
      name: "LLM Processing",
      description: "LLM start → Response complete (400-2000ms)",
      avg: metrics.avgLlmProcessingMs,
      min: metrics.minLlmProcessingMs,
      max: metrics.maxLlmProcessingMs,
      category: "processing",
    },
    {
      name: "LLM TTFB",
      description: "OpenAI API → First token (200-800ms)",
      avg: metrics.avgLlmTtfbMs,
      min: metrics.minLlmTtfbMs,
      max: metrics.maxLlmTtfbMs,
      category: "processing",
    },
    {
      name: "TTS TTFB",
      description: "ElevenLabs API → First audio chunk (200-500ms)",
      avg: metrics.avgTtsTtfbMs,
      min: metrics.minTtsTtfbMs,
      max: metrics.maxTtsTtfbMs,
      category: "processing",
    },
    // Gap Metrics
    {
      name: "Transcript→LLM Gap",
      description: "Framework overhead between transcript and LLM (1-50ms)",
      avg: metrics.avgTranscriptLlmGapMs,
      min: metrics.minTranscriptLlmGapMs,
      max: metrics.maxTranscriptLlmGapMs,
      category: "gaps",
    },
    {
      name: "LLM→TTS Gap",
      description: "Framework overhead between LLM and TTS (100-300ms)",
      avg: metrics.avgLlmToTtsGapMs,
      min: metrics.minLlmToTtsGapMs,
      max: metrics.maxLlmToTtsGapMs,
      category: "gaps",
    },
    // Optional Metrics
    {
      name: "RAG Processing",
      description: "Knowledge base query time (300-800ms)",
      avg: metrics.avgRagProcessingMs,
      min: metrics.minRagProcessingMs,
      max: metrics.maxRagProcessingMs,
      category: "optional",
    },
    {
      name: "Variable Extraction",
      description: "LLM-based variable extraction (500-2000ms)",
      avg: metrics.avgVariableExtractionMs,
      min: metrics.minVariableExtractionMs,
      max: metrics.maxVariableExtractionMs,
      category: "optional",
    },
  ];

  // Filter out metrics that have no data
  const activeMetrics = metricRows.filter(
    (row) => row.avg !== null || row.min !== null || row.max !== null
  );

  if (activeMetrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No latency metrics available</p>
      </div>
    );
  }

  const getCategoryBadge = (category: string) => {
    const styles = {
      primary: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      processing: "bg-green-500/10 text-green-500 border-green-500/20",
      gaps: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      optional: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    const labels = {
      primary: "Primary",
      processing: "Processing",
      gaps: "Gaps",
      optional: "Optional",
    };
    return (
      <Badge variant="outline" className={`text-xs ${styles[category as keyof typeof styles]}`}>
        {labels[category as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Metric</TableHead>
            <TableHead className="w-[300px]">Description</TableHead>
            <TableHead className="text-right w-[100px]">Min</TableHead>
            <TableHead className="text-right w-[100px]">Average</TableHead>
            <TableHead className="text-right w-[100px]">Max</TableHead>
            <TableHead className="w-[100px]">Category</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeMetrics.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.description}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.min !== null ? formatLatency(row.min) : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-medium">
                {row.avg !== null ? formatLatency(row.avg) : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.max !== null ? formatLatency(row.max) : "—"}
              </TableCell>
              <TableCell>{getCategoryBadge(row.category)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
