import { useMutation } from '@tanstack/react-query';
import { apiMutate, type ApiMutationResponse } from './factories/create-api-hooks';
import type { RAGQueryResponse } from '@/types';

export interface RAGQueryRequest {
  query: string;
  version?: number;
  searchMode?: 'vector' | 'fts' | 'hybrid';
  topK?: number;
}

// Re-export types for consumers
export type { RAGChunk, RAGQueryMetadata, RAGQueryResponse } from '@/types';

/**
 * Hook for querying RAG knowledge base for an agent.
 *
 * This is a mutation hook since RAG queries are POST requests
 * that don't benefit from caching (each query is unique).
 *
 * @param agentId - The agent ID to query against
 * @returns Mutation hook for executing RAG queries
 *
 * @example
 * ```tsx
 * const ragQuery = useRAGQuery(agentId);
 *
 * // Execute a query
 * ragQuery.mutate({
 *   query: 'What are the symptoms?',
 *   searchMode: 'hybrid',
 *   topK: 5
 * });
 *
 * // Access results
 * if (ragQuery.data) {
 *   console.log(ragQuery.data.data.chunks);
 * }
 * ```
 */
export function useRAGQuery(agentId: string) {
  return useMutation({
    mutationFn: async (request: RAGQueryRequest): Promise<ApiMutationResponse<RAGQueryResponse>> => {
      return apiMutate<RAGQueryResponse>(
        `/api/agents/${agentId}/rag-query`,
        'POST',
        request
      );
    },
  });
}
