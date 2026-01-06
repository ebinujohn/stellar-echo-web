import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCrudHooks,
  createVersionHooks,
  apiMutate,
} from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type {
  CreateVersionInput,
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
    globalPrompt: string | null;
    ragEnabled: boolean;
    ragConfigId: string | null;
    voiceConfigId: string | null;
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
  globalPrompt: string | null;
  ragEnabled: boolean;
  ragConfigId: string | null;
  voiceConfigId: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  notes: string | null;
}

// ========================================
// Factory-based Hooks
// ========================================

const agentCrud = createCrudHooks<Agent[], AgentDetail>({
  endpoint: '/api/agents',
  listKey: QUERY_KEYS.agents.all,
  detailKey: QUERY_KEYS.agents.detail,
  listStaleTime: STALE_TIMES.AGENT_LIST,
  detailStaleTime: STALE_TIMES.DETAIL,
});

const agentVersions = createVersionHooks<AgentVersion, 'agentId'>({
  endpoint: '/api/agents',
  versionsKey: QUERY_KEYS.agents.versions,
  detailKey: QUERY_KEYS.agents.detail,
  listKey: QUERY_KEYS.agents.all,
  staleTime: STALE_TIMES.DETAIL,
  idKey: 'agentId',
});

// ========================================
// Exported Hooks
// ========================================

export const useAgents = agentCrud.useList;
export const useAgent = agentCrud.useDetail;
export const useCreateAgent = agentCrud.useCreate;
export const useUpdateAgent = agentCrud.useUpdate;

export const useAgentVersions = agentVersions.useVersions;
export const useActivateVersion = agentVersions.useActivateVersion;

// Custom delete hook
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiMutate(`/api/agents/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents.all });
    },
  });
}

// Custom version creation hook (uses agentId parameter naming)
export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, ...data }: CreateVersionInput & { agentId: string }) =>
      apiMutate(`/api/agents/${agentId}/versions`, 'POST', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents.versions(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents.detail(variables.agentId) });
    },
  });
}

// Re-export types
export type { Agent, AgentDetail, AgentVersion };
