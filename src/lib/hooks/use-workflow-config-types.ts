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

export function useWorkflowConfigTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.all,
    queryFn: () => fetchConfigTypes(),
    staleTime: STALE_TIMES.CONFIG_TYPES,
  });
}

export function useWorkflowConfigTypesByCategory(category: ConfigTypeCategory) {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.byCategory(category),
    queryFn: () => fetchConfigTypes(category),
    staleTime: STALE_TIMES.CONFIG_TYPES,
    enabled: !!category,
  });
}

export function useNodeTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.byCategory('node_type'),
    queryFn: () => fetchConfigTypes('node_type'),
    staleTime: STALE_TIMES.CONFIG_TYPES,
  });
}

export function useTransitionConditions() {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.byCategory('transition_condition'),
    queryFn: () => fetchConfigTypes('transition_condition'),
    staleTime: STALE_TIMES.CONFIG_TYPES,
  });
}

export function useActionTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.byCategory('action_type'),
    queryFn: () => fetchConfigTypes('action_type'),
    staleTime: STALE_TIMES.CONFIG_TYPES,
  });
}

export function useSearchModes() {
  return useQuery({
    queryKey: QUERY_KEYS.workflowConfigTypes.byCategory('search_mode'),
    queryFn: () => fetchConfigTypes('search_mode'),
    staleTime: STALE_TIMES.CONFIG_TYPES,
  });
}

export type { WorkflowConfigType, ConfigTypeCategory };
