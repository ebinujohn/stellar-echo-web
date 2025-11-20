import { AgentDetailClient } from '@/components/agents/agent-detail-client';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <AgentDetailClient agentId={id} />;
}
