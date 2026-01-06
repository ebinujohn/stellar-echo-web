import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiMutate } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import type { DeployRagInput } from '@/lib/validations/rag-configs';
import type {
  RagDeploymentResponse,
  RagDeploymentStatusResponse,
} from '@/lib/external-apis/admin-api';

/**
 * Hook for initiating a RAG deployment from S3.
 * Returns a mutation that starts the deployment and returns the deployment ID.
 */
export function useRagDeploy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeployRagInput) =>
      apiMutate<RagDeploymentResponse>('/api/rag-configs/deploy', 'POST', data),
    onSuccess: () => {
      // Invalidate RAG configs list when deployment completes
      // (The new config will appear after polling shows completed)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ragConfigs.all });
    },
  });
}

/**
 * Hook for polling RAG deployment status.
 * Automatically polls every 2 seconds until the deployment is completed or failed.
 *
 * @param deploymentId - The deployment ID to poll, or null to disable polling
 */
export function useRagDeploymentStatus(deploymentId: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['rag-deployment', deploymentId],
    queryFn: () =>
      apiFetch<RagDeploymentStatusResponse>(
        `/api/rag-configs/deploy/${deploymentId}/status`
      ),
    enabled: !!deploymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when completed or failed
      if (status === 'completed' || status === 'failed') {
        // Invalidate RAG configs when deployment completes
        if (status === 'completed') {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ragConfigs.all });
        }
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    // Don't cache deployment status - always fresh
    staleTime: 0,
    gcTime: 0,
  });
}

// Re-export types for convenience
export type { RagDeploymentResponse, RagDeploymentStatusResponse };
