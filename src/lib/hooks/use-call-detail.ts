import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type {
  CallDetail,
  CallMetrics,
  CallAnalysisData,
  TranscriptEntry,
} from '@/lib/db/queries/call-details';
import type { CallDebugTraceResponse } from '@/lib/external-apis/admin-api';

export function useCallDetail(callId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.calls.detail(callId),
    queryFn: () => apiFetch<CallDetail>(`/api/calls/${callId}`),
    enabled: !!callId,
    staleTime: STALE_TIMES.CALL_DETAIL,
  });
}

export function useCallMetrics(callId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.calls.metrics(callId),
    queryFn: () => apiFetch<CallMetrics>(`/api/calls/${callId}/metrics`),
    enabled: !!callId,
    staleTime: STALE_TIMES.CALL_DETAIL,
  });
}

export function useCallAnalysis(callId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.calls.analysis(callId),
    queryFn: () => apiFetch<CallAnalysisData>(`/api/calls/${callId}/analysis`),
    enabled: !!callId,
    staleTime: STALE_TIMES.CALL_DETAIL,
  });
}

export function useCallTranscript(callId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.calls.transcript(callId),
    queryFn: () => apiFetch<TranscriptEntry[]>(`/api/calls/${callId}/transcript`),
    enabled: !!callId,
    staleTime: STALE_TIMES.CALL_DETAIL,
  });
}

export function useCallDebug(callId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.calls.debug(callId),
    queryFn: () => apiFetch<CallDebugTraceResponse>(`/api/calls/${callId}/debug`),
    enabled: !!callId,
    staleTime: STALE_TIMES.CALL_DETAIL,
  });
}
