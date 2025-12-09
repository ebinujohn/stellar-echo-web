import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';

interface LatencyByAgentData {
  agentId: string | null;
  agentName: string | null;
  avgLatency: number;
  callCount: number;
}

interface TokenUsageTrendsData {
  date: string;
  totalTokens: number;
  totalTtsChars: number;
  callCount: number;
}

export function useLatencyByAgent() {
  return useQuery({
    queryKey: QUERY_KEYS.analytics.latencyByAgent(),
    queryFn: () => apiFetch<LatencyByAgentData[]>('/api/analytics/latency-by-agent'),
    staleTime: STALE_TIMES.ANALYTICS,
  });
}

export function useTokenUsageTrends(days: number = 30) {
  return useQuery({
    queryKey: QUERY_KEYS.analytics.tokenUsageTrends({ days }),
    queryFn: () => apiFetch<TokenUsageTrendsData[]>(`/api/analytics/token-usage-trends?days=${days}`),
    staleTime: STALE_TIMES.ANALYTICS,
  });
}
