import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { queryRAG, isAdminApiConfigured } from '@/lib/external-apis/admin-api';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Validation schema for RAG query request
const ragQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  version: z.number().int().positive().optional(),
  searchMode: z.enum(['vector', 'fts', 'hybrid']).optional(),
  topK: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id: agentId } = await context.params;

    // Check if Admin API is configured
    if (!isAdminApiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'RAG query service is not configured. Contact your administrator.',
        },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = ragQuerySchema.parse(body);

    // Execute RAG query via Admin API
    const result = await queryRAG({
      tenantId: session.tenantId,
      agentId,
      query: data.query,
      version: data.version,
      searchMode: data.searchMode,
      topK: data.topK,
    });

    return successResponse(result);
  } catch (error) {
    // Handle specific Admin API errors
    if (error instanceof Error) {
      // RAG not enabled
      if (error.message.includes('RAG is not enabled')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      // Agent or version not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }

      // Invalid search mode
      if (error.message.includes('Invalid search_mode')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    return handleApiError(error, { resourceName: 'RAG query' });
  }
}
