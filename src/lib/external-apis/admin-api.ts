import type { RAGChunk, RAGQueryMetadata, RAGQueryResponse } from '@/types';
import { loggers } from '@/lib/logger';
import { generateNonce, computeSignature } from './hmac-signing';

const log = loggers.admin;

// Default timeout for external API calls (10 seconds)
const DEFAULT_API_TIMEOUT_MS = 10_000;

/**
 * Fetch with timeout support using AbortController.
 * Prevents hanging requests when external services are slow or unresponsive.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Admin API Client for the Orchestrator Service
 *
 * Implements HMAC-SHA256 request signing as per ADMIN_API.md specification.
 * Used to refresh agent configuration caches when versions are activated.
 */

const ADMIN_API_BASE_URL = process.env.ADMIN_API_BASE_URL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

interface AdminApiResponse {
  success: boolean;
  message: string;
  keys_deleted?: number;
  cache_type?: string;
  details?: Record<string, string>;
}

interface RefreshAgentCacheParams {
  tenantId: string;
  agentId: string;
}

export interface RAGQueryParams {
  tenantId: string;
  agentId: string;
  query: string;
  version?: number;
  searchMode?: 'vector' | 'fts' | 'hybrid';
  topK?: number;
}

// Re-export types for consumers that import from this module
export type { RAGChunk, RAGQueryMetadata, RAGQueryResponse };

/**
 * Makes a signed request to the Admin API.
 * Includes HMAC-SHA256 signature with nonce for replay attack protection.
 */
