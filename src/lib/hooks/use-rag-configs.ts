import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCrudHooks,
  createVersionHooks,
  createDropdownHook,
  apiMutate,
} from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type { CreateRagConfigVersionInput } from '@/lib/validations/rag-configs';

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
// Factory-based Hooks
// ========================================

const ragConfigCrud = createCrudHooks<RagConfig[], RagConfig>({
  endpoint: '/api/rag-configs',
  listKey: QUERY_KEYS.ragConfigs.all,
  detailKey: QUERY_KEYS.ragConfigs.detail,
  listStaleTime: STALE_TIMES.CONFIG_LIST,
  detailStaleTime: STALE_TIMES.DETAIL,
});

const ragConfigVersions = createVersionHooks<RagConfigVersion, 'ragConfigId'>({
  endpoint: '/api/rag-configs',
  versionsKey: QUERY_KEYS.ragConfigs.versions,
  detailKey: QUERY_KEYS.ragConfigs.detail,
  listKey: QUERY_KEYS.ragConfigs.all,
  staleTime: STALE_TIMES.DETAIL,
  idKey: 'ragConfigId',
});

// ========================================
// Exported Hooks
// ========================================

export const useRagConfigs = ragConfigCrud.useList;
export const useRagConfig = ragConfigCrud.useDetail;
export const useCreateRagConfig = ragConfigCrud.useCreate;
export const useUpdateRagConfig = ragConfigCrud.useUpdate;
export const useDeleteRagConfig = ragConfigCrud.useDelete;

export const useRagConfigVersions = ragConfigVersions.useVersions;
export const useActivateRagConfigVersion = ragConfigVersions.useActivateVersion;

// Dropdown hook
export const useRagConfigsDropdown = createDropdownHook<RagConfigDropdownItem[]>(
  '/api/rag-configs',
  QUERY_KEYS.ragConfigs.dropdown,
  STALE_TIMES.DROPDOWN
);

// Custom version creation hook (needs custom parameter naming)
export function useCreateRagConfigVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ragConfigId,
      ...data
    }: CreateRagConfigVersionInput & { ragConfigId: string }) => {
      return apiMutate<{ id: string }>(`/api/rag-configs/${ragConfigId}/versions`, 'POST', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ragConfigs.versions(variables.ragConfigId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ragConfigs.detail(variables.ragConfigId),
      });
    },
  });
}

// Re-export types
export type { RagConfig, RagConfigVersion, RagConfigDropdownItem };
