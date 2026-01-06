import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { deployRagFromS3, isAdminApiConfigured } from '@/lib/external-apis/admin-api';
import { deployRagSchema } from '@/lib/validations/rag-configs';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

/**
 * POST /api/rag-configs/deploy
 * Initiate RAG deployment from S3
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Admin API is configured
    if (!isAdminApiConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.' },
        { status: 503 }
      );
    }

    const session = await requireAuth();
    const body = await request.json();
    const data = deployRagSchema.parse(body);

    // Call Admin API to initiate deployment
    const response = await deployRagFromS3({
      s3_url: data.s3_url,
      tenant_id: session.tenantId,
      rag_name: data.rag_name,
      description: data.description,
      run_async: true, // Always use async for better UX
    });

    return successResponse(response, 202);
  } catch (error) {
    return handleApiError(error, { resourceName: 'RAG deployment' });
  }
}
