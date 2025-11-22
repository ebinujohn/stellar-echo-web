import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
// Phone Config Queries
// ========================================

async function fetchPhoneConfigs(): Promise<PhoneConfig[]> {
  const response = await fetch('/api/phone-configs');
  if (!response.ok) {
    throw new Error('Failed to fetch phone configs');
  }
  const json = await response.json();
  return json.data;
}

async function fetchPhoneConfig(id: string): Promise<PhoneConfig> {
  const response = await fetch(`/api/phone-configs/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch phone config');
  }
  const json = await response.json();
  return json.data;
}

async function fetchPhoneConfigsDropdown(): Promise<PhoneConfigDropdownItem[]> {
  const response = await fetch('/api/phone-configs/dropdown');
  if (!response.ok) {
    throw new Error('Failed to fetch phone configs for dropdown');
  }
  const json = await response.json();
  return json.data;
}

export function usePhoneConfigs() {
  return useQuery({
    queryKey: ['phone-configs'],
    queryFn: fetchPhoneConfigs,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function usePhoneConfig(id: string) {
  return useQuery({
    queryKey: ['phone-configs', id],
    queryFn: () => fetchPhoneConfig(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
  });
}

export function usePhoneConfigsDropdown() {
  return useQuery({
    queryKey: ['phone-configs', 'dropdown'],
    queryFn: fetchPhoneConfigsDropdown,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

async function fetchAgentPhoneConfigs(agentId: string): Promise<AgentPhoneConfig[]> {
  const response = await fetch(`/api/agents/${agentId}/phone-configs`);
  if (!response.ok) {
    throw new Error('Failed to fetch agent phone configs');
  }
  const json = await response.json();
  return json.data;
}

export function useAgentPhoneConfigs(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'phone-configs'],
    queryFn: () => fetchAgentPhoneConfigs(agentId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!agentId,
  });
}

// ========================================
// Phone Config Mutations
// ========================================

export function useCreatePhoneConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePhoneConfigInput) => {
      const response = await fetch('/api/phone-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create phone config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-configs'] });
      // Also invalidate all agent-related queries since mapping may have changed
      // This includes agent details (for phoneMappingCount) and agent phone-configs
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'agents' &&
          (query.queryKey.length === 2 || query.queryKey[2] === 'phone-configs'),
      });
    },
  });
}

export function useUpdatePhoneConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePhoneConfigInput & { id: string }) => {
      const response = await fetch(`/api/phone-configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update phone config');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['phone-configs'] });
      queryClient.invalidateQueries({ queryKey: ['phone-configs', variables.id] });
      // Also invalidate all agent-related queries since mapping may have changed
      // This includes agent details (for phoneMappingCount) and agent phone-configs
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'agents' &&
          (query.queryKey.length === 2 || query.queryKey[2] === 'phone-configs'),
      });
    },
  });
}

export function useDeletePhoneConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/phone-configs/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete phone config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-configs'] });
      // Also invalidate all agent-related queries since mapping may have been removed
      // This includes agent details (for phoneMappingCount) and agent phone-configs
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'agents' &&
          (query.queryKey.length === 2 || query.queryKey[2] === 'phone-configs'),
      });
    },
  });
}

// Re-export types
export type { PhoneConfig, PhoneConfigMapping, PhoneConfigDropdownItem, AgentPhoneConfig };
