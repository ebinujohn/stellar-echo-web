import { VoiceConfigDetailClient } from '@/components/settings/voice/voice-config-detail-client';

interface VoiceConfigDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VoiceConfigDetailPage({ params }: VoiceConfigDetailPageProps) {
  const { id } = await params;
  return <VoiceConfigDetailClient voiceConfigId={id} />;
}
