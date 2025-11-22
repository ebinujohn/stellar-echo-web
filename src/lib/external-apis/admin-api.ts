import { createHash, createHmac } from 'crypto';

/**
 * Admin API Client for the Orchestrator Service
 *
 * Implements HMAC-SHA256 request signing as per ADMIN_API.md specification.
 * Used to refresh agent configuration caches when versions are activated.
 */

const ADMIN_API_BASE_URL = process.env.ADMIN_API_BASE_URL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Timestamp tolerance for replay attack protection (5 minutes)
const TIMESTAMP_TOLERANCE_SECONDS = 300;

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

/**
 * Computes HMAC-SHA256 signature for Admin API requests.
 *
 * Signature computation:
 * 1. body_hash = SHA256(request_body)
 * 2. message = timestamp + method + path + body_hash
 * 3. signature = HMAC-SHA256(api_key, message)
 */
function computeSignature(
  apiKey: string,
  timestamp: string,
  method: string,
  path: string,
  body: string
): string {
  // Compute SHA256 hash of the request body
  const bodyHash = createHash('sha256').update(body).digest('hex');

  // Build the message to sign
  const message = `${timestamp}${method.toUpperCase()}${path}${bodyHash}`;

  // Compute HMAC-SHA256 signature
  return createHmac('sha256', apiKey).update(message).digest('hex');
}

/**
 * Makes a signed request to the Admin API.
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
  const bodyStr = JSON.stringify(body);
  const signature = computeSignature(ADMIN_API_KEY, timestamp, method, path, bodyStr);

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
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
    console.log(
      '[Admin API] Skipping cache refresh - ADMIN_API_BASE_URL or ADMIN_API_KEY not configured'
    );
    return null;
  }

  try {
    const response = await makeAdminApiRequest('POST', '/admin/cache/refresh/agent', {
      tenant_id: params.tenantId,
      agent_id: params.agentId,
    });

    console.log(
      `[Admin API] Agent config cache refreshed for agent ${params.agentId} in tenant ${params.tenantId}:`,
      response.message
    );

    return response;
  } catch (error) {
    // Log the error but don't throw - cache refresh failure shouldn't block activation
    console.error(
      `[Admin API] Failed to refresh agent config cache for agent ${params.agentId}:`,
      error instanceof Error ? error.message : error
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
