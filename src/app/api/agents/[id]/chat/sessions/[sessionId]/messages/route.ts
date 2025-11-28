import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import {
  sendTextChatMessage,
  isTextChatApiConfigured,
} from '@/lib/external-apis/text-chat-api';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

type RouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

// Validation schema for send message request
const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(10000, 'Message content must be less than 10,000 characters'),
});

/**
 * POST /api/agents/[id]/chat/sessions/[sessionId]/messages
 *
 * Sends a user message in an active chat session and returns the agent's response.
 * Proxies the request to the orchestrator Text Chat API with HMAC authentication.
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

    // Parse and validate request body
    const body = await request.json();
    const data = sendMessageSchema.parse(body);

    // Send message via Text Chat API
    const result = await sendTextChatMessage({
      sessionId,
      content: data.content,
    });

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

      // Session expired/ended (410 Gone)
      if (statusMatch === 410 || error.message.includes('not active')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Chat session has expired or ended',
            code: 'SESSION_EXPIRED',
          },
          { status: 410 }
        );
      }
    }

    return handleApiError(error, { resourceName: 'Chat message' });
  }
}
