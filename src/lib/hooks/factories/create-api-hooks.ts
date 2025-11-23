import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Generic fetch wrapper with consistent error handling
 */
export async function apiFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch ${endpoint}`);
  }
  const json = await response.json();
  return json.data;
}

/**
 * Generic POST/PUT/DELETE fetch wrapper
 */
export async function apiMutate<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  data?: unknown
): Promise<T> {
  const response = await fetch(endpoint, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to ${method} ${endpoint}`);
  }

  return response.json();
}

/**
 * Configuration for creating CRUD hooks
 */
interface CrudHooksConfig<TList, TDetail, TCreate, TUpdate> {
  /** Base endpoint, e.g., '/api/rag-configs' */
  endpoint: string;
  /** Query key for list, e.g., ['rag-configs'] */
  listKey: QueryKey;
  /** Function to get detail query key, e.g., (id) => ['rag-configs', id] */
  detailKey: (id: string) => QueryKey;
  /** Stale time for list queries */
  listStaleTime: number;
  /** Stale time for detail queries */
  detailStaleTime: number;
  /** Optional transform for list data */
  transformList?: (data: unknown) => TList;
  /** Optional transform for detail data */
  transformDetail?: (data: unknown) => TDetail;
}

/**
 * Creates standard CRUD hooks for a resource
 */
export function createCrudHooks<TList, TDetail, TCreate, TUpdate>(
  config: CrudHooksConfig<TList, TDetail, TCreate, TUpdate>
) {
  const {
    endpoint,
    listKey,
    detailKey,
    listStaleTime,
    detailStaleTime,
    transformList = (d) => d as TList,
    transformDetail = (d) => d as TDetail,
  } = config;

  // List hook
  function useList() {
    return useQuery({
      queryKey: listKey,
      queryFn: async () => {
        const data = await apiFetch(endpoint);
        return transformList(data);
      },
      staleTime: listStaleTime,
    });
  }

  // Detail hook
  function useDetail(id: string) {
    return useQuery({
      queryKey: detailKey(id),
      queryFn: async () => {
        const data = await apiFetch(`${endpoint}/${id}`);
        return transformDetail(data);
      },
      enabled: !!id,
      staleTime: detailStaleTime,
    });
  }

  // Create mutation
  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data: TCreate) => apiMutate(endpoint, 'POST', data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: listKey });
      },
    });
  }

  // Update mutation
  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: TUpdate & { id: string }) =>
        apiMutate(`${endpoint}/${id}`, 'PUT', data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: listKey });
        queryClient.invalidateQueries({ queryKey: detailKey(variables.id) });
      },
    });
  }

  // Delete mutation
  function useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => apiMutate(`${endpoint}/${id}`, 'DELETE'),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: listKey });
      },
    });
  }

  return {
    useList,
    useDetail,
    useCreate,
    useUpdate,
    useDelete,
  };
}

/**
 * Configuration for versioned resource hooks
 */
interface VersionedHooksConfig {
  /** Base endpoint, e.g., '/api/rag-configs' */
  endpoint: string;
  /** Function to get versions query key */
  versionsKey: (id: string) => QueryKey;
  /** Function to get detail query key for invalidation */
  detailKey: (id: string) => QueryKey;
  /** Stale time for versions list */
  staleTime: number;
}

/**
 * Creates version management hooks for versioned resources
 */
export function createVersionHooks(config: VersionedHooksConfig) {
  const { endpoint, versionsKey, detailKey, staleTime } = config;

  // Get versions list
  function useVersions(id: string) {
    return useQuery({
      queryKey: versionsKey(id),
      queryFn: () => apiFetch(`${endpoint}/${id}/versions`),
      enabled: !!id,
      staleTime,
    });
  }

  // Create new version
  function useCreateVersion() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
        apiMutate(`${endpoint}/${id}/versions`, 'POST', data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: versionsKey(variables.id) });
        queryClient.invalidateQueries({ queryKey: detailKey(variables.id) });
      },
    });
  }

  // Activate version
  function useActivateVersion() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
        apiMutate(`${endpoint}/${id}/versions/${versionId}/activate`, 'PUT'),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: versionsKey(variables.id) });
        queryClient.invalidateQueries({ queryKey: detailKey(variables.id) });
      },
    });
  }

  return {
    useVersions,
    useCreateVersion,
    useActivateVersion,
  };
}

/**
 * Creates a dropdown hook for a resource
 */
export function createDropdownHook<T>(
  endpoint: string,
  queryKey: QueryKey,
  staleTime: number
) {
  return function useDropdown() {
    return useQuery({
      queryKey,
      queryFn: () => apiFetch<T>(`${endpoint}/dropdown`),
      staleTime,
    });
  };
}
