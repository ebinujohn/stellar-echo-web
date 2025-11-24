import { useMutation } from '@tanstack/react-query';
import { apiMutate } from './factories/create-api-hooks';

/**
 * RAG Query Request
 */
export interface RAGQueryRequest {
  query: string;
  version?: number;
  searchMode?: 'vector' | 'fts' | 'hybrid';
  topK?: number;
}

/**
 * RAG Chunk from search results
 */
export interface RAGChunk {
  chunk_id: number;
  content: string;
  filename: string;
  score: number | null;
  document_id: number;
  chunk_index: number;
  token_count: number | null;
  s3_key: string;
}

/**
 * RAG Query metadata
 */
export interface RAGQueryMetadata {
  search_mode: 'vector' | 'fts' | 'hybrid';
  top_k: number;
  processing_time_ms: number;
  total_chunks: number;
  rag_config_id: string | null;
  agent_config_version: number;
  is_active_version: boolean;
}

/**
 * RAG Query Response
 */
export interface RAGQueryResponse {
  success: boolean;
  query: string;
  chunks: RAGChunk[];
  metadata: RAGQueryMetadata;
}

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
    mutationFn: async (request: RAGQueryRequest) => {
      const response = await apiMutate<{ success: boolean; data: RAGQueryResponse }>(
        `/api/agents/${agentId}/rag-query`,
        'POST',
        request
      );
      return response;
    },
  });
}
