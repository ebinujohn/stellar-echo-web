import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { generateSignedHeaders } from '@/lib/external-apis/hmac-signing';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'llm-providers-api' });

/**
 * Response type from Admin API (per ADMIN_API.md specification)
 */
interface AdminLlmProvider {
  provider_id: string;
  type: string;
  display_name: string;
  model_id: string;
  model_name: string;
  base_url: string | null;
  has_api_key: boolean;
}

/**
 * Admin API response format
 */
interface AdminApiResponse {
  providers: AdminLlmProvider[];
  count: number;
  source: string;
}

/**
 * Simplified dropdown format for UI (maintains backward compatibility)
 */
interface LlmProviderDropdownItem {
  id: string;
  name: string;
  providerType: string;
  modelId: string;
  modelName: string;
}

/**
 * GET /api/llm-providers
 * Proxy to admin API to fetch available LLM providers
 *
 * Returns empty array with info message if admin API is not configured
 * (graceful degradation - UI will show only "Default" option)
 */
export async function GET(request: Request) {
  try {
    await requireAuth();

    const adminApiBaseUrl = process.env.ADMIN_API_BASE_URL;
    const adminApiKey = process.env.ADMIN_API_KEY;

    // Check if admin API is configured
    if (!adminApiBaseUrl || !adminApiKey) {
      log.info('Admin API not configured, returning empty providers list');
      return NextResponse.json({
        success: true,
        data: [],
        info: 'Admin API not configured. Using default provider from environment.',
      });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Build the request to admin API
    const path = '/admin/llm-providers';
    const method = 'GET';
    const body = '';

    const signedHeaders = generateSignedHeaders(adminApiKey, method, path, body);

    const adminUrl = `${adminApiBaseUrl}${path}`;

    log.debug({ adminUrl }, 'Fetching LLM providers from admin API');

    const response = await fetch(adminUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...signedHeaders,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      log.error({ status: response.status, statusText: response.statusText }, 'Admin API request failed');

      // Return empty array on error (graceful degradation)
      return NextResponse.json({
        success: true,
        data: [],
        info: 'Failed to fetch providers from admin API. Using default provider.',
      });
    }

    const adminResponse = (await response.json()) as AdminApiResponse;

    if (!Array.isArray(adminResponse.providers)) {
      log.warn({ adminResponse }, 'Unexpected admin API response format');
      return NextResponse.json({
        success: true,
        data: [],
        info: 'Invalid response from admin API. Using default provider.',
      });
    }

    const providers = adminResponse.providers;

    // Return simplified format for dropdowns (maps fields for backward compatibility)
    if (format === 'dropdown') {
      const dropdownItems: LlmProviderDropdownItem[] = providers.map((p) => ({
        id: p.provider_id, // Map provider_id → id for UI
        name: p.display_name, // Map display_name → name for UI
        providerType: p.type, // Map type → providerType for UI
        modelId: p.model_id,
        modelName: p.model_name,
      }));

      return NextResponse.json({
        success: true,
        data: dropdownItems,
      });
    }

    // Return full provider details (map to consistent internal format)
    const mappedProviders = providers.map((p) => ({
      id: p.provider_id,
      name: p.display_name,
      providerType: p.type,
      modelId: p.model_id,
      modelName: p.model_name,
      baseUrl: p.base_url,
      hasApiKey: p.has_api_key,
    }));

    return NextResponse.json({
      success: true,
      data: mappedProviders,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    log.error({ error }, 'Error fetching LLM providers');

    // Return empty array on error (graceful degradation)
    return NextResponse.json({
      success: true,
      data: [],
      info: 'Error fetching providers. Using default provider.',
    });
  }
}
