import { db } from '@/lib/db';
import {
  calls,
  callMessages,
  callTransitions,
  callTranscripts,
  callMetricsSummary,
  callAnalysis
} from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { tenantFilter, type QueryContext } from './utils';

export interface CallDetail {
  callId: string;
  agentId: string | null;
  agentName: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  totalMessages: number | null;
  recordingUrl: string | null;
}

export interface CallMessage {
  id: string;
  role: string;
  content: string;
  timestamp: Date | null;
  latencyMs: number | null;
  tokensUsed: number | null;
}

export interface CallTransition {
  id: string;
  fromState: string | null;
  toState: string | null;
  timestamp: Date;
  reason: string | null;
}

export interface TurnMetrics {
  turnNumber: number;
  timestamp?: string;
  sttDelayMs?: number;
  userToBotLatencyMs?: number;
  transcriptLlmGapMs?: number;
  llmProcessingMs?: number;
  llmToTtsGapMs?: number;
  pipelineTotalMs?: number;
  ragProcessingMs?: number;
  variableExtractionMs?: number;
  llmTtfbMs?: number;
  wasInterrupted?: boolean;
}

export interface CallMetrics {
  callId: string;
  // LLM TTFB
  avgLlmTtfbMs: number | null;
  minLlmTtfbMs: number | null;
  maxLlmTtfbMs: number | null;
  // Pipeline Total
  avgPipelineTotalMs: number | null;
  minPipelineTotalMs: number | null;
  maxPipelineTotalMs: number | null;
  // STT Delay
  avgSttDelayMs: number | null;
  minSttDelayMs: number | null;
  maxSttDelayMs: number | null;
  // STT TTFB (Pipecat)
  avgSttTtfbMs: number | null;
  minSttTtfbMs: number | null;
  maxSttTtfbMs: number | null;
  // STT Processing (Pipecat) - Recommended for Deepgram Flux
  avgSttProcessingMs: number | null;
  minSttProcessingMs: number | null;
  maxSttProcessingMs: number | null;
  // LLM Processing
  avgLlmProcessingMs: number | null;
  minLlmProcessingMs: number | null;
  maxLlmProcessingMs: number | null;
  // User to Bot Latency
  avgUserToBotLatencyMs: number | null;
  minUserToBotLatencyMs: number | null;
  maxUserToBotLatencyMs: number | null;
  // Transcript to LLM Gap
  avgTranscriptLlmGapMs: number | null;
  minTranscriptLlmGapMs: number | null;
  maxTranscriptLlmGapMs: number | null;
  // LLM to TTS Gap
  avgLlmToTtsGapMs: number | null;
  minLlmToTtsGapMs: number | null;
  maxLlmToTtsGapMs: number | null;
  // TTS TTFB (Pipecat)
  avgTtsTtfbMs: number | null;
  minTtsTtfbMs: number | null;
  maxTtsTtfbMs: number | null;
  // RAG Processing
  avgRagProcessingMs: number | null;
  minRagProcessingMs: number | null;
  maxRagProcessingMs: number | null;
  // Variable Extraction
  avgVariableExtractionMs: number | null;
  minVariableExtractionMs: number | null;
  maxVariableExtractionMs: number | null;
  // Tokens and Characters
  totalLlmTokens: number | null;
  totalTtsCharacters: number | null;
  // Turn data
  metricsData: TurnMetrics[] | null;
  totalTurns: number | null;
  totalInterruptions: number | null;
}

export interface CallAnalysisData {
  callId: string;
  sentiment: string | null;
  sentimentScore: number | null;
  summary: string | null;
  keyTopics: string[] | null;
  keywords: string[] | null;
  actionItems: string[] | null;
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date | null;
  confidence: number | null;
}

export interface TranscriptData {
  callId: string;
  transcriptText: string | null;
  transcriptJson: any;
  wordCount: number | null;
}

/**
 * Get call basic details
 */
export async function getCallDetail(callId: string, ctx: QueryContext): Promise<CallDetail | null> {
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const result = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!result) return null;

  return {
    callId: result.callId,
    agentId: result.agentId,
    agentName: result.agentName,
    fromNumber: result.fromNumber,
    toNumber: result.toNumber,
    status: result.status,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    durationSeconds: result.durationSeconds,
    totalMessages: result.totalMessages,
    recordingUrl: result.recordingUrl,
  };
}

/**
 * Get all messages for a call
 */
export async function getCallMessages(callId: string, ctx: QueryContext): Promise<CallMessage[]> {
  // Verify call belongs to tenant (or is accessible by global user)
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) return [];

  const messages = await db.query.callMessages.findMany({
    where: eq(callMessages.callId, callId),
    orderBy: [asc(callMessages.timestamp)],
  });

  return messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    latencyMs: null, // Not available in schema
    tokensUsed: null, // Not available in schema
  }));
}

