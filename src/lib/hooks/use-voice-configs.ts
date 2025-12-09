import { createCrudHooks, createDropdownHook } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';

// ========================================
// Types
// ========================================

interface VoiceConfig {
  id: string;
  name: string;
  voiceId: string;
  provider: string | null;
  model: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

// ========================================
// Exported Hooks
// ========================================

export const useVoiceConfigs = voiceConfigCrud.useList;
export const useVoiceConfig = voiceConfigCrud.useDetail;
export const useCreateVoiceConfig = voiceConfigCrud.useCreate;
export const useUpdateVoiceConfig = voiceConfigCrud.useUpdate;
export const useDeleteVoiceConfig = voiceConfigCrud.useDelete;

export const useVoiceConfigsDropdown = createDropdownHook<VoiceConfigDropdownItem[]>(
  '/api/voice-configs',
  QUERY_KEYS.voiceConfigs.dropdown,
  STALE_TIMES.DROPDOWN
);

// Re-export types
export type { VoiceConfig, VoiceConfigDropdownItem };
