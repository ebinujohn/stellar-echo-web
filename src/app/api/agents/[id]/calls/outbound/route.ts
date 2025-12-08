import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { initiateOutboundCallSchema } from '@/lib/validations/calls';
import {
  initiateOutboundCall,
  isAdminApiConfigured,
} from '@/lib/external-apis/admin-api';

/**
 * POST /api/agents/[id]/calls/outbound
 *
 * Initiate an outbound call using the specified agent.
 * Proxies to the orchestrator's Admin API.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: agentId } = await params;

    // Check if Admin API is configured
    if (!isAdminApiConfigured()) {
      return successResponse(
        {
          error: 'Outbound calls are not configured. Please contact your administrator.',
        },
        503
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = initiateOutboundCallSchema.parse(body);

    // Initiate the outbound call via Admin API
    const result = await initiateOutboundCall({
      tenantId: session.tenantId,
      agentId,
      toNumber: validatedData.toNumber,
      fromNumber: validatedData.fromNumber,
      version: validatedData.version,
      metadata: validatedData.metadata,
    });

    // Transform snake_case response to camelCase for frontend
    return successResponse(
      {
        callId: result.call_id,
        twilioCallSid: result.twilio_call_sid,
        status: result.status,
        direction: result.direction,
        fromNumber: result.from_number,
        toNumber: result.to_number,
        agentId: result.agent_id,
        agentName: result.agent_name,
        agentConfigVersion: result.agent_config_version,
        createdAt: result.created_at,
      },
      202
    );
  } catch (error) {
    // Handle Admin API specific errors
    if (error instanceof Error) {
      // Check for specific error messages from Admin API
      if (error.message.includes('Invalid phone number format')) {
        return successResponse({ error: 'Invalid phone number format' }, 400);
      }
      if (error.message.includes('does not belong to tenant')) {
        return successResponse({ error: error.message }, 403);
      }
      if (error.message.includes('not found')) {
        return successResponse({ error: error.message }, 404);
      }
      if (error.message.includes('No phone number mapped')) {
        return successResponse({ error: error.message }, 404);
      }
      if (error.message.includes('RECORDING_WEBHOOK_BASE_URL')) {
        return successResponse(
          { error: 'Outbound calls are not fully configured on the server.' },
          503
        );
      }
    }

    return handleApiError(error, { resourceName: 'Call' });
  }
}