/**
 * Get all state transitions for a call
 */
export async function getCallTransitions(callId: string, ctx: QueryContext): Promise<CallTransition[]> {
  // Verify call belongs to tenant (or is accessible by global user)
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) return [];

  const transitions = await db.query.callTransitions.findMany({
    where: eq(callTransitions.callId, callId),
    orderBy: [asc(callTransitions.timestamp)],
  });

  return transitions.map(t => ({
    id: t.id,
    fromState: t.fromNodeId,
    toState: t.toNodeId,
    timestamp: t.timestamp,
    reason: t.reason,
  }));
}

/**
 * Helper to extract metric values from JSONB metrics_data
 * The orchestrator stores metrics in format: { metric_name: { avg, min, max, num, values } }
 */
interface MetricValue {
  avg?: number;
  min?: number;
  max?: number;
  num?: number;
  values?: number[];
}

function extractMetric(metricsData: Record<string, MetricValue> | null, key: string): { avg: number | null; min: number | null; max: number | null } {
  if (!metricsData || !metricsData[key]) {
    return { avg: null, min: null, max: null };
  }
  const metric = metricsData[key];
  return {
    avg: metric.avg ?? null,
    min: metric.min ?? null,
    max: metric.max ?? null,
  };
}

/**
 * Get metrics summary for a call
 * Note: Most metrics are extracted from the metrics_data JSONB column since
 * the database only has a few denormalized avg columns. The orchestrator stores
 * complete metrics in JSONB format.
 */
