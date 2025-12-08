import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { getCallStatus, isAdminApiConfigured } from '@/lib/external-apis/admin-api';

/**
 * GET /api/calls/[call_id]/status
 *
 * Get the status of a call (works for both inbound and outbound).
 * Proxies to the orchestrator's Admin API.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    await requireAuth();
    const { call_id: callId } = await params;

    // Check if Admin API is configured
    if (!isAdminApiConfigured()) {
      return successResponse(
        {
          error: 'Call status API is not configured. Please contact your administrator.',
        },
        503
      );
    }

    // Get call status from Admin API
    const result = await getCallStatus(callId);

    // Transform snake_case response to camelCase for frontend
    return successResponse({
      callId: result.call_id,
      twilioCallSid: result.twilio_call_sid,
      status: result.status,
      direction: result.direction,
      fromNumber: result.from_number,
      toNumber: result.to_number,
      agentId: result.agent_id,
      agentName: result.agent_name,
      startedAt: result.started_at,
      connectedAt: result.connected_at,
      endedAt: result.ended_at,
      durationSeconds: result.duration_seconds,
      errorMessage: result.error_message,
    });
  } catch (error) {
    // Handle not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return successResponse({ error: 'Call not found' }, 404);
    }

    return handleApiError(error, { resourceName: 'Call' });
  }
}
