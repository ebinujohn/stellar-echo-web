import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateVoiceConfigInput,
  UpdateVoiceConfigInput,
  CreateVoiceConfigVersionInput,
} from '@/lib/validations/voice-configs';

// ========================================
// Types
// ========================================

interface VoiceConfigVersion {
  id: string;
  voiceConfigId: string;
  tenantId: string;
  version: number;
  voiceId: string;
  model: string;
  stability: string;
  similarityBoost: string;
  style: string;
  useSpeakerBoost: boolean;
  enableSsmlParsing: boolean;
  pronunciationDictionariesEnabled: boolean;
  pronunciationDictionaryIds: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  notes: string | null;
}

interface VoiceConfig {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activeVersion: VoiceConfigVersion | null;
  versionCount: number;
}

interface VoiceConfigDropdownItem {
  id: string;
  name: string;
  description: string | null;
}

// ========================================
// Voice Config Queries
// ========================================

async function fetchVoiceConfigs(): Promise<VoiceConfig[]> {
  const response = await fetch('/api/voice-configs');
  if (!response.ok) {
    throw new Error('Failed to fetch Voice configs');
  }
  const json = await response.json();
  return json.data;
}

async function fetchVoiceConfig(id: string): Promise<VoiceConfig> {
  const response = await fetch(`/api/voice-configs/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch Voice config');
  }
  const json = await response.json();
  return json.data;
}

async function fetchVoiceConfigVersions(voiceConfigId: string): Promise<VoiceConfigVersion[]> {
  const response = await fetch(`/api/voice-configs/${voiceConfigId}/versions`);
  if (!response.ok) {
    throw new Error('Failed to fetch Voice config versions');
  }
  const json = await response.json();
  return json.data;
}

async function fetchVoiceConfigsDropdown(): Promise<VoiceConfigDropdownItem[]> {
  const response = await fetch('/api/voice-configs/dropdown');
  if (!response.ok) {
    throw new Error('Failed to fetch Voice configs for dropdown');
  }
  const json = await response.json();
  return json.data;
}

export function useVoiceConfigs() {
  return useQuery({
    queryKey: ['voice-configs'],
    queryFn: fetchVoiceConfigs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useVoiceConfig(id: string) {
  return useQuery({
    queryKey: ['voice-configs', id],
    queryFn: () => fetchVoiceConfig(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
  });
}

export function useVoiceConfigVersions(voiceConfigId: string) {
  return useQuery({
    queryKey: ['voice-configs', voiceConfigId, 'versions'],
    queryFn: () => fetchVoiceConfigVersions(voiceConfigId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!voiceConfigId,
  });
}

export function useVoiceConfigsDropdown() {
  return useQuery({
    queryKey: ['voice-configs', 'dropdown'],
    queryFn: fetchVoiceConfigsDropdown,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ========================================
// Voice Config Mutations
// ========================================

export function useCreateVoiceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVoiceConfigInput) => {
      const response = await fetch('/api/voice-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Voice config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-configs'] });
    },
  });
}

export function useUpdateVoiceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateVoiceConfigInput & { id: string }) => {
      const response = await fetch(`/api/voice-configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update Voice config');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['voice-configs'] });
      queryClient.invalidateQueries({ queryKey: ['voice-configs', variables.id] });
    },
  });
}

export function useDeleteVoiceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/voice-configs/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete Voice config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-configs'] });
    },
  });
}

// ========================================
// Voice Config Version Mutations
// ========================================

export function useCreateVoiceConfigVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voiceConfigId,
      ...data
    }: CreateVoiceConfigVersionInput & { voiceConfigId: string }) => {
      const response = await fetch(`/api/voice-configs/${voiceConfigId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Voice config version');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['voice-configs', variables.voiceConfigId, 'versions'],
      });
      queryClient.invalidateQueries({ queryKey: ['voice-configs', variables.voiceConfigId] });
    },
  });
}

export function useActivateVoiceConfigVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voiceConfigId,
      versionId,
    }: {
      voiceConfigId: string;
      versionId: string;
    }) => {
      const response = await fetch(
        `/api/voice-configs/${voiceConfigId}/versions/${versionId}/activate`,
        {
          method: 'PUT',
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate Voice config version');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['voice-configs', variables.voiceConfigId, 'versions'],
      });
      queryClient.invalidateQueries({ queryKey: ['voice-configs', variables.voiceConfigId] });
      queryClient.invalidateQueries({ queryKey: ['voice-configs'] });
    },
  });
}

// Re-export types
export type { VoiceConfig, VoiceConfigVersion, VoiceConfigDropdownItem };
