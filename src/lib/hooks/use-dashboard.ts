import { useQuery } from '@tanstack/react-query';

interface CallVolumeData {
  date: string;
  count: number;
}

interface SentimentDistributionData {
  sentiment: string | null;
  count: number;
}

async function fetchCallVolume(days: number = 7): Promise<CallVolumeData[]> {
  const response = await fetch(`/api/dashboard/call-volume?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch call volume data');
  }
  const json = await response.json();
  return json.data;
}

async function fetchSentimentDistribution(): Promise<SentimentDistributionData[]> {
  const response = await fetch('/api/dashboard/sentiment-distribution');
  if (!response.ok) {
    throw new Error('Failed to fetch sentiment distribution');
  }
  const json = await response.json();
  return json.data;
}

export function useCallVolume(days: number = 7) {
  return useQuery({
    queryKey: ['dashboard', 'call-volume', days],
    queryFn: () => fetchCallVolume(days),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useSentimentDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'sentiment-distribution'],
    queryFn: fetchSentimentDistribution,
    staleTime: 60 * 1000, // 1 minute
  });
}
