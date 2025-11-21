import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateRagConfigInput,
  UpdateRagConfigInput,
  CreateRagConfigVersionInput,
} from '@/lib/validations/rag-configs';

// ========================================
// Types
// ========================================

interface RagConfigVersion {
  id: string;
  ragConfigId: string;
  tenantId: string;
  version: number;
  searchMode: string;
  topK: number;
  relevanceFilter: boolean;
  rrfK: number;
  vectorWeight: string;
  ftsWeight: string;
  hnswEfSearch: number;
  bedrockModel: string | null;
  bedrockDimensions: number | null;
  faissIndexPath: string | null;
  faissMappingPath: string | null;
  sqliteDbPath: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  notes: string | null;
}

interface RagConfig {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activeVersion: RagConfigVersion | null;
  versionCount: number;
}

interface RagConfigDropdownItem {
  id: string;
  name: string;
  description: string | null;
}

// ========================================
// RAG Config Queries
// ========================================

async function fetchRagConfigs(): Promise<RagConfig[]> {
  const response = await fetch('/api/rag-configs');
  if (!response.ok) {
    throw new Error('Failed to fetch RAG configs');
  }
  const json = await response.json();
  return json.data;
}

async function fetchRagConfig(id: string): Promise<RagConfig> {
  const response = await fetch(`/api/rag-configs/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch RAG config');
  }
  const json = await response.json();
  return json.data;
}

async function fetchRagConfigVersions(ragConfigId: string): Promise<RagConfigVersion[]> {
  const response = await fetch(`/api/rag-configs/${ragConfigId}/versions`);
  if (!response.ok) {
    throw new Error('Failed to fetch RAG config versions');
  }
  const json = await response.json();
  return json.data;
}

async function fetchRagConfigsDropdown(): Promise<RagConfigDropdownItem[]> {
  const response = await fetch('/api/rag-configs/dropdown');
  if (!response.ok) {
    throw new Error('Failed to fetch RAG configs for dropdown');
  }
  const json = await response.json();
  return json.data;
}

export function useRagConfigs() {
  return useQuery({
    queryKey: ['rag-configs'],
    queryFn: fetchRagConfigs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRagConfig(id: string) {
  return useQuery({
    queryKey: ['rag-configs', id],
    queryFn: () => fetchRagConfig(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
  });
}

export function useRagConfigVersions(ragConfigId: string) {
  return useQuery({
    queryKey: ['rag-configs', ragConfigId, 'versions'],
    queryFn: () => fetchRagConfigVersions(ragConfigId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!ragConfigId,
  });
}

export function useRagConfigsDropdown() {
  return useQuery({
    queryKey: ['rag-configs', 'dropdown'],
    queryFn: fetchRagConfigsDropdown,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ========================================
// RAG Config Mutations
// ========================================

export function useCreateRagConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRagConfigInput) => {
      const response = await fetch('/api/rag-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create RAG config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-configs'] });
    },
  });
}

export function useUpdateRagConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateRagConfigInput & { id: string }) => {
      const response = await fetch(`/api/rag-configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update RAG config');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rag-configs'] });
      queryClient.invalidateQueries({ queryKey: ['rag-configs', variables.id] });
    },
  });
}

export function useDeleteRagConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rag-configs/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete RAG config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-configs'] });
    },
  });
}

// ========================================
// RAG Config Version Mutations
// ========================================

export function useCreateRagConfigVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ragConfigId, ...data }: CreateRagConfigVersionInput & { ragConfigId: string }) => {
      const response = await fetch(`/api/rag-configs/${ragConfigId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create RAG config version');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rag-configs', variables.ragConfigId, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['rag-configs', variables.ragConfigId] });
    },
  });
}

export function useActivateRagConfigVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ragConfigId, versionId }: { ragConfigId: string; versionId: string }) => {
      const response = await fetch(`/api/rag-configs/${ragConfigId}/versions/${versionId}/activate`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate RAG config version');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rag-configs', variables.ragConfigId, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['rag-configs', variables.ragConfigId] });
      queryClient.invalidateQueries({ queryKey: ['rag-configs'] });
    },
  });
}

// Re-export types
export type { RagConfig, RagConfigVersion, RagConfigDropdownItem };
