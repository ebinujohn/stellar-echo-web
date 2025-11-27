import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCrudHooks,
  createVersionHooks,
  createDropdownHook,
  apiMutate,
} from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type { CreateVoiceConfigVersionInput } from '@/lib/validations/voice-configs';

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
// Factory-based Hooks
// ========================================

const voiceConfigCrud = createCrudHooks<VoiceConfig[], VoiceConfig>({
  endpoint: '/api/voice-configs',
  listKey: QUERY_KEYS.voiceConfigs.all,
  detailKey: QUERY_KEYS.voiceConfigs.detail,
  listStaleTime: STALE_TIMES.CONFIG_LIST,
  detailStaleTime: STALE_TIMES.DETAIL,
});

const voiceConfigVersions = createVersionHooks<VoiceConfigVersion, 'voiceConfigId'>({
  endpoint: '/api/voice-configs',
  versionsKey: QUERY_KEYS.voiceConfigs.versions,
  detailKey: QUERY_KEYS.voiceConfigs.detail,
  listKey: QUERY_KEYS.voiceConfigs.all,
  staleTime: STALE_TIMES.DETAIL,
  idKey: 'voiceConfigId',
});

// ========================================
// Exported Hooks
// ========================================

export const useVoiceConfigs = voiceConfigCrud.useList;
export const useVoiceConfig = voiceConfigCrud.useDetail;
export const useCreateVoiceConfig = voiceConfigCrud.useCreate;
export const useUpdateVoiceConfig = voiceConfigCrud.useUpdate;
export const useDeleteVoiceConfig = voiceConfigCrud.useDelete;

export const useVoiceConfigVersions = voiceConfigVersions.useVersions;
export const useActivateVoiceConfigVersion = voiceConfigVersions.useActivateVersion;

// Dropdown hook
export const useVoiceConfigsDropdown = createDropdownHook<VoiceConfigDropdownItem[]>(
  '/api/voice-configs',
  QUERY_KEYS.voiceConfigs.dropdown,
  STALE_TIMES.DROPDOWN
);

// Custom version creation hook (needs custom parameter naming)
export function useCreateVoiceConfigVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voiceConfigId,
      ...data
    }: CreateVoiceConfigVersionInput & { voiceConfigId: string }) => {
      return apiMutate<{ id: string }>(`/api/voice-configs/${voiceConfigId}/versions`, 'POST', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voiceConfigs.versions(variables.voiceConfigId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voiceConfigs.detail(variables.voiceConfigId),
      });
    },
  });
}

// Re-export types
export type { VoiceConfig, VoiceConfigVersion, VoiceConfigDropdownItem };
