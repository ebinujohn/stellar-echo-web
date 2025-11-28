import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import {
  createTextChatSession,
  isTextChatApiConfigured,
} from '@/lib/external-apis/text-chat-api';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Validation schema for create session request
const createSessionSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/agents/[id]/chat/sessions
 *
 * Creates a new text chat session with the agent.
 * Proxies the request to the orchestrator Text Chat API with HMAC authentication.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id: agentId } = await context.params;

    // Check if Text Chat API is configured
    if (!isTextChatApiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Text chat service is not configured. Contact your administrator.',
        },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = createSessionSchema.parse(body);

    // Create session via Text Chat API
    const result = await createTextChatSession({
      tenantId: session.tenantId,
      agentId,
      metadata: {
        ...data.metadata,
        userId: session.userId,
        userEmail: session.email,
        channel: 'web-admin',
      },
    });

    return successResponse(result, 201);
  } catch (error) {
    // Handle specific Text Chat API errors
    if (error instanceof Error) {
      const statusMatch = (error as Error & { status?: number }).status;

      // Agent not found
      if (statusMatch === 404 || error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Agent not found or has no active version' },
          { status: 404 }
        );
      }

      // No active version
      if (error.message.includes('no active version')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Agent has no active version. Activate a version first.',
          },
          { status: 400 }
        );
      }
    }

    return handleApiError(error, { resourceName: 'Chat session' });
  }
}
