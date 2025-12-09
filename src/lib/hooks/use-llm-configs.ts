import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';

interface LlmModel {
  id: string;
  modelName: string;
  provider: string;
  actualModelId: string;
  description: string | null;
  defaultTemperature: string | null;
  defaultMaxTokens: number | null;
  defaultServiceTier: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface LlmModelDropdownItem {
  modelName: string;
  displayName: string;
  description: string | null;
}

export function useLlmModels() {
  return useQuery({
    queryKey: QUERY_KEYS.llmModels.all,
    queryFn: () => apiFetch<LlmModel[]>('/api/llm-models'),
    staleTime: STALE_TIMES.LLM_MODELS,
  });
}

export function useLlmModelsDropdown() {
  return useQuery({
    queryKey: QUERY_KEYS.llmModels.dropdown,
    queryFn: () => apiFetch<LlmModelDropdownItem[]>('/api/llm-models?format=dropdown'),
    staleTime: STALE_TIMES.LLM_MODELS,
  });
}

export type { LlmModel, LlmModelDropdownItem };
