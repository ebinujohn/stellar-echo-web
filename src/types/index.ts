// Re-export database types
export type {
  Tenant,
  Agent,
  AgentConfigVersion,
  PhoneMapping,
  Call,
  CallMessage,
  CallTransition,
  CallTranscript,
  CallMetricsSummary,
  CallAnalysis,
  CallRagRetrieval,
  CallExtractedVariable,
  CallUserInterruption,
  User,
} from '@/lib/db/schema';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// Filter types
export interface CallFilters {
  tenantId?: string;
  agentId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  fromNumber?: string;
  toNumber?: string;
  search?: string;
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'viewer';
  tenantId: string;
}

// Timeline event types
export type TimelineEvent =
  | {
      type: 'message';
      id: string;
      timestamp: Date;
      role: 'user' | 'assistant';
      content: string;
      metadata?: any;
    }
  | {
      type: 'transition';
      id: string;
      timestamp: Date;
      fromNodeId: string | null;
      toNodeId: string | null;
      triggerType?: string;
    }
  | {
      type: 'rag_retrieval';
      id: string;
      timestamp: Date;
      queryText: string | null;
      numResults?: number;
    }
  | {
      type: 'variable_extraction';
      id: string;
      timestamp: Date;
      variableName: string | null;
      extractedValue: string | null;
      status: string | null;
    }
  | {
      type: 'interruption';
      id: string;
      timestamp: Date;
      interruptionText: string | null;
      wasHandled: boolean | null;
    };

// Analytics types
export interface KPIMetrics {
  totalCalls: number;
  averageDuration: number;
  averageLatency: number;
  successRate: number;
  comparisonPeriod?: {
    totalCalls: number;
    percentageChange: number;
  };
}

// Simplified Call type for list view
export interface CallListItem {
  callId: string;
  tenantId: string;
  agentId: string | null;
  agentName: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  totalMessages: number;
  totalTransitions: number;
  recordingUrl: string | null;
}

export interface CallVolumeData {
  date: string;
  count: number;
}

export interface PerformanceMetrics {
  agentName: string;
  avgLatency: number;
  callCount: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

// RAG Query types (shared between admin-api and hooks)
export interface RAGChunk {
  chunk_id: number;
  content: string;
  filename: string;
  score: number | null;
  document_id: number;
  chunk_index: number;
  token_count: number | null;
  s3_key: string;
}

export interface RAGQueryMetadata {
  search_mode: 'vector' | 'fts' | 'hybrid';
  top_k: number;
  processing_time_ms: number;
  total_chunks: number;
  rag_config_id: string | null;
  agent_config_version: number;
  is_active_version: boolean;
}

export interface RAGQueryResponse {
  success: boolean;
  query: string;
  chunks: RAGChunk[];
  metadata: RAGQueryMetadata;
}