async function makeAdminApiRequest(
  method: string,
  path: string,
  body: Record<string, unknown> = {}
): Promise<AdminApiResponse> {
  if (!ADMIN_API_BASE_URL) {
    throw new Error('ADMIN_API_BASE_URL is not configured');
  }

  if (!ADMIN_API_KEY) {
    throw new Error('ADMIN_API_KEY is not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const bodyStr = JSON.stringify(body);
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, method, path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
    body: method !== 'GET' ? bodyStr : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Admin API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Refreshes the agent configuration cache in the orchestrator.
 *
 * Called after a version is activated to ensure the orchestrator
 * picks up the new configuration immediately.
 *
 * @param params - The tenant and agent IDs to refresh
 * @returns The API response or null if Admin API is not configured
 */
export async function refreshAgentConfigCache(
  params: RefreshAgentCacheParams
): Promise<AdminApiResponse | null> {
  // If Admin API is not configured, skip cache refresh silently
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    log.debug('Skipping cache refresh - ADMIN_API_BASE_URL or ADMIN_API_KEY not configured');
    return null;
  }

  try {
    const response = await makeAdminApiRequest('POST', '/admin/cache/refresh/agent', {
      tenant_id: params.tenantId,
      agent_id: params.agentId,
    });

    log.info(
      { agentId: params.agentId, tenantId: params.tenantId, message: response.message },
      'Agent config cache refreshed'
    );

    return response;
  } catch (error) {
    // Log the error but don't throw - cache refresh failure shouldn't block activation
    log.error(
      { agentId: params.agentId, err: error },
      'Failed to refresh agent config cache'
    );

    return null;
  }
}

/**
 * Checks if the Admin API is configured and available.
 */
export function isAdminApiConfigured(): boolean {
  return Boolean(ADMIN_API_BASE_URL && ADMIN_API_KEY);
}

/**
 * Queries the RAG knowledge base for an agent.
 *
 * Searches the knowledge base using the agent's RAG configuration.
 * Can optionally target a specific agent config version.
 *
 * @param params - Query parameters including tenant, agent, and search options
 * @returns The RAG query response with chunks and metadata
 * @throws Error if Admin API is not configured or query fails
 */
export async function queryRAG(params: RAGQueryParams): Promise<RAGQueryResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const requestBody: Record<string, unknown> = {
    tenant_id: params.tenantId,
    agent_id: params.agentId,
    query: params.query,
  };

  // Add optional parameters only if provided
  if (params.version !== undefined) {
    requestBody.version = params.version;
  }
  if (params.searchMode) {
    requestBody.search_mode = params.searchMode;
  }
  if (params.topK !== undefined) {
    requestBody.top_k = params.topK;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = '/admin/rag/query';
  const bodyStr = JSON.stringify(requestBody);
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'POST', path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<RAGQueryResponse>;
}

// ============================================================================
// Outbound Call API
// ============================================================================

/**
 * Parameters for initiating an outbound call.
 */
export interface InitiateOutboundCallParams {
  tenantId: string;
  agentId: string;
  toNumber: string;
  fromNumber?: string;
  version?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Response from initiating an outbound call.
 */
export interface OutboundCallResponse {
  call_id: string;
  twilio_call_sid: string;
  status: string;
  direction: 'outbound';
  from_number: string;
  to_number: string;
  agent_id: string;
  agent_name: string;
  agent_config_version: number;
  created_at: string;
}

/**
 * Response from getting call status.
 */
export interface CallStatusResponse {
  call_id: string;
  twilio_call_sid: string;
  status: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  agent_id: string;
  agent_name: string;
  started_at: string;
  connected_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
}

/**
 * Initiates an outbound call using the specified agent.
 *
 * @param params - The outbound call parameters
 * @returns The outbound call response with call_id and status
 * @throws Error if Admin API is not configured or call initiation fails
 */
export async function initiateOutboundCall(
  params: InitiateOutboundCallParams
): Promise<OutboundCallResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const requestBody: Record<string, unknown> = {
    tenant_id: params.tenantId,
    agent_id: params.agentId,
    to_number: params.toNumber,
  };

  // Add optional parameters only if provided
  if (params.fromNumber) {
    requestBody.from_number = params.fromNumber;
  }
  if (params.version !== undefined) {
    requestBody.version = params.version;
  }
  if (params.metadata) {
    requestBody.metadata = params.metadata;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = '/admin/calls/outbound';
  const bodyStr = JSON.stringify(requestBody);
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'POST', path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<OutboundCallResponse>;
}

/**
 * Gets the status of a call.
 *
 * @param callId - The call UUID
 * @returns The call status response
 * @throws Error if Admin API is not configured or status fetch fails
 */
export async function getCallStatus(callId: string): Promise<CallStatusResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = `/admin/calls/${callId}/status`;
  // For GET requests, use empty string for body hash (no request body)
  const bodyStr = '';
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'GET', path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<CallStatusResponse>;
}

// ============================================================================
// Call Debug Trace API
// ============================================================================

/**
 * Transition in a call workflow.
 */
export interface CallDebugTransition {
  sequence: number;
  timestamp: string;
  from_node_id: string | null;
  from_node_name: string | null;
  to_node_id: string | null;
  to_node_name: string | null;
  reason: string | null;
  condition: string | null;
  turn_number: number | null;
}

/**
 * Message in a call conversation.
 */
export interface CallDebugMessage {
  sequence: number;
  timestamp: string;
  role: string;
  content: string;
  node_id: string | null;
  turn_number: number | null;
  was_interrupted: boolean;
}

/**
 * RAG retrieval event during a call.
 */
export interface CallDebugRagRetrieval {
  sequence: number;
  timestamp: string;
  query: string;
  node_id: string | null;
  search_mode: string;
  chunks_retrieved: number;
  processing_time_ms: number;
}

/**
 * User interruption event during a call.
 */
export interface CallDebugInterruption {
  sequence: number;
  timestamp: string;
  turn_number: number | null;
  node_id: string | null;
}

/**
 * Metrics summary with min/avg/max statistics.
 */
export interface CallDebugMetricStats {
  avg: number;
  min: number;
  max: number;
  num: number;
}

/**
 * Full debug trace response from the orchestrator.
 */
export interface CallDebugTraceResponse {
  call_id: string;
  tenant_id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  direction: 'inbound' | 'outbound';
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  from_number: string;
  to_number: string;
  twilio_call_sid: string | null;
  twilio_stream_sid: string | null;
  initial_node_id: string | null;
  final_node_id: string | null;
  total_turns: number;
  total_messages: number;
  total_transitions: number;
  total_rag_queries: number;
  total_interruptions: number;
  transitions: CallDebugTransition[];
  messages: CallDebugMessage[];
  rag_retrievals: CallDebugRagRetrieval[];
  variables: Record<string, string>;
  interruptions: CallDebugInterruption[];
  metrics_summary: Record<string, CallDebugMetricStats> | null;
}

/**
 * Gets the debug trace for a call.
 *
 * Fetches comprehensive call trace data from the orchestrator including
 * transitions, messages, RAG queries, variables, and interruptions.
 *
 * @param callId - The call UUID
 * @returns The complete debug trace response
 * @throws Error if Admin API is not configured or fetch fails
 */
export async function getCallDebugTrace(callId: string): Promise<CallDebugTraceResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = `/admin/calls/${callId}/debug`;
  // For GET requests, use empty string for body hash (no request body)
  const bodyStr = '';
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'GET', path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<CallDebugTraceResponse>;
}

// ============================================================================
// RAG Deployment API
// ============================================================================

/**
 * Request parameters for deploying RAG from S3.
 */
export interface RagDeploymentRequest {
  s3_url: string;
  tenant_id: string;
  rag_name: string;
  description?: string;
  run_async: boolean;
}

/**
 * Response from initiating a RAG deployment.
 */
export interface RagDeploymentResponse {
  success: boolean;
  deployment_id: string;
  status: 'pending' | 'downloading' | 'registering' | 'linking' | 'completed' | 'failed';
  message: string;
  rag_config_id?: string;
  rag_version?: number;
  paths?: Record<string, string>;
  error_message?: string;
}

/**
 * Response from getting RAG deployment status.
 */
export interface RagDeploymentStatusResponse {
  deployment_id: string;
  status: 'pending' | 'downloading' | 'registering' | 'linking' | 'completed' | 'failed';
  tenant_id: string;
  rag_id: string;
  s3_url: string;
  files_total: number;
  files_downloaded: number;
  current_file: string;
  bytes_downloaded: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  rag_config_id: string | null;
  rag_version: number | null;
  paths: Record<string, string>;
  error_message: string | null;
}

/**
 * Deploys RAG configuration files from S3.
 *
 * Downloads RAG files (FAISS index, mapping, SQLite DB) from S3 to local storage
 * and registers the configuration in PostgreSQL.
 *
 * @param params - Deployment parameters including S3 URL and RAG name
 * @returns The deployment response with deployment_id for status tracking
 * @throws Error if Admin API is not configured or deployment initiation fails
 */
export async function deployRagFromS3(
  params: RagDeploymentRequest
): Promise<RagDeploymentResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const requestBody: Record<string, unknown> = {
    s3_url: params.s3_url,
    tenant_id: params.tenant_id,
    rag_name: params.rag_name,
    run_async: params.run_async,
  };

  // Add optional parameters only if provided
  if (params.description) {
    requestBody.description = params.description;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = '/admin/rag/deploy';
  const bodyStr = JSON.stringify(requestBody);
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'POST', path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<RagDeploymentResponse>;
}

/**
 * Gets the status of a RAG deployment.
 *
 * Polls the orchestrator for deployment progress including files downloaded,
 * current status, and any error messages.
 *
 * @param deploymentId - The deployment UUID returned from deployRagFromS3
 * @returns The deployment status response
 * @throws Error if Admin API is not configured or status fetch fails
 */
// ============================================================================
// Agent Import/Export API
// ============================================================================

/**
 * Parameters for importing a single agent config.
 */
export interface ImportAgentConfigParams {
  tenantId: string;
  agentJson: Record<string, unknown>;
  phoneNumbers?: string[];
  notes?: string;
  createdBy?: string;
  dryRun?: boolean;
}

/**
 * Result from a single agent import.
 */
export interface ImportAgentConfigResult {
  success: boolean;
  tenant_id: string;
  agent_id: string;
  agent_name: string;
  action: 'created' | 'updated' | 'validated' | 'failed';
  version: number | null;
  previous_version: number | null;
  voice_config_linked: boolean;
  rag_enabled: boolean;
  phone_numbers_mapped: number;
  validation_warnings: string[];
  error_message: string | null;
}

/**
 * Response from the import endpoint.
 */
export interface ImportAgentConfigResponse {
  success: boolean;
  result: ImportAgentConfigResult;
}

/**
 * Parameters for bulk importing agent configs.
 */
export interface BulkImportAgentConfigsParams {
  agents: Array<{
    tenantId: string;
    agentJson: Record<string, unknown>;
    notes?: string;
  }>;
}

/**
 * Response from the bulk import endpoint.
 */
export interface BulkImportAgentConfigsResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: ImportAgentConfigResult[];
}

