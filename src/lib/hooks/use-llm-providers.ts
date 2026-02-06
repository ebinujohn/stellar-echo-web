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
  usageTypes: string[];
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
  usageTypes: string[];
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
 * Usage types for LLM providers
 * Per ADMIN_API.md: Providers can be filtered by their supported usage types
 */
type LlmUsageType = 'conversation' | 'extraction' | 'analysis';

/**
 * Options for useLlmProvidersDropdown hook
 */
interface LlmProvidersDropdownOptions {
  /**
   * Filter providers by usage type
   * - 'conversation': Main LLM for agent conversations
   * - 'extraction': LLM for variable extraction and intent classification
   * - 'analysis': LLM for post-call analysis
   */
  usageType?: LlmUsageType;
}

/**
 * Hook to fetch LLM providers for dropdown selection
 * Returns simplified format with id, name, providerType, description, isDefault
 *
 * @param options - Optional configuration including usageType filter
 */
export function useLlmProvidersDropdown(options?: LlmProvidersDropdownOptions) {
  const usageType = options?.usageType;

  // Build query params
  const queryParams = new URLSearchParams({ format: 'dropdown' });
  if (usageType) {
    queryParams.append('usage_type', usageType);
  }

  return useQuery({
    // Include usageType in query key for proper caching per usage type
    queryKey: usageType
      ? [...QUERY_KEYS.llmProviders.dropdown, usageType]
      : QUERY_KEYS.llmProviders.dropdown,
    queryFn: () => apiFetch<LlmProviderDropdownItem[]>(`/api/llm-providers?${queryParams.toString()}`),
    staleTime: STALE_TIMES.LLM_MODELS, // Same stale time as LLM models
  });
}

export type { LlmProvider, LlmProviderDropdownItem };
