/**
 * Centralized query key factory for TanStack Query.
 * Use these to ensure consistent cache invalidation.
 */
export const QUERY_KEYS = {
  // Agents
  agents: {
    all: ['agents'] as const,
    detail: (id: string) => ['agents', id] as const,
    versions: (id: string) => ['agents', id, 'versions'] as const,
    phoneConfigs: (id: string) => ['agents', id, 'phone-configs'] as const,
    ragQuery: (id: string) => ['agents', id, 'rag-query'] as const,
  },

  // Calls
  calls: {
    all: (params?: object) => ['calls', params ?? {}] as const,
    detail: (id: string) => ['call-detail', id] as const,
    metrics: (id: string) => ['call-metrics', id] as const,
    transcript: (id: string) => ['call-transcript', id] as const,
    analysis: (id: string) => ['call-analysis', id] as const,
    debug: (id: string) => ['call-debug', id] as const,
    stats: (filters?: object) => ['calls-stats', filters] as const,
  },

  // RAG Configs
  ragConfigs: {
    all: ['rag-configs'] as const,
    detail: (id: string) => ['rag-configs', id] as const,
    dropdown: ['rag-configs', 'dropdown'] as const,
    versions: (id: string) => ['rag-configs', id, 'versions'] as const,
  },

  // Voice Configs (simple catalog - no versioning)
  voiceConfigs: {
    all: ['voice-configs'] as const,
    detail: (id: string) => ['voice-configs', id] as const,
    dropdown: ['voice-configs', 'dropdown'] as const,
  },

  // Phone Configs
  phoneConfigs: {
    all: ['phone-configs'] as const,
    detail: (id: string) => ['phone-configs', id] as const,
    dropdown: ['phone-configs', 'dropdown'] as const,
  },

  // Legacy phone mappings (for backwards compatibility)
  phoneMappings: ['phone-mappings'] as const,

  // Dashboard
  dashboard: {
    callVolume: (params?: object) => ['dashboard', 'call-volume', params] as const,
    sentimentDistribution: (params?: object) => ['dashboard', 'sentiment-distribution', params] as const,
  },

  // Analytics
  analytics: {
    latencyByAgent: (params?: object) => ['analytics', 'latency-by-agent', params] as const,
    tokenUsageTrends: (params?: object) => ['analytics', 'token-usage-trends', params] as const,
  },

  // Reference data
  llmModels: {
    all: ['llm-models'] as const,
    dropdown: ['llm-models', 'dropdown'] as const,
  },

  workflowConfigTypes: {
    all: ['workflow-config-types'] as const,
    byCategory: (category: string) => ['workflow-config-types', category] as const,
  },
} as const;

export type QueryKeyType = typeof QUERY_KEYS;