/**
 * Parameters for exporting an agent config.
 */
export interface ExportAgentConfigParams {
  tenantId: string;
  agentId: string;
  version?: number;
}

/**
 * Response from the export endpoint.
 */
export interface ExportAgentConfigResponse {
  tenant_id: string;
  agent_id: string;
  agent_name: string;
  version: number;
  is_active: boolean;
  config_json: Record<string, unknown>;
  global_prompt: string | null;
  rag_enabled: boolean;
  rag_config_id: string | null;
  voice_config_id: string | null;
  voice_name: string | null;
  created_at: string;
  created_by: string | null;
  notes: string | null;
}

/**
 * Imports a single agent JSON configuration.
 *
 * Creates a new agent or adds a new config version to an existing agent.
 *
 * @param params - Import parameters including tenant, agent JSON, and options
 * @returns The import result with agent ID, version, and any warnings
 * @throws Error if Admin API is not configured or import fails
 */
export async function importAgentConfig(
  params: ImportAgentConfigParams
): Promise<ImportAgentConfigResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const requestBody: Record<string, unknown> = {
    tenant_id: params.tenantId,
    agent_json: params.agentJson,
  };

  if (params.phoneNumbers) {
    requestBody.phone_numbers = params.phoneNumbers;
  }
  if (params.notes) {
    requestBody.notes = params.notes;
  }
  if (params.createdBy) {
    requestBody.created_by = params.createdBy;
  }
  if (params.dryRun !== undefined) {
    requestBody.dry_run = params.dryRun;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = '/admin/agents/import';
  const bodyStr = JSON.stringify(requestBody);
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'POST', path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<ImportAgentConfigResponse>;
}

