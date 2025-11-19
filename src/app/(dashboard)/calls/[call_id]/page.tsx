import { CallDetailClient } from '@/components/calls/call-detail-client';

interface CallDetailPageProps {
  params: Promise<{
    call_id: string;
  }>;
}

export default async function CallDetailPage({ params }: CallDetailPageProps) {
  const { call_id } = await params;
  return <CallDetailClient callId={call_id} />;
}