export async function getCallMetrics(callId: string, ctx: QueryContext): Promise<CallMetrics | null> {
  // Verify call belongs to tenant (or is accessible by global user)
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) return null;

  const metrics = await db.query.callMetricsSummary.findFirst({
    where: eq(callMetricsSummary.callId, callId),
  });

  if (!metrics) return null;

  // Parse metricsData JSONB field - contains complete metrics from orchestrator
  // Structure: { metric_name: { avg, min, max, num, values: [...] } }
  const metricsData = metrics.metricsData as Record<string, MetricValue> | null;

  // Extract per-turn metrics array if available (for timeline/chart display)
  let parsedTurnData: TurnMetrics[] | null = null;
  if (metricsData && Array.isArray(metricsData)) {
    parsedTurnData = metricsData as unknown as TurnMetrics[];
  }

  // Get actual turn count and interruptions from call data
  const totalTurns = call.totalTurns || 0;
  const totalInterruptions = call.totalUserInterruptions || 0;

  // Extract metrics from JSONB - using orchestrator's key naming convention
  // Keys: stt_delay, user_to_bot_latency, llm_processing, llm_ttfb, pipeline_total,
  //       transcript_llm_gap, llm_to_tts_gap, rag_processing_time, variable_extraction_time,
  //       stt_ttfb, stt_processing_time, tts_ttfb
  const sttDelay = extractMetric(metricsData, 'stt_delay');
  const userToBotLatency = extractMetric(metricsData, 'user_to_bot_latency');
  const llmProcessing = extractMetric(metricsData, 'llm_processing');
  const llmTtfb = extractMetric(metricsData, 'llm_ttfb');
  const pipelineTotal = extractMetric(metricsData, 'pipeline_total');
  const transcriptLlmGap = extractMetric(metricsData, 'transcript_llm_gap');
  const llmToTtsGap = extractMetric(metricsData, 'llm_to_tts_gap');
  const ragProcessing = extractMetric(metricsData, 'rag_processing_time');
  const variableExtraction = extractMetric(metricsData, 'variable_extraction_time');
  const sttTtfb = extractMetric(metricsData, 'stt_ttfb');
  const sttProcessing = extractMetric(metricsData, 'stt_processing_time');
  const ttsTtfb = extractMetric(metricsData, 'tts_ttfb');

  return {
    callId: metrics.callId,
    // LLM TTFB - prefer JSONB, fallback to denormalized column
    avgLlmTtfbMs: llmTtfb.avg ?? (metrics.avgLlmTtfbMs ? Number(metrics.avgLlmTtfbMs) : null),
    minLlmTtfbMs: llmTtfb.min,
    maxLlmTtfbMs: llmTtfb.max,
    // Pipeline Total - prefer JSONB, fallback to denormalized column
    avgPipelineTotalMs: pipelineTotal.avg ?? (metrics.avgPipelineTotalMs ? Number(metrics.avgPipelineTotalMs) : null),
    minPipelineTotalMs: pipelineTotal.min,
    maxPipelineTotalMs: pipelineTotal.max,
    // STT Delay - prefer JSONB, fallback to denormalized column
    avgSttDelayMs: sttDelay.avg ?? (metrics.avgSttDelayMs ? Number(metrics.avgSttDelayMs) : null),
    minSttDelayMs: sttDelay.min,
    maxSttDelayMs: sttDelay.max,
    // STT TTFB (from JSONB only - often empty for Deepgram Flux)
    avgSttTtfbMs: sttTtfb.avg,
    minSttTtfbMs: sttTtfb.min,
    maxSttTtfbMs: sttTtfb.max,
    // STT Processing (from JSONB only)
    avgSttProcessingMs: sttProcessing.avg,
    minSttProcessingMs: sttProcessing.min,
    maxSttProcessingMs: sttProcessing.max,
    // LLM Processing (from JSONB only)
    avgLlmProcessingMs: llmProcessing.avg,
    minLlmProcessingMs: llmProcessing.min,
    maxLlmProcessingMs: llmProcessing.max,
    // User to Bot Latency - prefer JSONB, fallback to denormalized column
    avgUserToBotLatencyMs: userToBotLatency.avg ?? (metrics.avgUserToBotLatencyMs ? Number(metrics.avgUserToBotLatencyMs) : null),
    minUserToBotLatencyMs: userToBotLatency.min,
    maxUserToBotLatencyMs: userToBotLatency.max,
    // Transcript to LLM Gap (from JSONB only)
    avgTranscriptLlmGapMs: transcriptLlmGap.avg,
    minTranscriptLlmGapMs: transcriptLlmGap.min,
    maxTranscriptLlmGapMs: transcriptLlmGap.max,
    // LLM to TTS Gap (from JSONB only)
    avgLlmToTtsGapMs: llmToTtsGap.avg,
    minLlmToTtsGapMs: llmToTtsGap.min,
    maxLlmToTtsGapMs: llmToTtsGap.max,
    // TTS TTFB (from JSONB only - often empty for ElevenLabs WebSocket)
    avgTtsTtfbMs: ttsTtfb.avg,
    minTtsTtfbMs: ttsTtfb.min,
    maxTtsTtfbMs: ttsTtfb.max,
    // RAG Processing (from JSONB only)
    avgRagProcessingMs: ragProcessing.avg,
    minRagProcessingMs: ragProcessing.min,
    maxRagProcessingMs: ragProcessing.max,
    // Variable Extraction (from JSONB only)
    avgVariableExtractionMs: variableExtraction.avg,
    minVariableExtractionMs: variableExtraction.min,
    maxVariableExtractionMs: variableExtraction.max,
    // Tokens and Characters (from denormalized columns)
    totalLlmTokens: metrics.totalLlmTokens,
    totalTtsCharacters: metrics.totalTtsCharacters,
    // Turn data
    metricsData: parsedTurnData,
    totalTurns,
    totalInterruptions,
  };
}

/**
 * Get analysis data for a call
 */
export async function getCallAnalysis(callId: string, ctx: QueryContext): Promise<CallAnalysisData | null> {
  // Verify call belongs to tenant (or is accessible by global user)
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) return null;

  const analysis = await db.query.callAnalysis.findFirst({
    where: eq(callAnalysis.callId, callId),
  });

  if (!analysis) return null;

  return {
    callId: analysis.callId,
    sentiment: analysis.sentiment,
    sentimentScore: analysis.sentimentScore ? Number(analysis.sentimentScore) : null,
    summary: analysis.summary,
    keyTopics: analysis.topicsDiscussed,
    keywords: analysis.keywordsDetected,
    actionItems: [], // Not available in schema
  };
}

/**
 * Get transcript entries for a call
 */
