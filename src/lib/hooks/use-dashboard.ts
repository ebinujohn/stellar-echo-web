import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';

interface CallVolumeData {
  date: string;
  count: number;
}

interface SentimentDistributionData {
  sentiment: string | null;
  count: number;
}

export function useCallVolume(days: number = 7) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.callVolume({ days }),
    queryFn: () => apiFetch<CallVolumeData[]>(`/api/dashboard/call-volume?days=${days}`),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

export function useSentimentDistribution() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.sentimentDistribution(),
    queryFn: () => apiFetch<SentimentDistributionData[]>('/api/dashboard/sentiment-distribution'),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}
