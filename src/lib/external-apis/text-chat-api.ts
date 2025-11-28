import { createHmac, createHash } from 'crypto';
import type {
  CreateTextChatSessionResponse,
  SendTextChatMessageResponse,
  TextChatSessionStatusResponse,
  EndTextChatSessionResponse,
} from '@/types';

/**
 * Text Chat API Client for the Orchestrator Service
 *
 * Implements HMAC-SHA256 request signing as per TEXT_CHAT_API.md specification.
 * Uses the same signature format as the Admin API:
 * - Signature = HMAC-SHA256(api_key, timestamp + method + path + body_sha256)
 */

const TEXT_CHAT_API_BASE_URL =
  process.env.TEXT_CHAT_API_BASE_URL || process.env.ADMIN_API_BASE_URL;
const TEXT_CHAT_API_KEY =
  process.env.TEXT_CHAT_API_KEY || process.env.ADMIN_API_KEY;

interface CreateSessionParams {
  tenantId: string;
  agentId: string;
  version?: number;
  metadata?: Record<string, unknown>;
}

interface SendMessageParams {
  sessionId: string;
  content: string;
}

/**
 * Generates HMAC-SHA256 signature for Text Chat API requests.
 *
 * Signature format (per TEXT_CHAT_API.md):
 * 1. Hash the body with SHA-256
 * 2. Concatenate: timestamp + method + path + body_hash
 * 3. HMAC-SHA256 with API key
 */
function generateSignature(
  apiKey: string,
  timestamp: string,
  method: string,
  path: string,
  body: string
): string {
  // Hash the body to normalize it (handles empty bodies consistently)
  const bodyHash = createHash('sha256').update(body).digest('hex');

  // Create the message to sign: timestamp + method + path + body_hash
  const message = `${timestamp}${method.toUpperCase()}${path}${bodyHash}`;

  // Compute HMAC-SHA256
  return createHmac('sha256', apiKey).update(message).digest('hex');
}

/**
 * Makes a signed request to the Text Chat API.
 */
