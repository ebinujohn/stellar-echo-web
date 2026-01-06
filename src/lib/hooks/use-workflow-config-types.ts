import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type { ConfigTypeCategory } from '@/lib/db/schema/workflow-config-types';

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

function fetchConfigTypes(category?: ConfigTypeCategory) {
  const url = category
    ? `/api/workflow-config-types?category=${category}`
    : '/api/workflow-config-types';
  return apiFetch<WorkflowConfigType[]>(url);
}

/** Fetch all workflow config types */
export function useWorkflowConfigTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.all,
    queryFn: () => fetchConfigTypes(),
    staleTime: STALE_TIMES.CONFIG_TYPES,
  });
}

/** Fetch config types by category (dynamic) */
export function useWorkflowConfigTypesByCategory(category: ConfigTypeCategory) {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.byCategory(category),
    queryFn: () => fetchConfigTypes(category),
    staleTime: STALE_TIMES.CONFIG_TYPES,
    enabled: !!category,
  });
}

// Category-specific hooks using the generic factory pattern
const createCategoryHook = (category: ConfigTypeCategory) => () =>
  useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.byCategory(category),
    queryFn: () => fetchConfigTypes(category),
    staleTime: STALE_TIMES.CONFIG_TYPES,
  });

export const useNodeTypes = createCategoryHook('node_type');
export const useTransitionConditions = createCategoryHook('transition_condition');
export const useActionTypes = createCategoryHook('action_type');
export const useSearchModes = createCategoryHook('search_mode');

export type { WorkflowConfigType, ConfigTypeCategory };
