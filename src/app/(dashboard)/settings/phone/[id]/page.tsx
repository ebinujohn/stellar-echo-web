import { PhoneConfigDetailClient } from '@/components/settings/phone/phone-config-detail-client';

interface PhoneConfigDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PhoneConfigDetailPage({ params }: PhoneConfigDetailPageProps) {
  const { id } = await params;
  return <PhoneConfigDetailClient phoneConfigId={id} />;
}
