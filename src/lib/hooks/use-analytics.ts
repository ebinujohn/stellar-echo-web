import { useQuery } from '@tanstack/react-query';

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

async function fetchLatencyByAgent(): Promise<LatencyByAgentData[]> {
  const response = await fetch('/api/analytics/latency-by-agent');
  if (!response.ok) {
    throw new Error('Failed to fetch latency by agent data');
  }
  const json = await response.json();
  return json.data;
}

async function fetchTokenUsageTrends(days: number = 30): Promise<TokenUsageTrendsData[]> {
  const response = await fetch(`/api/analytics/token-usage-trends?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch token usage trends');
  }
  const json = await response.json();
  return json.data;
}

export function useLatencyByAgent() {
  return useQuery({
    queryKey: ['analytics', 'latency-by-agent'],
    queryFn: fetchLatencyByAgent,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTokenUsageTrends(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'token-usage-trends', days],
    queryFn: () => fetchTokenUsageTrends(days),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
