import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';

/**
 * Full LLM provider data (mapped from Admin API response)
 */
interface LlmProvider {
  id: string;
  name: string;
  providerType: string;
  modelId: string;
  modelName: string;
  baseUrl: string | null;
  hasApiKey: boolean;
}

/**
 * Simplified dropdown format for UI
 */
interface LlmProviderDropdownItem {
  id: string;
  name: string;
  providerType: string;
  modelId: string;
  modelName: string;
}

/**
 * Hook to fetch all LLM providers (full details)
 */
export function useLlmProviders() {
  return useQuery({
    queryKey: QUERY_KEYS.llmProviders.all,
    queryFn: () => apiFetch<LlmProvider[]>('/api/llm-providers'),
    staleTime: STALE_TIMES.LLM_MODELS, // Same stale time as LLM models
  });
}

/**
 * Hook to fetch LLM providers for dropdown selection
 * Returns simplified format with id, name, providerType, description, isDefault
 */
export function useLlmProvidersDropdown() {
  return useQuery({
    queryKey: QUERY_KEYS.llmProviders.dropdown,
    queryFn: () => apiFetch<LlmProviderDropdownItem[]>('/api/llm-providers?format=dropdown'),
    staleTime: STALE_TIMES.LLM_MODELS, // Same stale time as LLM models
  });
}

export type { LlmProvider, LlmProviderDropdownItem };
