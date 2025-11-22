import { useQuery } from '@tanstack/react-query';
import type { ConfigTypeCategory } from '@/lib/db/schema/workflow-config-types';

// ========================================
// Types
// ========================================

interface WorkflowConfigType {
  id: string;
  category: ConfigTypeCategory;
  value: string;
  displayName: string;
  description: string | null;
  parameterSchema: Record<string, unknown> | null;
  isPatternBased: boolean | null;
  applicableTo: string[];
  examples: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// Fetch Functions
// ========================================

async function fetchWorkflowConfigTypes(category?: ConfigTypeCategory): Promise<WorkflowConfigType[]> {
  const url = category
    ? `/api/workflow-config-types?category=${category}`
    : '/api/workflow-config-types';

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch workflow config types');
  }
  const json = await response.json();
  return json.data;
}

// ========================================
// Hooks
// ========================================

/**
 * Get all workflow config types
 */
export function useWorkflowConfigTypes() {
  return useQuery({
    queryKey: ['workflow-config-types'],
    queryFn: () => fetchWorkflowConfigTypes(),
    staleTime: 30 * 60 * 1000, // 30 minutes (types rarely change)
  });
}

/**
 * Get workflow config types by category
 */
export function useWorkflowConfigTypesByCategory(category: ConfigTypeCategory) {
  return useQuery({
    queryKey: ['workflow-config-types', category],
    queryFn: () => fetchWorkflowConfigTypes(category),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!category,
  });
}

/**
 * Get node types
 */
export function useNodeTypes() {
  return useQuery({
    queryKey: ['workflow-config-types', 'node_type'],
    queryFn: () => fetchWorkflowConfigTypes('node_type'),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get transition conditions for autocomplete
 */
export function useTransitionConditions() {
  return useQuery({
    queryKey: ['workflow-config-types', 'transition_condition'],
    queryFn: () => fetchWorkflowConfigTypes('transition_condition'),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get action types for autocomplete
 */
export function useActionTypes() {
  return useQuery({
    queryKey: ['workflow-config-types', 'action_type'],
    queryFn: () => fetchWorkflowConfigTypes('action_type'),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get RAG search modes
 */
export function useSearchModes() {
  return useQuery({
    queryKey: ['workflow-config-types', 'search_mode'],
    queryFn: () => fetchWorkflowConfigTypes('search_mode'),
    staleTime: 30 * 60 * 1000,
  });
}

// Re-export types
export type { WorkflowConfigType, ConfigTypeCategory };
