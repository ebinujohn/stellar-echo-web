import { useQuery } from '@tanstack/react-query';
import type {
  CallDetail,
  CallMetrics,
  CallAnalysisData,
  TranscriptEntry,
  TimelineEvent,
} from '@/lib/db/queries/call-details';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Hook to fetch call detail
 */
export function useCallDetail(callId: string) {
  return useQuery({
    queryKey: ['call-detail', callId],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch call detail');
      }
      const json = await response.json() as ApiResponse<CallDetail>;
      return json.data;
    },
    enabled: !!callId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch call timeline
 */
export function useCallTimeline(callId: string) {
  return useQuery({
    queryKey: ['call-timeline', callId],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}/timeline`);
      if (!response.ok) {
        throw new Error('Failed to fetch call timeline');
      }
      const json = await response.json() as ApiResponse<TimelineEvent[]>;
      return json.data;
    },
    enabled: !!callId,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch call metrics
 */
export function useCallMetrics(callId: string) {
  return useQuery({
    queryKey: ['call-metrics', callId],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}/metrics`);
      if (!response.ok) {
        throw new Error('Failed to fetch call metrics');
      }
      const json = await response.json() as ApiResponse<CallMetrics>;
      return json.data;
    },
    enabled: !!callId,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch call analysis
 */
export function useCallAnalysis(callId: string) {
  return useQuery({
    queryKey: ['call-analysis', callId],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}/analysis`);
      if (!response.ok) {
        throw new Error('Failed to fetch call analysis');
      }
      const json = await response.json() as ApiResponse<CallAnalysisData>;
      return json.data;
    },
    enabled: !!callId,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch call transcript
 */
export function useCallTranscript(callId: string) {
  return useQuery({
    queryKey: ['call-transcript', callId],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}/transcript`);
      if (!response.ok) {
        throw new Error('Failed to fetch call transcript');
      }
      const json = await response.json() as ApiResponse<TranscriptEntry[]>;
      return json.data;
    },
    enabled: !!callId,
    staleTime: 60000,
  });
}
