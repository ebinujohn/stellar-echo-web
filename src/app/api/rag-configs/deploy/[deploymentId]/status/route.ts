import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getRagDeploymentStatus, isAdminApiConfigured } from '@/lib/external-apis/admin-api';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

/**
 * GET /api/rag-configs/deploy/[deploymentId]/status
 * Get the status of a RAG deployment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    // Check if Admin API is configured
    if (!isAdminApiConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.' },
        { status: 503 }
      );
    }

    // Authenticate the request (deployments are tenant-scoped on the orchestrator side)
    await requireAuth();
    const { deploymentId } = await params;

    // Get deployment status from Admin API
    const status = await getRagDeploymentStatus(deploymentId);

    return successResponse(status);
  } catch (error) {
    return handleApiError(error, { resourceName: 'RAG deployment status' });
  }
}
