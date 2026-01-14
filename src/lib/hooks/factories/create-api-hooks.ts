import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';

/**
 * API error detail from validation
 */
export interface ApiErrorDetail {
  path?: (string | number)[];
  message: string;
  code?: string;
}

/**
 * Custom error class that preserves API error details
 */
export class ApiError extends Error {
  public readonly details?: ApiErrorDetail[];
  public readonly warnings?: string[];

  constructor(
    message: string,
    details?: ApiErrorDetail[],
    warnings?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
    this.warnings = warnings;
  }

  /**
   * Get a formatted error message including details
   */
  getFullMessage(): string {
    if (!this.details || this.details.length === 0) {
      return this.message;
    }
    const detailMessages = this.details.map((d) => d.message).join('; ');
    return `${this.message}: ${detailMessages}`;
  }
}

/**
 * Generic fetch wrapper with consistent error handling
 */
export async function apiFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      errorBody.error || `Failed to fetch ${endpoint}`,
      errorBody.details,
      errorBody.warnings
    );
  }
  const json = await response.json();
  return json.data;
}

/**
 * Standard API mutation response format
 */
export interface ApiMutationResponse<T = unknown> {
  success: boolean;
  data: T;
}

/**
 * Generic POST/PUT/DELETE fetch wrapper
 */
export async function apiMutate<T = unknown>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  data?: unknown
): Promise<ApiMutationResponse<T>> {
  const response = await fetch(endpoint, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      errorBody.error || `Failed to ${method} ${endpoint}`,
      errorBody.details,
      errorBody.warnings
    );
  }

  return response.json();
}

/**
 * Response type for created/updated resources
 */
interface ResourceWithId {
  id: string;
  [key: string]: unknown;
}

/**
 * Configuration for creating CRUD hooks
 */
interface CrudHooksConfig<TList, TDetail> {
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
export function createCrudHooks<TList, TDetail>(
  config: CrudHooksConfig<TList, TDetail>
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

  // Create mutation - accepts any object, returns response with { id }
  function useCreate<TCreate extends Record<string, unknown> = Record<string, unknown>>() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data: TCreate) => apiMutate<ResourceWithId>(endpoint, 'POST', data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: listKey });
      },
    });
  }

  // Update mutation - requires id field
  function useUpdate<TUpdate extends Record<string, unknown> = Record<string, unknown>>() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: TUpdate & { id: string }) =>
        apiMutate<ResourceWithId>(`${endpoint}/${id}`, 'PUT', data),
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
interface VersionedHooksConfig<TIdKey extends string = 'id'> {
  /** Base endpoint, e.g., '/api/rag-configs' */
  endpoint: string;
  /** Function to get versions query key */
  versionsKey: (id: string) => QueryKey;
  /** Function to get detail query key for invalidation */
  detailKey: (id: string) => QueryKey;
  /** List query key for invalidation on activate */
  listKey?: QueryKey;
  /** Stale time for versions list */
  staleTime: number;
  /** The key name for the resource ID (e.g., 'agentId', 'ragConfigId') */
  idKey?: TIdKey;
}

/**
 * Creates version management hooks for versioned resources
 */
export function createVersionHooks<
  TVersion,
  TIdKey extends string = 'id',
>(config: VersionedHooksConfig<TIdKey>) {
  const { endpoint, versionsKey, detailKey, listKey, staleTime, idKey = 'id' as TIdKey } = config;

  // Get versions list
  function useVersions(id: string) {
    return useQuery({
      queryKey: versionsKey(id),
      queryFn: () => apiFetch<TVersion[]>(`${endpoint}/${id}/versions`),
      enabled: !!id,
      staleTime,
    });
  }

  // Activate version - uses configurable ID key name
  function useActivateVersion() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (params: Record<TIdKey, string> & { versionId: string }) => {
        const resourceId = params[idKey as keyof typeof params] as string;
        return apiMutate(`${endpoint}/${resourceId}/versions/${params.versionId}/activate`, 'PUT');
      },
      onSuccess: (_, params) => {
        const resourceId = params[idKey as keyof typeof params] as string;
        queryClient.invalidateQueries({ queryKey: versionsKey(resourceId) });
        queryClient.invalidateQueries({ queryKey: detailKey(resourceId) });
        if (listKey) {
          queryClient.invalidateQueries({ queryKey: listKey });
        }
      },
    });
  }

  return {
    useVersions,
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
