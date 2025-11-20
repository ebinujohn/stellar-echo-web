import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateAgentInput,
  UpdateAgentInput,
  CreateVersionInput,
  CreatePhoneMappingInput,
  UpdatePhoneMappingInput,
  WorkflowConfig,
} from '@/lib/validations/agents';

// ========================================
// Types
// ========================================

interface Agent {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  callCount: number;
  activeVersion: number | null;
}

interface AgentDetail extends Omit<Agent, 'activeVersion'> {
  activeVersion: {
    id: string;
    version: number;
    configJson: WorkflowConfig;
    createdBy: string | null;
    createdAt: Date;
    notes: string | null;
  } | null;
  phoneMappingCount: number;
  versionCount: number;
}

interface AgentVersion {
  id: string;
  agentId: string;
  tenantId: string;
  version: number;
  configJson: WorkflowConfig;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  notes: string | null;
}

interface PhoneMapping {
  phoneNumber: string;
  agentId: string | null;
  agentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// Agent Queries
// ========================================

async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents');
  if (!response.ok) {
    throw new Error('Failed to fetch agents');
  }
  const json = await response.json();
  return json.data;
}

async function fetchAgent(id: string): Promise<AgentDetail> {
  const response = await fetch(`/api/agents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch agent');
  }
  const json = await response.json();
  return json.data;
}

async function fetchAgentVersions(agentId: string): Promise<AgentVersion[]> {
  const response = await fetch(`/api/agents/${agentId}/versions`);
  if (!response.ok) {
    throw new Error('Failed to fetch versions');
  }
  const json = await response.json();
  return json.data;
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => fetchAgent(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAgentVersions(agentId: string) {
  return useQuery({
    queryKey: ['agents', agentId, 'versions'],
    queryFn: () => fetchAgentVersions(agentId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ========================================
// Agent Mutations
// ========================================

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAgentInput & { configJson?: WorkflowConfig }) => {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create agent');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAgentInput & { id: string }) => {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update agent');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents', variables.id] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete agent');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['phone-mappings'] });
    },
  });
}

// ========================================
// Version Mutations
// ========================================

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, ...data }: CreateVersionInput & { agentId: string }) => {
      const response = await fetch(`/api/agents/${agentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create version');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId] });
    },
  });
}

export function useActivateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, versionId }: { agentId: string; versionId: string }) => {
      const response = await fetch(`/api/agents/${agentId}/versions/${versionId}/activate`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate version');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// ========================================
// Phone Mapping Queries
// ========================================

async function fetchPhoneMappings(): Promise<PhoneMapping[]> {
  const response = await fetch('/api/phone-mappings');
  if (!response.ok) {
    throw new Error('Failed to fetch phone mappings');
  }
  const json = await response.json();
  return json.data;
}

export function usePhoneMappings() {
  return useQuery({
    queryKey: ['phone-mappings'],
    queryFn: fetchPhoneMappings,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ========================================
// Phone Mapping Mutations
// ========================================

export function useCreatePhoneMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePhoneMappingInput) => {
      const response = await fetch('/api/phone-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create phone mapping');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-mappings'] });
    },
  });
}

export function useUpdatePhoneMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      ...data
    }: UpdatePhoneMappingInput & { phoneNumber: string }) => {
      const response = await fetch(`/api/phone-mappings/${encodeURIComponent(phoneNumber)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update phone mapping');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-mappings'] });
    },
  });
}

export function useDeletePhoneMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await fetch(`/api/phone-mappings/${encodeURIComponent(phoneNumber)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete phone mapping');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-mappings'] });
    },
  });
}
