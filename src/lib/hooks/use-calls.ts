import { useQuery } from '@tanstack/react-query';
import type { CallFilters, PaginatedResponse, CallListItem, KPIMetrics } from '@/types';

interface CallsQueryParams extends CallFilters {
  page?: number;
  pageSize?: number;
}

export function useCalls(params: CallsQueryParams = {}) {
  return useQuery({
    queryKey: ['calls', params],
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
    staleTime: 30000, // 30 seconds
  });
}

export function useCallsStats(filters?: { startDate?: Date; endDate?: Date }) {
  return useQuery({
    queryKey: ['calls-stats', filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (filters?.startDate) {
        searchParams.set('startDate', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        searchParams.set('endDate', filters.endDate.toISOString());
      }

      const response = await fetch(`/api/calls/stats?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const json = await response.json();
      return json.data as KPIMetrics;
    },
    staleTime: 60000, // 1 minute
  });
}

