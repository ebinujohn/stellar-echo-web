import { useQuery } from '@tanstack/react-query';

// ========================================
// Types
// ========================================

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

// ========================================
// LLM Model Queries
// ========================================

async function fetchLlmModels(): Promise<LlmModel[]> {
  const response = await fetch('/api/llm-models');
  if (!response.ok) {
    throw new Error('Failed to fetch LLM models');
  }
  const json = await response.json();
  return json.data;
}

async function fetchLlmModelsDropdown(): Promise<LlmModelDropdownItem[]> {
  const response = await fetch('/api/llm-models?format=dropdown');
  if (!response.ok) {
    throw new Error('Failed to fetch LLM models for dropdown');
  }
  const json = await response.json();
  return json.data;
}

export function useLlmModels() {
  return useQuery({
    queryKey: ['llm-models'],
    queryFn: fetchLlmModels,
    staleTime: 10 * 60 * 1000, // 10 minutes (models rarely change)
  });
}

export function useLlmModelsDropdown() {
  return useQuery({
    queryKey: ['llm-models', 'dropdown'],
    queryFn: fetchLlmModelsDropdown,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Re-export types
export type { LlmModel, LlmModelDropdownItem };
