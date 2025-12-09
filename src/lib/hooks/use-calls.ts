import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type { CallFilters, PaginatedResponse, CallListItem, KPIMetrics } from '@/types';

interface CallsQueryParams extends CallFilters {
  page?: number;
  pageSize?: number;
}

export function useCalls(params: CallsQueryParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.calls.all(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (params.page) searchParams.set('page', params.page.toString());
      if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
      if (params.status) searchParams.set('status', params.status);
      if (params.direction) searchParams.set('direction', params.direction);
      if (params.agentId) searchParams.set('agentId', params.agentId);
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString());
      if (params.fromNumber) searchParams.set('fromNumber', params.fromNumber);
      if (params.toNumber) searchParams.set('toNumber', params.toNumber);
      if (params.search) searchParams.set('search', params.search);

      const response = await fetch(`/api/calls?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch calls');
      }

      const json = await response.json();
      return json as PaginatedResponse<CallListItem>;
    },
    staleTime: STALE_TIMES.CALLS_LIST,
  });
}

export function useCallsStats(filters?: { startDate?: Date; endDate?: Date }) {
  return useQuery({
    queryKey: QUERY_KEYS.calls.stats(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (filters?.startDate) {
        searchParams.set('startDate', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        searchParams.set('endDate', filters.endDate.toISOString());
      }

      return apiFetch<KPIMetrics>(`/api/calls/stats?${searchParams.toString()}`);
    },
    staleTime: STALE_TIMES.STATS,
  });
}

// ============================================================================
// Outbound Call Types and Hooks
// ============================================================================

export interface InitiateOutboundCallParams {
  agentId: string;
  toNumber: string;
  fromNumber?: string;
  version?: number;
  metadata?: Record<string, unknown>;
}

export interface OutboundCallResponse {
  callId: string;
  twilioCallSid: string;
  status: string;
  direction: 'outbound';
  fromNumber: string;
  toNumber: string;
  agentId: string;
  agentName: string;
  agentConfigVersion: number;
  createdAt: string;
}

export interface CallStatusResponse {
  callId: string;
  twilioCallSid: string;
  status: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  agentId: string;
  agentName: string;
  startedAt: string;
  connectedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
}

/**
 * Hook for initiating an outbound call
 */
export function useInitiateOutboundCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: InitiateOutboundCallParams): Promise<OutboundCallResponse> => {
      const response = await fetch(`/api/agents/${params.agentId}/calls/outbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toNumber: params.toNumber,
          fromNumber: params.fromNumber,
          version: params.version,
          metadata: params.metadata,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || json.data?.error || 'Failed to initiate call');
      }

      return json.data as OutboundCallResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calls.all() });
    },
  });
}

/**
 * Hook for polling call status
 */
export function useCallStatus(callId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: ['call-status', callId] as const,
    queryFn: async (): Promise<CallStatusResponse> => {
      if (!callId) throw new Error('Call ID is required');

      const response = await fetch(`/api/calls/${callId}/status`);
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || json.data?.error || 'Failed to get call status');
      }

      return json.data as CallStatusResponse;
    },
    enabled: !!callId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 5000, // 5 seconds
  });
}

