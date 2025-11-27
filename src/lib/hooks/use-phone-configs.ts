import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiMutate, createDropdownHook } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type { CreatePhoneConfigInput, UpdatePhoneConfigInput } from '@/lib/validations/phone-configs';

// ========================================
// Types
// ========================================

interface PhoneConfigMapping {
  agentId: string;
  agentName: string | null;
}

interface PhoneConfig {
  id: string;
  tenantId: string;
  phoneNumber: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  mapping: PhoneConfigMapping | null;
}

interface PhoneConfigDropdownItem {
  id: string;
  phoneNumber: string;
  name: string | null;
}

interface AgentPhoneConfig {
  id: string;
  phoneNumber: string;
  name: string | null;
}

// ========================================
// Query Hooks
// ========================================

export function usePhoneConfigs() {
  return useQuery({
    queryKey: QUERY_KEYS.phoneConfigs.all,
    queryFn: () => apiFetch<PhoneConfig[]>('/api/phone-configs'),
    staleTime: STALE_TIMES.DETAIL,
  });
}

export function usePhoneConfig(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.phoneConfigs.detail(id),
    queryFn: () => apiFetch<PhoneConfig>(`/api/phone-configs/${id}`),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!id,
  });
}

export const usePhoneConfigsDropdown = createDropdownHook<PhoneConfigDropdownItem[]>(
  '/api/phone-configs',
  QUERY_KEYS.phoneConfigs.dropdown,
  STALE_TIMES.DROPDOWN
);

export function useAgentPhoneConfigs(agentId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.agents.phoneConfigs(agentId),
    queryFn: () => apiFetch<AgentPhoneConfig[]>(`/api/agents/${agentId}/phone-configs`),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!agentId,
  });
}

// ========================================
// Mutation Hooks (with custom agent invalidation)
// ========================================

// Helper to invalidate agent-related queries when phone mappings change
function invalidateAgentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'agents' &&
      (query.queryKey.length === 2 || query.queryKey[2] === 'phone-configs'),
  });
}

export function useCreatePhoneConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePhoneConfigInput) =>
      apiMutate('/api/phone-configs', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.phoneConfigs.all });
      invalidateAgentQueries(queryClient);
    },
  });
}

export function useUpdatePhoneConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdatePhoneConfigInput & { id: string }) =>
      apiMutate(`/api/phone-configs/${id}`, 'PUT', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.phoneConfigs.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.phoneConfigs.detail(variables.id) });
      invalidateAgentQueries(queryClient);
    },
  });
}

export function useDeletePhoneConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiMutate(`/api/phone-configs/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.phoneConfigs.all });
      invalidateAgentQueries(queryClient);
    },
  });
}

// Re-export types
export type { PhoneConfig, PhoneConfigMapping, PhoneConfigDropdownItem, AgentPhoneConfig };
