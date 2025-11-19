import { useQuery } from '@tanstack/react-query';

interface Agent {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  callCount: number;
  activeVersion: number | null;
}

async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents');
  if (!response.ok) {
    throw new Error('Failed to fetch agents');
  }
  const json = await response.json();
  return json.data;
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
