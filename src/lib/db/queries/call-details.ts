import { db } from '@/lib/db';
import {
  calls,
  callMessages,
  callTransitions,
  callTranscripts,
  callMetricsSummary,
  callAnalysis
} from '@/lib/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

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

export interface CallMetrics {
  callId: string;
  avgLlmTtfbMs: number | null;
  avgPipelineTotalMs: number | null;
  totalLlmTokens: number | null;
  totalTtsCharacters: number | null;
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
export async function getCallDetail(callId: string, tenantId: string): Promise<CallDetail | null> {
  const result = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
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
export async function getCallMessages(callId: string, tenantId: string): Promise<CallMessage[]> {
  // Verify call belongs to tenant
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
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
export async function getCallTransitions(callId: string, tenantId: string): Promise<CallTransition[]> {
  // Verify call belongs to tenant
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
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
 * Get metrics summary for a call
 */
export async function getCallMetrics(callId: string, tenantId: string): Promise<CallMetrics | null> {
  // Verify call belongs to tenant
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
  });

  if (!call) return null;

  const metrics = await db.query.callMetricsSummary.findFirst({
    where: eq(callMetricsSummary.callId, callId),
  });

  if (!metrics) return null;

  return {
    callId: metrics.callId,
    avgLlmTtfbMs: metrics.avgLlmTtfbMs ? Number(metrics.avgLlmTtfbMs) : null,
    avgPipelineTotalMs: metrics.avgPipelineTotalMs ? Number(metrics.avgPipelineTotalMs) : null,
    totalLlmTokens: metrics.totalLlmTokens,
    totalTtsCharacters: metrics.totalTtsCharacters,
  };
}

/**
 * Get analysis data for a call
 */
export async function getCallAnalysis(callId: string, tenantId: string): Promise<CallAnalysisData | null> {
  // Verify call belongs to tenant
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
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
export async function getCallTranscript(callId: string, tenantId: string): Promise<TranscriptEntry[]> {
  // Verify call belongs to tenant
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
  });

  if (!call) return [];

  const transcript = await db.query.callTranscripts.findFirst({
    where: eq(callTranscripts.callId, callId),
  });

  if (!transcript) return [];

  // If transcript is in JSON format, parse it
  if (transcript.transcriptData && Array.isArray(transcript.transcriptData)) {
    return transcript.transcriptData.map((entry: any, index: number) => ({
      id: `${callId}-${index}`,
      speaker: entry.speaker || 'Unknown',
      text: entry.text || entry.content || '',
      timestamp: entry.timestamp ? new Date(entry.timestamp) : null,
      confidence: entry.confidence || null,
    }));
  }

  // If only text transcript is available, return as single entry
  if (transcript.transcriptText) {
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

export async function getCallTimeline(callId: string, tenantId: string): Promise<TimelineEvent[]> {
  // Verify call belongs to tenant
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.callId, callId),
      eq(calls.tenantId, tenantId)
    ),
  });

  if (!call) return [];

  const [messages, transitions, transcript] = await Promise.all([
    getCallMessages(callId, tenantId),
    getCallTransitions(callId, tenantId),
    getCallTranscript(callId, tenantId),
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