async function makeTextChatApiRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  if (!TEXT_CHAT_API_BASE_URL) {
    throw new Error('TEXT_CHAT_API_BASE_URL is not configured');
  }

  if (!TEXT_CHAT_API_KEY) {
    throw new Error('TEXT_CHAT_API_KEY is not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateSignature(
    TEXT_CHAT_API_KEY,
    timestamp,
    method,
    path,
    bodyStr
  );

  const response = await fetch(`${TEXT_CHAT_API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    },
    body: method !== 'GET' && method !== 'DELETE' ? bodyStr : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.detail || errorData.message || errorText;
    } catch {
      errorMessage = errorText;
    }

    // Include status code for specific error handling
    const error = new Error(
      `Text Chat API error (${response.status}): ${errorMessage}`
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/** Raw transition from the API (snake_case) */
interface RawTransition {
  from_node: string;
  from_node_name: string | null;
  to_node: string;
  to_node_name: string | null;
  condition: string | null;
}

/** Transform a raw transition to camelCase */
function transformTransition(t: RawTransition) {
  return {
    fromNode: t.from_node,
    fromNodeName: t.from_node_name,
    toNode: t.to_node,
    toNodeName: t.to_node_name,
    condition: t.condition,
  };
}

/**
 * Creates a new text chat session with an agent.
 *
 * @param params - The session creation parameters
 * @returns The created session with session_id, initial message, and initialization transitions
 */
export async function createTextChatSession(
  params: CreateSessionParams
): Promise<CreateTextChatSessionResponse> {
  const response = await makeTextChatApiRequest<{
    session_id: string;
    conversation_id: string;
    status: 'active';
    node_id: string;
    node_name: string | null;
    initial_node_id: string;
    initial_node_name: string | null;
    transitions: RawTransition[];
    agent_config_version: number;
    is_active_version: boolean;
    initial_message: string | null;
    created_at: string;
  }>('POST', '/api/chat/sessions', {
    tenant_id: params.tenantId,
    agent_id: params.agentId,
    ...(params.version !== undefined && { version: params.version }),
    metadata: params.metadata,
  });

  // Transform snake_case to camelCase
  return {
    sessionId: response.session_id,
    conversationId: response.conversation_id,
    status: response.status,
    nodeId: response.node_id,
    nodeName: response.node_name,
    initialNodeId: response.initial_node_id,
    initialNodeName: response.initial_node_name,
    transitions: (response.transitions || []).map(transformTransition),
    agentConfigVersion: response.agent_config_version,
    isActiveVersion: response.is_active_version,
    initialMessage: response.initial_message,
    createdAt: response.created_at,
  };
}

/**
 * Sends a message in an active text chat session.
 *
 * @param params - The message parameters
 * @returns The agent's response with full transition chain and node names
 */
export async function sendTextChatMessage(
  params: SendMessageParams
): Promise<SendTextChatMessageResponse> {
  const response = await makeTextChatApiRequest<{
    response: string;
    node_id: string;
    node_name: string | null;
    previous_node_id: string;
    previous_node_name: string | null;
    transitions: RawTransition[];
    transition: RawTransition | null;
    extracted_variables: Record<string, string> | null;
    session_ended: boolean;
    turn_number: number;
    latency_ms: number;
  }>('POST', `/api/chat/sessions/${params.sessionId}/messages`, {
    content: params.content,
  });

  // Transform snake_case to camelCase
  return {
    response: response.response,
    nodeId: response.node_id,
    nodeName: response.node_name,
    previousNodeId: response.previous_node_id,
    previousNodeName: response.previous_node_name,
    transitions: (response.transitions || []).map(transformTransition),
    transition: response.transition
      ? transformTransition(response.transition)
      : null,
    extractedVariables: response.extracted_variables,
    sessionEnded: response.session_ended,
    turnNumber: response.turn_number,
    latencyMs: response.latency_ms,
  };
}

/**
 * Gets the current status of a text chat session.
 *
 * @param sessionId - The session ID
 * @returns The session status with node name and collected data
 */
export async function getTextChatSessionStatus(
  sessionId: string
): Promise<TextChatSessionStatusResponse> {
  const response = await makeTextChatApiRequest<{
    session_id: string;
    conversation_id: string;
    status: 'active' | 'completed' | 'abandoned' | 'error';
    node_id: string;
    node_name: string | null;
    turns: number;
    transition_count: number;
    collected_data: Record<string, string>;
    created_at: string;
    updated_at: string;
    ended_at: string | null;
  }>('GET', `/api/chat/sessions/${sessionId}`);

  // Transform snake_case to camelCase
  return {
    sessionId: response.session_id,
    conversationId: response.conversation_id,
    status: response.status,
    nodeId: response.node_id,
    nodeName: response.node_name,
    turns: response.turns,
    transitionCount: response.transition_count,
    collectedData: response.collected_data,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    endedAt: response.ended_at,
  };
}

/**
 * Ends a text chat session and returns final statistics.
 *
 * @param sessionId - The session ID to end
 * @returns Final session statistics with node name
 */
export async function endTextChatSession(
  sessionId: string
): Promise<EndTextChatSessionResponse> {
  const response = await makeTextChatApiRequest<{
    success: boolean;
    conversation_id: string;
    final_node_id: string;
    final_node_name: string | null;
    total_turns: number;
    total_transitions: number;
  }>('DELETE', `/api/chat/sessions/${sessionId}`);

  // Transform snake_case to camelCase
  return {
    success: response.success,
    conversationId: response.conversation_id,
    finalNodeId: response.final_node_id,
    finalNodeName: response.final_node_name,
    totalTurns: response.total_turns,
    totalTransitions: response.total_transitions,
  };
}

/**
 * Checks if the Text Chat API is configured and available.
 */
export function isTextChatApiConfigured(): boolean {
  return Boolean(TEXT_CHAT_API_BASE_URL && TEXT_CHAT_API_KEY);
}