export async function getCallTranscript(callId: string, ctx: QueryContext): Promise<TranscriptEntry[]> {
  // Verify call belongs to tenant (or is accessible by global user)
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) return [];

  const transcript = await db.query.callTranscripts.findFirst({
    where: eq(callTranscripts.callId, callId),
  });

  if (!transcript) return [];

  // Handle transcript_data JSONB field with multiple possible structures
  if (transcript.transcriptData) {
    const data = transcript.transcriptData as any;

    // Case 1: Direct array of transcript entries
    if (Array.isArray(data)) {
      return data.map((entry: any, index: number) => ({
        id: `${callId}-${index}`,
        speaker: entry.speaker || entry.role || entry.name || 'Unknown',
        text: entry.text || entry.content || entry.message || '',
        timestamp: entry.timestamp ? new Date(entry.timestamp) : null,
        confidence: entry.confidence || entry.score || null,
      }));
    }

    // Case 2: Object with 'entries' or 'messages' or 'turns' array
    if (data.entries && Array.isArray(data.entries)) {
      return data.entries.map((entry: any, index: number) => ({
        id: `${callId}-${index}`,
        speaker: entry.speaker || entry.role || entry.name || 'Unknown',
        text: entry.text || entry.content || entry.message || '',
        timestamp: entry.timestamp ? new Date(entry.timestamp) : null,
        confidence: entry.confidence || entry.score || null,
      }));
    }

    if (data.messages && Array.isArray(data.messages)) {
      return data.messages.map((entry: any, index: number) => ({
        id: `${callId}-${index}`,
        speaker: entry.speaker || entry.role || entry.from || 'Unknown',
        text: entry.text || entry.content || entry.message || '',
        timestamp: entry.timestamp || entry.time ? new Date(entry.timestamp || entry.time) : null,
        confidence: entry.confidence || entry.score || null,
      }));
    }

    if (data.turns && Array.isArray(data.turns)) {
      return data.turns.map((entry: any, index: number) => ({
        id: `${callId}-${index}`,
        speaker: entry.speaker || entry.role || entry.who || 'Unknown',
        text: entry.text || entry.content || entry.message || '',
        timestamp: entry.timestamp || entry.time ? new Date(entry.timestamp || entry.time) : null,
        confidence: entry.confidence || entry.score || null,
      }));
    }

    // Case 3: Object with speaker and text directly (single entry)
    if (data.speaker && data.text) {
      return [{
        id: callId,
        speaker: data.speaker,
        text: data.text,
        timestamp: data.timestamp ? new Date(data.timestamp) : null,
        confidence: data.confidence || null,
      }];
    }
  }

  // Fallback: If only text transcript is available, return as single entry
  if (transcript.transcriptText) {
    // Try to parse the text if it contains speaker labels
    const lines = transcript.transcriptText.split('\n').filter(line => line.trim());

    // Pattern: "Speaker: text" or "[Speaker] text" or "Speaker - text"
    const speakerPattern = /^(?:\[)?([^:\]\-]+)(?:\])?[\:\-]\s*(.+)$/;

    const parsedEntries: TranscriptEntry[] = [];
    const currentSpeaker = 'System';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(speakerPattern);

      if (match) {
        parsedEntries.push({
          id: `${callId}-${i}`,
          speaker: match[1].trim(),
          text: match[2].trim(),
          timestamp: null,
          confidence: null,
        });
      } else if (line) {
        // If no speaker pattern, use previous speaker or 'System'
        parsedEntries.push({
          id: `${callId}-${i}`,
          speaker: currentSpeaker,
          text: line,
          timestamp: null,
          confidence: null,
        });
      }
    }

    // If we successfully parsed entries, return them
    if (parsedEntries.length > 0) {
      return parsedEntries;
    }

    // Otherwise return as single block
    return [{
      id: callId,
      speaker: 'System',
      text: transcript.transcriptText,
      timestamp: null,
      confidence: null,
    }];
  }

  return [];
}

/**
 * Get unified timeline combining messages, transitions, and other events
 */
export interface TimelineEvent {
  id: string;
  type: 'message' | 'transition' | 'transcript';
  timestamp: Date;
  data: any;
}

export async function getCallTimeline(callId: string, ctx: QueryContext): Promise<TimelineEvent[]> {
  // Verify call belongs to tenant (or is accessible by global user)
  const conditions = [eq(calls.callId, callId)];
  const tenantCondition = tenantFilter(calls.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const call = await db.query.calls.findFirst({
    where: and(...conditions),
  });

  if (!call) return [];

  const [messages, transitions, transcript] = await Promise.all([
    getCallMessages(callId, ctx),
    getCallTransitions(callId, ctx),
    getCallTranscript(callId, ctx),
  ]);

  const timeline: TimelineEvent[] = [];

  // Add messages
  messages.forEach(msg => {
    if (msg.timestamp) {
      timeline.push({
        id: `msg-${msg.id}`,
        type: 'message',
        timestamp: msg.timestamp,
        data: msg,
      });
    }
  });

  // Add transitions
  transitions.forEach(t => {
    timeline.push({
      id: `trans-${t.id}`,
      type: 'transition',
      timestamp: t.timestamp,
      data: t,
    });
  });

  // Add transcript entries
  transcript.forEach(entry => {
    if (entry.timestamp) {
      timeline.push({
        id: `transcript-${entry.id}`,
        type: 'transcript',
        timestamp: entry.timestamp,
        data: entry,
      });
    }
  });

  // Sort by timestamp
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return timeline;
}
