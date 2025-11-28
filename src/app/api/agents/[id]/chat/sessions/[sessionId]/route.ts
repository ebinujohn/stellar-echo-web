import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getTextChatSessionStatus,
  endTextChatSession,
  isTextChatApiConfigured,
} from '@/lib/external-apis/text-chat-api';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

type RouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

/**
 * GET /api/agents/[id]/chat/sessions/[sessionId]
 *
 * Gets the current status of a chat session.
 * Proxies the request to the orchestrator Text Chat API with HMAC authentication.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { sessionId } = await context.params;

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

    // Get session status via Text Chat API
    const result = await getTextChatSessionStatus(sessionId);

    return successResponse(result);
  } catch (error) {
    // Handle specific Text Chat API errors
    if (error instanceof Error) {
      const statusMatch = (error as Error & { status?: number }).status;

      // Session not found
      if (statusMatch === 404 || error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Chat session not found', code: 'SESSION_NOT_FOUND' },
          { status: 404 }
        );
      }
    }

    return handleApiError(error, { resourceName: 'Chat session status' });
  }
}

/**
 * DELETE /api/agents/[id]/chat/sessions/[sessionId]
 *
 * Ends a chat session and returns final statistics.
 * Proxies the request to the orchestrator Text Chat API with HMAC authentication.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { sessionId } = await context.params;

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

    // End session via Text Chat API
    const result = await endTextChatSession(sessionId);

    return successResponse(result);
  } catch (error) {
    // Handle specific Text Chat API errors
    if (error instanceof Error) {
      const statusMatch = (error as Error & { status?: number }).status;

      // Session not found - treat as success (already ended)
      if (statusMatch === 404 || error.message.includes('not found')) {
        return successResponse({
          success: true,
          conversationId: null,
          finalNode: null,
          totalTurns: 0,
          totalTransitions: 0,
        });
      }

      // Session already ended (410 Gone) - treat as success
      if (statusMatch === 410) {
        return successResponse({
          success: true,
          conversationId: null,
          finalNode: null,
          totalTurns: 0,
          totalTransitions: 0,
        });
      }
    }

    return handleApiError(error, { resourceName: 'Chat session' });
  }
}
