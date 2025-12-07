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
  CallDirection,
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
  direction?: 'inbound' | 'outbound';
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
  direction: 'inbound' | 'outbound' | null;
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

// Text Chat API types

/**
 * Request to create a new text chat session
 */
export interface CreateTextChatSessionRequest {
  tenantId: string;
  agentId: string;
  version?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Transition info when the workflow moves between nodes.
 * Includes human-readable node names alongside IDs.
 */
export interface TextChatTransition {
  fromNode: string;
  fromNodeName: string | null;
  toNode: string;
  toNodeName: string | null;
  condition: string | null;
}

/**
 * Response from creating a text chat session.
 * Includes initialization transitions and version info.
 */
export interface CreateTextChatSessionResponse {
  sessionId: string;
  conversationId: string;
  status: 'active';
  nodeId: string;
  nodeName: string | null;
  initialNodeId: string;
  initialNodeName: string | null;
  transitions: TextChatTransition[];
  agentConfigVersion: number;
  isActiveVersion: boolean;
  initialMessage: string | null;
  createdAt: string;
}

/**
 * Request to send a message in a text chat session
 */
export interface SendTextChatMessageRequest {
  content: string;
}

/**
 * Response from sending a text chat message.
 * Includes full transition chain and node names.
 */
export interface SendTextChatMessageResponse {
  response: string;
  nodeId: string;
  nodeName: string | null;
  previousNodeId: string;
  previousNodeName: string | null;
  transitions: TextChatTransition[];
  /** @deprecated Use transitions array instead. Last transition for backwards compatibility. */
  transition: TextChatTransition | null;
  extractedVariables: Record<string, string> | null;
  sessionEnded: boolean;
  turnNumber: number;
  latencyMs: number;
}

/**
 * Response from getting text chat session status
 */
export interface TextChatSessionStatusResponse {
  sessionId: string;
  conversationId: string;
  status: 'active' | 'completed' | 'abandoned' | 'error';
  nodeId: string;
  nodeName: string | null;
  turns: number;
  transitionCount: number;
  collectedData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
}

/**
 * Response from ending a text chat session
 */
export interface EndTextChatSessionResponse {
  success: boolean;
  conversationId: string;
  finalNodeId: string;
  finalNodeName: string | null;
  totalTurns: number;
  totalTransitions: number;
}

/**
 * Individual message in a text chat conversation
 */
export interface TextChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  nodeId?: string;
  nodeName?: string | null;
  transitions?: TextChatTransition[];
  extractedVariables?: Record<string, string> | null;
  latencyMs?: number;
  status?: 'sending' | 'sent' | 'error';
}

/**
 * Session status for the chat UI
 */
export type TextChatSessionStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

/**
 * Complete chat session state for the UI
 */
export interface TextChatSessionState {
  sessionId: string | null;
  conversationId: string | null;
  messages: TextChatMessage[];
  currentNodeId: string | null;
  currentNodeName: string | null;
  status: TextChatSessionStatus;
  error: string | null;
  turnNumber: number;
  collectedData: Record<string, string>;
  agentConfigVersion: number | null;
  isActiveVersion: boolean | null;
}