/**
 * Bulk imports multiple agent configurations.
 *
 * Each agent is processed independently — a failure in one does not affect others.
 *
 * @param params - Array of agent import items
 * @returns Bulk import results with totals and per-agent results
 * @throws Error if Admin API is not configured or request fails
 */
export async function bulkImportAgentConfigs(
  params: BulkImportAgentConfigsParams
): Promise<BulkImportAgentConfigsResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const requestBody = {
    agents: params.agents.map((agent) => ({
      tenant_id: agent.tenantId,
      agent_json: agent.agentJson,
      ...(agent.notes && { notes: agent.notes }),
    })),
  };

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = '/admin/agents/import/bulk';
  const bodyStr = JSON.stringify(requestBody);
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'POST', path, bodyStr);

  // Use 30s timeout for bulk operations
  const response = await fetchWithTimeout(
    `${ADMIN_API_BASE_URL}${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
      },
      body: bodyStr,
    },
    30_000
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<BulkImportAgentConfigsResponse>;
}

/**
 * Exports an agent configuration as import-compatible JSON.
 *
 * The exported JSON can be directly re-imported via importAgentConfig().
 *
 * @param params - Export parameters including tenant, agent, and optional version
 * @returns The exported config with metadata
 * @throws Error if Admin API is not configured or export fails
 */
export async function exportAgentConfig(
  params: ExportAgentConfigParams
): Promise<ExportAgentConfigResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  // Sign path only (no query params in signature)
  const path = `/admin/agents/${params.tenantId}/${params.agentId}/export`;
  const bodyStr = '';
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'GET', path, bodyStr);

  // Append version query param to URL if specified
  let url = `${ADMIN_API_BASE_URL}${path}`;
  if (params.version !== undefined) {
    url += `?version=${params.version}`;
  }

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<ExportAgentConfigResponse>;
}

export async function getRagDeploymentStatus(
  deploymentId: string
): Promise<RagDeploymentStatusResponse> {
  if (!ADMIN_API_BASE_URL || !ADMIN_API_KEY) {
    throw new Error('Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const path = `/admin/rag/deploy/${deploymentId}/status`;
  // For GET requests, use empty string for body hash (no request body)
  const bodyStr = '';
  const signature = computeSignature(ADMIN_API_KEY, timestamp, nonce, 'GET', path, bodyStr);

  const response = await fetchWithTimeout(`${ADMIN_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorData.detail || `Admin API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<RagDeploymentStatusResponse>;
}
