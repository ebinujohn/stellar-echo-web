import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiMutate } from './factories/create-api-hooks';
import { QUERY_KEYS } from './constants/query-keys';
import { STALE_TIMES } from './constants/stale-times';
import type { CreatePhoneMappingInput, UpdatePhoneMappingInput } from '@/lib/validations/agents';

// ========================================
// Types
// ========================================

interface PhoneMapping {
  phoneNumber: string;
  agentId: string | null;
  agentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// Query Hooks
// ========================================

export function usePhoneMappings() {
  return useQuery({
    queryKey: QUERY_KEYS.phoneMappings,
    queryFn: () => apiFetch<PhoneMapping[]>('/api/phone-mappings'),
    staleTime: STALE_TIMES.DETAIL,
  });
}

// ========================================
// Mutation Hooks
// ========================================

export function useCreatePhoneMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePhoneMappingInput) =>
      apiMutate('/api/phone-mappings', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.phoneMappings });
    },
  });
}

export function useUpdatePhoneMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phoneNumber, ...data }: UpdatePhoneMappingInput & { phoneNumber: string }) =>
      apiMutate(`/api/phone-mappings/${encodeURIComponent(phoneNumber)}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.phoneMappings });
    },
  });
}

export function useDeletePhoneMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (phoneNumber: string) =>
      apiMutate(`/api/phone-mappings/${encodeURIComponent(phoneNumber)}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.phoneMappings });
    },
  });
}

// Re-export types
export type { PhoneMapping };
