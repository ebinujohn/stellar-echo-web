'use client';

import { use } from 'react';
import { RagConfigDetailClient } from '@/components/settings/rag/rag-config-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RagConfigDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <RagConfigDetailClient ragConfigId={id} />;
}
