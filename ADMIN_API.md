# Admin API Documentation

The Admin API provides cache management, RAG query, outbound call, and agent import/export endpoints for the orchestrator service. These endpoints are designed for machine-to-machine (M2M) communication, allowing external applications to trigger cache refresh operations, query knowledge bases, initiate outbound calls, and manage agent configurations programmatically.

## Authentication

All Admin API endpoints require **HMAC-SHA256 request signing with nonce**. This provides comprehensive protection against replay attacks - each request requires a unique nonce that can only be used once.

### How HMAC Signing Works

1. Each request includes a **timestamp**, **nonce**, and **signature**
2. The signature is computed from: `timestamp + nonce + method + path + body_hash`
3. Server rejects requests older than **5 minutes** (timestamp-based protection)
4. Server rejects any request with a previously used nonce (nonce-based protection)
5. Used nonces are stored in Redis with automatic TTL expiration
6. Signatures are compared using constant-time comparison (timing attack protection)

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Timestamp` | Unix timestamp in seconds (e.g., `1700000000`) |
| `X-Nonce` | Unique random string, min 16 characters (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2`) |
| `X-Signature` | HMAC-SHA256 signature (hex-encoded) |
| `Content-Type` | `application/json` |

### Nonce Requirements

- **Minimum length**: 16 characters
- **Uniqueness**: Each nonce can only be used once within the timestamp window
- **Recommended format**: URL-safe random string (e.g., `secrets.token_urlsafe(24)`)
- **TTL**: Used nonces are stored for 6 minutes (timestamp window + 1 minute buffer)

### Signature Computation

```
body_hash = SHA256(request_body)
message = timestamp + nonce + method + path + body_hash
signature = HMAC-SHA256(api_key, message)
```

**Important:**
- For **GET requests**, use an empty string (`""` or `b""`) as the request body when computing the hash.
- The `path` component used in signature computation is the **URL path only** (e.g., `/admin/llm-providers`), **without** query parameters. Query parameters (e.g., `?usage_type=extraction`) are sent as part of the HTTP request URL but are **not** included in the HMAC signature.

| Request Type | Body for Hash Computation | Body Hash |
|--------------|---------------------------|-----------|
| GET | `""` (empty string) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| POST | JSON body (e.g., `"{}"`) | SHA256 of the JSON string |

**Example (POST request):**
```
timestamp = "1700000000"
nonce = "xK9mN2pQ5rS8tU1vW4xY7zA0bC3dE6fG"
method = "POST"
path = "/admin/cache/refresh/all"
body = "{}"
body_hash = SHA256("{}") = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
message = "1700000000xK9mN2pQ5rS8tU1vW4xY7zA0bC3dE6fGPOST/admin/cache/refresh/all44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
signature = HMAC-SHA256(api_key, message)
```

**Example (GET request):**
```
timestamp = "1700000000"
nonce = "xK9mN2pQ5rS8tU1vW4xY7zA0bC3dE6fG"
method = "GET"
path = "/admin/calls/550e8400-e29b-41d4-a716-446655440000/status"
body = ""  # Empty string for GET requests
body_hash = SHA256("") = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
message = "1700000000xK9mN2pQ5rS8tU1vW4xY7zA0bC3dE6fGGET/admin/calls/550e8400-e29b-41d4-a716-446655440000/statuse3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
signature = HMAC-SHA256(api_key, message)
```

### Configuration

1. Generate a secure API key:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. Add the key to your `.env` file:
   ```bash
   ADMIN_API_KEY=your_generated_secure_key_here
   ```

3. Restart the orchestrator service to load the new configuration.

### Authentication Errors

| Status Code | Description |
|-------------|-------------|
| 401 Unauthorized | Missing headers or expired timestamp |
| 403 Forbidden | Invalid signature |
| 503 Service Unavailable | `ADMIN_API_KEY` not configured in `.env` |

---

## CLI Client Tool

A Python CLI tool is provided for easy interaction with the Admin API.

### Installation

The client uses `httpx` for HTTP requests:
```bash
uv add httpx
```

### Usage

```bash
# Health check
uv run python scripts/admin_api_client.py health

# Refresh all caches
uv run python scripts/admin_api_client.py refresh-all

# Refresh specific cache types
uv run python scripts/admin_api_client.py refresh-agent
uv run python scripts/admin_api_client.py refresh-agent --tenant-id <uuid>
uv run python scripts/admin_api_client.py refresh-agent --tenant-id <uuid> --agent-id <uuid>
uv run python scripts/admin_api_client.py refresh-phone-mapping
uv run python scripts/admin_api_client.py refresh-phone-mapping --phone-number +15551234567
uv run python scripts/admin_api_client.py refresh-rag
uv run python scripts/admin_api_client.py refresh-voice
uv run python scripts/admin_api_client.py refresh-llm-model

# LLM Provider management
uv run python scripts/admin_api_client.py list-llm-providers
uv run python scripts/admin_api_client.py list-llm-providers --usage-type extraction
uv run python scripts/admin_api_client.py reload-llm-providers
uv run python scripts/admin_api_client.py get-llm-provider --provider-id azure-gpt-5-2

# Custom base URL
uv run python scripts/admin_api_client.py health --base-url https://api.example.com
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_API_KEY` | Yes | Shared secret for HMAC signing |
| `ADMIN_API_BASE_URL` | No | API base URL (default: `http://localhost:8000`) |

---

## Endpoints

### Health Check

Check if the Admin API is accessible.

```
GET /admin/health
```

**Headers:**
```
X-Timestamp: 1700000000
X-Signature: <hmac_signature>
```

**Response:**
```json
{
  "status": "healthy",
  "service": "admin-api"
}
```

---

### Refresh Agent Config Cache

Invalidate cached agent configurations. Useful when agent configs are updated in the database.

```
POST /admin/cache/refresh/agent
```

**Request Body:**
```json
{
  "tenant_id": "optional-tenant-uuid",
  "agent_id": "optional-agent-uuid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenant_id` | string | No | Tenant UUID. If not provided, clears all agent caches. |
| `agent_id` | string | No | Agent UUID. Requires `tenant_id`. Clears specific agent cache. |

**Scope Behavior:**
- No parameters: Clears all agent config caches
- `tenant_id` only: Clears all caches for that tenant
- `tenant_id` + `agent_id`: Clears specific agent cache

**Response:**
```json
{
  "success": true,
  "message": "Agent config cache refreshed for agent 6ba7b810-... in tenant 550e8400-...",
  "keys_deleted": 1,
  "cache_type": "agent",
  "details": {
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }
}
```

---

### Refresh Phone Mapping Cache

Invalidate cached phone-to-agent mappings. Useful when phone mappings are updated.

```
POST /admin/cache/refresh/phone-mapping
```

**Request Body:**
```json
{
  "phone_number": "optional-phone-number"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone_number` | string | No | Phone number to refresh. If not provided, clears all mappings. |

**Response:**
```json
{
  "success": true,
  "message": "Phone mapping cache refreshed for phone number +15551234567",
  "keys_deleted": 1,
  "cache_type": "phone_mapping",
  "details": {
    "phone_number": "+15551234567"
  }
}
```

---

### Refresh RAG Config Cache

Invalidate cached RAG (Retrieval-Augmented Generation) configurations.

```
POST /admin/cache/refresh/rag
```

**Request Body:**
```json
{
  "rag_config_id": "optional-rag-config-uuid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rag_config_id` | string | No | RAG config UUID. If not provided, clears all RAG caches. |

---

### Refresh Voice Config Cache

Invalidate cached voice/TTS configurations.

```
POST /admin/cache/refresh/voice
```

**Request Body:**
```json
{
  "voice_config_id": "optional-voice-config-uuid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `voice_config_id` | string | No | Voice config UUID. If not provided, clears all voice caches. |

---

### Refresh LLM Model Cache

Invalidate cached LLM model definitions.

```
POST /admin/cache/refresh/llm-model
```

**Request Body:**
```json
{
  "model_name": "optional-model-name"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model_name` | string | No | Model name (e.g., "gpt4.1"). If not provided, clears all LLM model caches. |

---

### Refresh All Caches

Invalidate all configuration caches at once. Useful for complete cache reset.

```
POST /admin/cache/refresh/all
```

**Request Body:** `{}` (empty JSON object)

**Response:**
```json
{
  "success": true,
  "message": "All configuration caches refreshed",
  "total_keys_deleted": 15,
  "results": {
    "agent": 5,
    "phone_mapping": 3,
    "rag": 2,
    "voice": 3,
    "llm_model": 2
  }
}
```

---

## LLM Provider Management

Endpoints for managing LLM provider configurations. Each provider entry contains **both credentials AND model configuration**. Providers are configured via `config/llm_providers.json` (local development) or AWS Parameter Store (production).

See [LLM Providers Guide](./LLM_PROVIDERS.md) for configuration details.

### List LLM Providers

List all configured LLM providers with their metadata and model info (API keys are never returned).

```
GET /admin/llm-providers
GET /admin/llm-providers?usage_type=extraction
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `usage_type` | string | No | Filter by usage type: `conversation`, `extraction`, or `analysis` |

**Response:**
```json
{
  "providers": [
    {
      "provider_id": "azure-gpt-5-2",
      "type": "azure",
      "display_name": "Azure GPT-5.2",
      "model_id": "gpt-5.2",
      "model_name": "GPT 5.2",
      "base_url": "https://your-resource.openai.azure.com",
      "has_api_key": true,
      "usage_types": ["conversation"]
    },
    {
      "provider_id": "azure-gpt-5-mini",
      "type": "azure",
      "display_name": "Azure GPT-5 Mini",
      "model_id": "gpt-5-mini",
      "model_name": "GPT 5 Mini",
      "base_url": "https://your-resource.openai.azure.com",
      "has_api_key": true,
      "usage_types": ["extraction", "analysis"]
    }
  ],
  "count": 2,
  "source": "file"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `providers` | array | List of provider metadata (includes model info) |
| `providers[].usage_types` | array | Allowed usage types: `conversation`, `extraction`, `analysis` |
| `count` | integer | Number of providers loaded (after filtering) |
| `source` | string | Credential source: `file`, `parameter_store`, or `none` |

---

### Reload LLM Providers

Hot-reload LLM provider configurations from the current source (file or Parameter Store). Useful after updating credentials or model settings without restarting the service.

```
POST /admin/llm-providers/reload
```

**Request Body:** `{}` (empty JSON object)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "source": "parameter_store",
  "provider_ids": ["azure-gpt-5-2", "openai-gpt4", "anthropic-claude"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether reload succeeded |
| `count` | integer | Number of providers loaded |
| `source` | string | Credential source used |
| `provider_ids` | array | List of loaded provider IDs |

**Note:** Existing connections continue with old credentials until naturally closed. New agent loads will use updated credentials and model settings.

---

### Get LLM Provider Details

Get details for a specific LLM provider including model configuration (API key is never returned).

```
GET /admin/llm-providers/{provider_id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider_id` | string | Provider ID (e.g., "azure-gpt-5-2") |

**Response:**
```json
{
  "provider_id": "azure-gpt-5-2",
  "type": "azure",
  "display_name": "Azure GPT-5.2",
  "model_id": "gpt-5.2",
  "model_name": "GPT 5.2",
  "base_url": "https://your-resource.openai.azure.com",
  "api_version": "2024-12-01-preview",
  "organization_id": null,
  "service_tier": "auto",
  "temperature": 1.0,
  "max_tokens": 150,
  "has_api_key": true,
  "usage_types": ["conversation"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `provider_id` | string | Provider identifier |
| `type` | string | Provider type: `openai`, `azure`, or `anthropic` |
| `display_name` | string | Human-readable provider name |
| `model_id` | string | Actual API model ID (e.g., "gpt-5.2") |
| `model_name` | string | Human-readable model name |
| `usage_types` | array | Allowed usage types: `conversation`, `extraction`, `analysis` |
| `base_url` | string | API endpoint URL (null for standard OpenAI) |
| `api_version` | string | API version (Azure only) |
| `organization_id` | string | Organization ID (OpenAI only) |
| `service_tier` | string | Default service tier |
| `temperature` | float | Default temperature (only applies when provider is used for conversation) |
| `max_tokens` | int | Default max tokens |
| `has_api_key` | boolean | Whether API key is configured |

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 404 Not Found | Provider not found | `"Provider 'xxx' not found | Available: [...]"` |

---

### Query RAG Knowledge Base

Search the RAG knowledge base using an agent's configuration. Useful for testing RAG retrieval or integrating knowledge search into external applications.

```
POST /admin/rag/query
```

**Request Body:**
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "query": "What are the symptoms of diabetes?",
  "version": 2,
  "search_mode": "hybrid",
  "top_k": 5
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenant_id` | string | **Yes** | Tenant UUID |
| `agent_id` | string | **Yes** | Agent UUID |
| `query` | string | **Yes** | Search query text (min 1 character) |
| `version` | integer | No | Agent config version to use (1+). If not provided, uses active version. |
| `search_mode` | string | No | Override search mode: `vector`, `fts`, or `hybrid` |
| `top_k` | integer | No | Override number of chunks to retrieve (1-50) |

**Response:**
```json
{
  "success": true,
  "query": "What are the symptoms of diabetes?",
  "chunks": [
    {
      "chunk_id": 42,
      "content": "Common symptoms of diabetes include increased thirst, frequent urination, extreme fatigue, blurred vision, and slow-healing cuts or bruises...",
      "filename": "diabetes_guide.pdf",
      "score": 0.892341,
      "document_id": 5,
      "chunk_index": 3,
      "token_count": 256,
      "s3_key": "documents/diabetes_guide.pdf"
    },
    {
      "chunk_id": 87,
      "content": "Type 2 diabetes symptoms may develop slowly over time. Some people with type 2 diabetes have no symptoms at first...",
      "filename": "diabetes_types.pdf",
      "score": 0.856123,
      "document_id": 8,
      "chunk_index": 1,
      "token_count": 198,
      "s3_key": "documents/diabetes_types.pdf"
    }
  ],
  "metadata": {
    "search_mode": "hybrid",
    "top_k": 5,
    "processing_time_ms": 127.45,
    "total_chunks": 2,
    "rag_config_id": "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
    "agent_config_version": 2,
    "is_active_version": false
  }
}
```

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 400 Bad Request | RAG not enabled | `"RAG is not enabled for agent <agent_id>"` |
| 400 Bad Request | Invalid search_mode | `"Invalid search_mode: xyz. Must be 'vector', 'fts', or 'hybrid'."` |
| 404 Not Found | Agent not found | `"Agent configuration not found for tenant <tenant_id>, agent <agent_id>"` |
| 404 Not Found | Version not found | `"Agent configuration version <version> not found for tenant <tenant_id>, agent <agent_id>"` |
| 500 Internal Server Error | RAG files missing | `"RAG data files not found: ..."` |
| 500 Internal Server Error | Search failed | `"RAG search failed: ..."` |

---

### Deploy RAG from S3

Deploy RAG database files from S3 to local storage (EFS in production) and register in PostgreSQL. Supports both synchronous and asynchronous execution.

```
POST /admin/rag/deploy
```

**Request Body:**
```json
{
  "s3_url": "s3://my-bucket/rag-data/tenant-123/rag-456",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "rag_name": "Product Knowledge Base",
  "rag_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "description": "Product catalog and FAQ knowledge base",
  "link_to_agent_id": "agent-uuid-to-link",
  "force_overwrite": false,
  "run_async": true,
  "rag_config": {
    "search_mode": "hybrid",
    "top_k": 5
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `s3_url` | string | **Yes** | S3 URL containing RAG files (s3:// or https:// format). Expected structure: `{prefix}/faiss/index.faiss`, `{prefix}/faiss/mapping.pkl`, `{prefix}/metadata/rag.db` |
| `tenant_id` | string | **Yes** | Target tenant UUID |
| `rag_name` | string | **Yes** | Display name for RAG config (1-255 chars) |
| `rag_id` | string | No | RAG config UUID. If not provided, extracted from S3 URL path (last component) |
| `description` | string | No | Optional description for RAG config |
| `link_to_agent_id` | string | No | Optional agent UUID to auto-link this RAG config to |
| `force_overwrite` | boolean | No | Overwrite existing local files (default: false) |
| `run_async` | boolean | No | Run in background (default: false). If true, returns immediately with deployment_id |
| `rag_config` | object | No | Optional RAG configuration overrides (search_mode, top_k, rrf_k, etc.) |

**Synchronous Response (run_async=false):**
```json
{
  "success": true,
  "deployment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "message": "RAG deployment completed successfully",
  "rag_config_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "rag_version": 1,
  "paths": {
    "faiss_index": "/app/data/tenants/tenant-123/rag-456/faiss/index.faiss",
    "faiss_mapping": "/app/data/tenants/tenant-123/rag-456/faiss/mapping.pkl",
    "sqlite_db": "/app/data/tenants/tenant-123/rag-456/metadata/rag.db"
  }
}
```

**Asynchronous Response (run_async=true):**
```json
{
  "success": true,
  "deployment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "message": "Deployment started in background. Poll /admin/rag/deploy/{deployment_id}/status for progress."
}
```

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 400 Bad Request | Invalid UUID format | `"Invalid UUID format: ..."` |
| 400 Bad Request | Missing RAG ID | `"RAG ID must be provided or extractable from S3 URL path"` |
| 404 Not Found | Tenant not found | `"Tenant not found: <tenant_id>"` |
| 500 Internal Server Error | S3 files not found | `"Required RAG files not found in S3: ..."` |
| 500 Internal Server Error | AWS credentials error | `"AWS credentials not configured or invalid"` |

---

### Get RAG Deployment Status

Get the current status of a RAG deployment (for async deployments).

```
GET /admin/rag/deploy/{deployment_id}/status
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `deployment_id` | string | Deployment UUID returned from deploy endpoint |

**Response:**
```json
{
  "deployment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "downloading",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "rag_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "s3_url": "s3://my-bucket/rag-data/tenant-123/rag-456",
  "files_total": 3,
  "files_downloaded": 1,
  "current_file": "mapping.pkl",
  "bytes_downloaded": 52428800,
  "started_at": "2025-01-15T10:30:00.000000+00:00",
  "completed_at": null,
  "duration_seconds": 12.5,
  "rag_config_id": null,
  "rag_version": null,
  "paths": {},
  "error_message": null
}
```

**Deployment Status Values:**
- `pending` - Deployment initialized, not started
- `downloading` - Downloading files from S3
- `registering` - Registering RAG config in PostgreSQL
- `linking` - Linking RAG to agent (if link_to_agent_id provided)
- `completed` - Deployment finished successfully
- `failed` - Deployment failed (check error_message)

**Completed Response:**
```json
{
  "deployment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "rag_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "s3_url": "s3://my-bucket/rag-data/tenant-123/rag-456",
  "files_total": 3,
  "files_downloaded": 3,
  "current_file": "",
  "bytes_downloaded": 157286400,
  "started_at": "2025-01-15T10:30:00.000000+00:00",
  "completed_at": "2025-01-15T10:30:45.000000+00:00",
  "duration_seconds": 45.0,
  "rag_config_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "rag_version": 1,
  "paths": {
    "faiss_index": "/app/data/tenants/tenant-123/rag-456/faiss/index.faiss",
    "faiss_mapping": "/app/data/tenants/tenant-123/rag-456/faiss/mapping.pkl",
    "sqlite_db": "/app/data/tenants/tenant-123/rag-456/metadata/rag.db"
  },
  "error_message": null
}
```

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 404 Not Found | Deployment not found | `"Deployment not found: <deployment_id>. Deployment status is cached for 1 hour after completion."` |

---

## Agent Import/Export

Endpoints for programmatic management of agent JSON configurations. Supports creating new agents, updating existing agents with new config versions, exporting configs in a round-trip compatible format, and dry-run validation.

**Use Cases:** CI/CD pipelines, admin dashboards, backup/restore, round-trip config editing (export → modify → reimport).

### Import Agent Config

Import a single agent JSON configuration. Creates a new agent or adds a new config version to an existing agent.

```
POST /admin/agents/import
```

**Request Body:**
```json
{
  "tenant_id": "6bc1814c-5705-5b6e-af99-104b91962282",
  "agent_json": {
    "agent": {
      "id": "b2c3d4e5-f6a7-4901-bcde-f23456789012",
      "name": "My Agent",
      "description": "Agent description",
      "version": "1.0.0"
    },
    "workflow": {
      "initial_node": "greeting",
      "global_prompt": "You are a helpful assistant.",
      "llm": {
        "provider_id": "azure-gpt-5-2",
        "temperature": 0.7,
        "max_tokens": 150
      },
      "tts": { "enabled": true, "voice_name": "rachel" },
      "nodes": [
        {
          "id": "greeting",
          "type": "standard",
          "name": "Greeting",
          "proactive": true,
          "static_text": "Hello! How can I help you?",
          "transitions": [{ "condition": "always", "target": "end_call" }]
        },
        { "id": "end_call", "type": "end_call", "name": "End Call" }
      ]
    }
  },
  "phone_numbers": ["+15551234567"],
  "notes": "Initial deployment",
  "created_by": "ci-pipeline",
  "dry_run": false
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenant_id` | string (UUID) | Yes | Tenant must already exist in database |
| `agent_json` | object | Yes | Full agent JSON with `agent` and `workflow` top-level keys. Same format as seed data files. See [AGENT_JSON_SCHEMA.md](AGENT_JSON_SCHEMA.md). |
| `phone_numbers` | string[] | No | E.164 phone numbers to map to this agent |
| `notes` | string | No | Version notes (e.g., "Updated greeting flow") |
| `created_by` | string | No | Creator identifier (defaults to `"admin_api"`) |
| `dry_run` | boolean | No | Validate only, don't save (default: `false`) |

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "tenant_id": "6bc1814c-5705-5b6e-af99-104b91962282",
    "agent_id": "b2c3d4e5-f6a7-4901-bcde-f23456789012",
    "agent_name": "My Agent",
    "action": "created",
    "version": 1,
    "previous_version": null,
    "voice_config_linked": true,
    "rag_enabled": false,
    "phone_numbers_mapped": 1,
    "validation_warnings": [],
    "error_message": null
  }
}
```

| Field | Description |
|-------|-------------|
| `action` | `"created"` (new agent), `"updated"` (new version), or `"validated"` (dry_run) |
| `version` | New config version number (null for dry_run) |
| `previous_version` | Previous active version number (null if first version) |
| `voice_config_linked` | Whether `tts.voice_name` matched a voice in `voice_configs` table |
| `rag_enabled` | Whether any workflow node has RAG enabled |
| `phone_numbers_mapped` | Count of phone numbers newly mapped or reassigned |
| `validation_warnings` | Non-fatal warnings (e.g., unrecognized voice name) |

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 400 Bad Request | Missing `agent`/`workflow` keys, invalid UUID | `"Missing required top-level key: 'agent'"` |
| 404 Not Found | Tenant not found | `"Tenant not found: <tenant_id>"` |
| 422 Unprocessable Entity | Workflow validation errors | `"Workflow validation failed: ..."` |
| 500 Internal Server Error | Database or unexpected errors | `"Agent import failed: ..."` |

---

### Bulk Import Agent Configs

Import multiple agent configurations in a single request. Each agent is processed independently — a failure in one agent does not affect others (partial success).

```
POST /admin/agents/import/bulk
```

**Request Body:**
```json
{
  "agents": [
    {
      "tenant_id": "6bc1814c-...",
      "agent_json": { "agent": { "..." }, "workflow": { "..." } },
      "notes": "Batch deploy v2.1"
    },
    {
      "tenant_id": "6bc1814c-...",
      "agent_json": { "agent": { "..." }, "workflow": { "..." } }
    }
  ]
}
```

- Minimum: 1 agent per request
- Maximum: 50 agents per request

**Response:**
```json
{
  "total": 2,
  "succeeded": 1,
  "failed": 1,
  "results": [
    {
      "success": true,
      "tenant_id": "6bc1814c-...",
      "agent_id": "b2c3d4e5-...",
      "agent_name": "Agent A",
      "action": "created",
      "version": 1,
      "validation_warnings": [],
      "error_message": null
    },
    {
      "success": false,
      "tenant_id": "6bc1814c-...",
      "agent_id": "invalid-uuid",
      "agent_name": "Agent B",
      "action": "failed",
      "error_message": "Invalid agent.id UUID format: invalid-uuid"
    }
  ]
}
```

---

### Export Agent Config

Export an agent configuration as import-compatible JSON. The exported JSON can be directly re-imported via `POST /admin/agents/import`.

```
GET /admin/agents/{tenant_id}/{agent_id}/export
GET /admin/agents/{tenant_id}/{agent_id}/export?version=2
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tenant_id` | string (UUID) | Tenant UUID |
| `agent_id` | string (UUID) | Agent UUID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `version` | integer | Active version | Specific version number to export |

**Response:**
```json
{
  "tenant_id": "6bc1814c-5705-5b6e-af99-104b91962282",
  "agent_id": "b2c3d4e5-f6a7-4901-bcde-f23456789012",
  "agent_name": "My Agent",
  "version": 3,
  "is_active": true,
  "config_json": {
    "agent": {
      "id": "b2c3d4e5-f6a7-4901-bcde-f23456789012",
      "name": "My Agent",
      "description": "Agent description"
    },
    "workflow": {
      "initial_node": "greeting",
      "global_prompt": "You are a helpful assistant.",
      "llm": { "..." },
      "tts": { "..." },
      "nodes": [ "..." ]
    }
  },
  "global_prompt": "You are a helpful assistant.",
  "rag_enabled": false,
  "rag_config_id": null,
  "voice_config_id": "a1b2c3d4-...",
  "voice_name": "rachel",
  "created_at": "2026-02-10T22:30:00+00:00",
  "created_by": "admin_api",
  "notes": "Initial deployment"
}
```

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 400 Bad Request | Invalid UUID format | `"Invalid tenant_id UUID format: ..."` |
| 404 Not Found | Agent/version not found | `"No active configuration found for ..."` |
| 500 Internal Server Error | Database or unexpected errors | `"Agent export failed: ..."` |

---

### Import/Export Behavior Details

**Versioning:**
- Each import creates a new config version (auto-incremented)
- New version is automatically set as the active version
- Previous active versions are deactivated (not deleted)
- Version history is preserved for rollback

**Voice Config Resolution:**
- If `workflow.tts.voice_name` matches a voice in the `voice_configs` table, the FK is automatically linked
- If the voice name is not found, a warning is returned but the import still succeeds

**RAG Config Handling:**
- RAG enablement is detected by scanning workflow nodes for `rag.enabled: true`
- The `rag_config_id` is carried forward from the previous active version

**Phone Number Mapping:**
- Phone numbers are cleaned to E.164 format
- New `PhoneConfig` records are created for the tenant if they don't exist
- If a phone number is already mapped to a different agent, the mapping is reassigned
- Phone mapping failures generate warnings but don't fail the import

**Cache Invalidation:**
- Agent config cache and phone mapping cache are automatically invalidated after import

**Round-Trip Workflow:**
```bash
# 1. Export current config
EXPORTED=$(curl -s ... /admin/agents/{tenant_id}/{agent_id}/export)

# 2. Extract the import-compatible JSON
CONFIG_JSON=$(echo "$EXPORTED" | jq '.config_json')

# 3. Modify as needed
MODIFIED=$(echo "$CONFIG_JSON" | jq '.workflow.nodes[0].static_text = "New greeting!"')

# 4. Reimport (creates a new version)
curl -X POST .../admin/agents/import \
  -d "{\"tenant_id\": \"...\", \"agent_json\": $MODIFIED}"
```

---

## Response Models

### CacheRefreshResponse

Standard response for single cache type operations.

```json
{
  "success": boolean,
  "message": "Human-readable result message",
  "keys_deleted": number,
  "cache_type": "agent|phone_mapping|rag|voice|llm_model",
  "details": {
    // Optional: Parameters used in the request
  }
}
```

### AllCacheRefreshResponse

Response for the `/admin/cache/refresh/all` endpoint.

```json
{
  "success": boolean,
  "message": "Human-readable result message",
  "total_keys_deleted": number,
  "results": {
    "agent": number,
    "phone_mapping": number,
    "rag": number,
    "voice": number,
    "llm_model": number
  }
}
```

### RAGQueryResponse

Response for the `/admin/rag/query` endpoint.

```json
{
  "success": boolean,
  "query": "Original query text",
  "chunks": [
    {
      "chunk_id": number,
      "content": "Chunk text content",
      "filename": "Source document filename",
      "score": number | null,
      "document_id": number,
      "chunk_index": number,
      "token_count": number | null,
      "s3_key": "S3 storage key"
    }
  ],
  "metadata": {
    "search_mode": "vector|fts|hybrid",
    "top_k": number,
    "processing_time_ms": number,
    "total_chunks": number,
    "rag_config_id": "string | null",
    "agent_config_version": number,
    "is_active_version": boolean
  }
}
```

### RAGDeployResponse

Response for the `/admin/rag/deploy` endpoint.

```json
{
  "success": boolean,
  "deployment_id": "Unique deployment ID for status tracking",
  "status": "pending|downloading|registering|linking|completed|failed",
  "message": "Human-readable status message",
  "rag_config_id": "string | null (populated on completion)",
  "rag_version": "number | null (populated on completion)",
  "paths": {
    "faiss_index": "Local file path",
    "faiss_mapping": "Local file path",
    "sqlite_db": "Local file path"
  },
  "error_message": "string | null (populated on failure)"
}
```

### RAGDeployStatusResponse

Response for the `/admin/rag/deploy/{deployment_id}/status` endpoint.

```json
{
  "deployment_id": "string",
  "status": "pending|downloading|registering|linking|completed|failed",
  "tenant_id": "string",
  "rag_id": "string",
  "s3_url": "string",
  "files_total": number,
  "files_downloaded": number,
  "current_file": "string (empty when complete)",
  "bytes_downloaded": number,
  "started_at": "ISO timestamp",
  "completed_at": "ISO timestamp | null",
  "duration_seconds": "number | null",
  "rag_config_id": "string | null",
  "rag_version": "number | null",
  "paths": {},
  "error_message": "string | null"
}
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| 200 OK | Operation completed successfully |
| 401 Unauthorized | Missing headers or expired timestamp |
| 403 Forbidden | Invalid signature |
| 500 Internal Server Error | Server-side error (check logs) |
| 503 Service Unavailable | Admin API not configured |

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Integration Examples

### Python (using provided client)

```python
# Import the signature computation function
import hashlib
import hmac
import json
import secrets
import time

import httpx

API_KEY = "your_api_key_here"
BASE_URL = "http://localhost:8000"


def generate_nonce() -> str:
    """Generate a cryptographically secure random nonce."""
    return secrets.token_urlsafe(24)  # 32 characters, URL-safe


def compute_signature(api_key: str, timestamp: str, nonce: str, method: str, path: str, body: bytes) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    message = f"{timestamp}{nonce}{method.upper()}{path}{body_hash}"
    return hmac.new(api_key.encode(), message.encode(), hashlib.sha256).hexdigest()


def make_request(method: str, path: str, body: dict | None = None, params: dict | None = None) -> dict:
    timestamp = str(int(time.time()))
    nonce = generate_nonce()
    # IMPORTANT: For GET requests, use empty bytes b"" for the body hash
    # For POST requests, serialize the body dict to JSON bytes
    body_bytes = json.dumps(body).encode() if body else b""
    # IMPORTANT: Sign only the path (no query params). The server uses request.url.path.
    signature = compute_signature(API_KEY, timestamp, nonce, method, path, body_bytes)

    headers = {
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
        "Content-Type": "application/json",
    }

    with httpx.Client() as client:
        if method == "GET":
            response = client.get(f"{BASE_URL}{path}", headers=headers, params=params)
        else:
            response = client.post(f"{BASE_URL}{path}", headers=headers, content=body_bytes)

    return response.json()


# Health check (GET - no body)
print(make_request("GET", "/admin/health"))

# Get call status (GET with path parameter - no body)
call_id = "550e8400-e29b-41d4-a716-446655440000"
print(make_request("GET", f"/admin/calls/{call_id}/status"))

# List LLM providers (GET with query params - params are NOT signed)
print(make_request("GET", "/admin/llm-providers"))
print(make_request("GET", "/admin/llm-providers", params={"usage_type": "extraction"}))

# Refresh all caches
print(make_request("POST", "/admin/cache/refresh/all", {}))

# Refresh specific agent
print(make_request("POST", "/admin/cache/refresh/agent", {
    "tenant_id": "your-tenant-uuid",
    "agent_id": "your-agent-uuid"
}))

# Query RAG knowledge base (active version)
result = make_request("POST", "/admin/rag/query", {
    "tenant_id": "your-tenant-uuid",
    "agent_id": "your-agent-uuid",
    "query": "What are the symptoms of diabetes?",
})
print(f"Found {result['metadata']['total_chunks']} chunks (version {result['metadata']['agent_config_version']})")

# Query RAG with specific config version (for testing)
result = make_request("POST", "/admin/rag/query", {
    "tenant_id": "your-tenant-uuid",
    "agent_id": "your-agent-uuid",
    "query": "What are the symptoms of diabetes?",
    "version": 2,  # specific version to test
    "search_mode": "hybrid",  # optional override
    "top_k": 5  # optional override
})
print(f"Version {result['metadata']['agent_config_version']} (active={result['metadata']['is_active_version']})")
for chunk in result["chunks"]:
    print(f"  - {chunk['filename']}: {chunk['content'][:100]}...")

# Deploy RAG from S3 (synchronous - small files)
result = make_request("POST", "/admin/rag/deploy", {
    "s3_url": "s3://my-bucket/rag-data/tenant-123/rag-456",
    "tenant_id": "your-tenant-uuid",
    "rag_name": "Product Knowledge Base",
    "link_to_agent_id": "your-agent-uuid"  # Optional: auto-link
})
print(f"RAG deployed: {result['rag_config_id']} v{result['rag_version']}")

# Deploy RAG from S3 (asynchronous - large files)
result = make_request("POST", "/admin/rag/deploy", {
    "s3_url": "s3://my-bucket/rag-data/tenant-123/large-rag-789",
    "tenant_id": "your-tenant-uuid",
    "rag_name": "Large Knowledge Base",
    "run_async": True
})
deployment_id = result["deployment_id"]
print(f"Deployment started: {deployment_id}")

# Poll for completion
import time
while True:
    status = make_request("GET", f"/admin/rag/deploy/{deployment_id}/status")
    print(f"Status: {status['status']} ({status['files_downloaded']}/{status['files_total']} files)")
    if status["status"] in ("completed", "failed"):
        break
    time.sleep(5)

if status["status"] == "completed":
    print(f"RAG deployed: {status['rag_config_id']} v{status['rag_version']}")
else:
    print(f"Deployment failed: {status['error_message']}")
```

### Node.js

```javascript
const crypto = require("crypto");

const API_KEY = "your_api_key_here";
const BASE_URL = "http://localhost:8000";

function generateNonce() {
  // Generate 24 random bytes, encode as base64url (32 characters)
  return crypto.randomBytes(24).toString("base64url");
}

function computeSignature(apiKey, timestamp, nonce, method, path, body) {
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  const message = `${timestamp}${nonce}${method.toUpperCase()}${path}${bodyHash}`;
  return crypto.createHmac("sha256", apiKey).update(message).digest("hex");
}

async function makeRequest(method, path, body = null, params = null) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  // IMPORTANT: For GET requests, use empty string "" for the body hash
  // For POST requests, serialize the body object to JSON
  const bodyStr = body ? JSON.stringify(body) : "";
  // IMPORTANT: Sign only the path (no query params). The server uses request.url.path.
  const signature = computeSignature(API_KEY, timestamp, nonce, method, path, bodyStr);

  // Append query params to URL (they are NOT part of the signature)
  let url = `${BASE_URL}${path}`;
  if (params) {
    url += "?" + new URLSearchParams(params).toString();
  }

  const response = await fetch(url, {
    method,
    headers: {
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
      "Content-Type": "application/json",
    },
    body: method !== "GET" ? bodyStr : undefined,
  });

  return response.json();
}

// Health check (GET - no body)
makeRequest("GET", "/admin/health").then(console.log);

// Get call status (GET with path parameter - no body)
const callId = "550e8400-e29b-41d4-a716-446655440000";
makeRequest("GET", `/admin/calls/${callId}/status`).then(console.log);

// List LLM providers with query params (params are NOT signed)
makeRequest("GET", "/admin/llm-providers", null, { usage_type: "extraction" }).then(console.log);

// Refresh all caches (POST with empty object body)
makeRequest("POST", "/admin/cache/refresh/all", {}).then(console.log);

// Query RAG knowledge base
makeRequest("POST", "/admin/rag/query", {
  tenant_id: "your-tenant-uuid",
  agent_id: "your-agent-uuid",
  query: "What are the symptoms of diabetes?",
}).then((result) => {
  console.log(`Found ${result.metadata.total_chunks} chunks`);
  result.chunks.forEach((chunk) => {
    console.log(`  - ${chunk.filename}: ${chunk.content.slice(0, 100)}...`);
  });
});
```

### cURL (with bash signature generation)

**GET Request Example (Call Status):**
```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:8000"
CALL_ID="550e8400-e29b-41d4-a716-446655440000"
PATH_="/admin/calls/${CALL_ID}/status"
METHOD="GET"
BODY=""  # Empty string for GET requests

TIMESTAMP=$(date +%s)
NONCE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${NONCE}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X GET "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Nonce: $NONCE" \
  -H "X-Signature: $SIGNATURE"
```

**POST Request Example (Refresh Cache):**
```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:8000"
PATH_="/admin/cache/refresh/all"
METHOD="POST"
BODY="{}"

TIMESTAMP=$(date +%s)
NONCE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${NONCE}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X POST "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Nonce: $NONCE" \
  -H "X-Signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

**RAG Query Example:**
```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:8000"
PATH_="/admin/rag/query"
METHOD="POST"
BODY='{"tenant_id":"your-tenant-uuid","agent_id":"your-agent-uuid","query":"What are the symptoms?"}'

TIMESTAMP=$(date +%s)
NONCE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${NONCE}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X POST "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Nonce: $NONCE" \
  -H "X-Signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

**Call Debug Trace Example (GET):**
```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:8000"
CALL_ID="01934a7f-1234-5678-9abc-def012345678"
PATH_="/admin/calls/${CALL_ID}/debug"
METHOD="GET"
BODY=""  # Empty string for GET requests

TIMESTAMP=$(date +%s)
NONCE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${NONCE}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X GET "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Nonce: $NONCE" \
  -H "X-Signature: $SIGNATURE" | jq .
```

**RAG Deploy Example (POST):**
```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:8000"
PATH_="/admin/rag/deploy"
METHOD="POST"
BODY='{"s3_url":"s3://my-bucket/rag-data/tenant-123/rag-456","tenant_id":"your-tenant-uuid","rag_name":"Product KB","link_to_agent_id":"your-agent-uuid"}'

TIMESTAMP=$(date +%s)
NONCE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${NONCE}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X POST "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Nonce: $NONCE" \
  -H "X-Signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$BODY" | jq .
```

**RAG Deploy Async with Polling:**
```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:8000"

# Start async deployment
PATH_="/admin/rag/deploy"
METHOD="POST"
BODY='{"s3_url":"s3://my-bucket/rag-data/tenant-123/large-rag","tenant_id":"your-tenant-uuid","rag_name":"Large KB","run_async":true}'

TIMESTAMP=$(date +%s)
NONCE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${NONCE}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

RESULT=$(curl -s -X POST "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Nonce: $NONCE" \
  -H "X-Signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$BODY")

DEPLOYMENT_ID=$(echo "$RESULT" | jq -r '.deployment_id')
echo "Deployment started: $DEPLOYMENT_ID"

# Poll for status
while true; do
    PATH_="/admin/rag/deploy/${DEPLOYMENT_ID}/status"
    METHOD="GET"
    BODY=""

    TIMESTAMP=$(date +%s)
    NONCE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
    BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
    MESSAGE="${TIMESTAMP}${NONCE}${METHOD}${PATH_}${BODY_HASH}"
    SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

    STATUS=$(curl -s -X GET "${BASE_URL}${PATH_}" \
      -H "X-Timestamp: $TIMESTAMP" \
      -H "X-Nonce: $NONCE" \
      -H "X-Signature: $SIGNATURE")

    STATUS_VALUE=$(echo "$STATUS" | jq -r '.status')
    echo "Status: $STATUS_VALUE"

    if [ "$STATUS_VALUE" = "completed" ] || [ "$STATUS_VALUE" = "failed" ]; then
        echo "$STATUS" | jq .
        break
    fi
    sleep 5
done
```

---

## Security Best Practices

1. **Use Strong API Keys**: Generate keys with at least 32 bytes of randomness:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Rotate Keys Regularly**: Update the `ADMIN_API_KEY` periodically.

3. **Secure Transport**: Always use HTTPS in production to protect headers in transit.

4. **Time Synchronization**: Ensure client and server clocks are synchronized (NTP).

5. **Network Restrictions**: Consider restricting Admin API access to specific IP addresses or VPNs.

6. **Audit Logging**: Monitor the orchestrator logs for admin API access patterns.

7. **Environment Variables**: Never commit the API key to version control.

---

## Replay Attack Protection

The HMAC authentication with nonce provides comprehensive protection against replay attacks:

1. **Nonce Uniqueness**: Each request requires a unique nonce - cannot be reused
2. **Nonce Storage**: Used nonces are stored in Redis with 6-minute TTL
3. **Timestamp Validation**: Requests older than 5 minutes are rejected
4. **Request Binding**: Signature includes method, path, and body - cannot be used for different requests

**Attack Scenario Prevention:**
| Attack | Protection |
|--------|------------|
| Replay same request immediately | Nonce is already used - rejected |
| Replay same request after cache expires | Timestamp expires after 5 minutes - rejected |
| Modify request body | Signature includes body hash - will fail |
| Use signature for different endpoint | Signature includes path - will fail |
| Timing attack on signature | Constant-time comparison used |
| Nonce collision attack | 192-bit random nonce has negligible collision probability |

**Why Both Timestamp AND Nonce?**
- **Timestamp alone**: Vulnerable within the 5-minute window - same request can be replayed multiple times
- **Nonce alone**: Requires permanent storage - impractical at scale
- **Both together**: Nonces only need to be stored for the timestamp window duration (auto-cleanup via TTL)

---

## Outbound Call Endpoints

The outbound call API allows initiating calls programmatically using a specified agent.

### Initiate Outbound Call

Start an outbound call to a phone number using the specified agent.

```
POST /admin/calls/outbound
```

**Request Body:**
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "to_number": "+15551234567",
  "from_number": "+15559876543",
  "version": 2,
  "metadata": {"campaign_id": "spring-2025"}
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenant_id` | string | **Yes** | Tenant UUID |
| `agent_id` | string | **Yes** | Agent UUID |
| `to_number` | string | **Yes** | Destination phone number (E.164 format) |
| `from_number` | string | No | Caller ID (must belong to tenant). If not provided, uses the phone number mapped to the agent. |
| `version` | integer | No | Agent config version (1+). If not provided, uses active version. |
| `metadata` | object | No | Optional call metadata (campaign_id, external_id, etc.) |

**Response (202 Accepted):**
```json
{
  "call_id": "1ef88a12-3456-7890-abcd-ef1234567890",
  "twilio_call_sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "direction": "outbound",
  "from_number": "+15559876543",
  "to_number": "+15551234567",
  "agent_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "agent_name": "Sales Agent",
  "agent_config_version": 2,
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 400 Bad Request | Invalid phone format | `"Invalid phone number format"` |
| 403 Forbidden | Phone not authorized | `"Phone number +15551234567 does not belong to tenant"` |
| 404 Not Found | Agent not found | `"Agent <agent_id> not found for tenant <tenant_id>"` |
| 404 Not Found | No phone mapped | `"No phone number mapped to agent <agent_id>"` |
| 500 Internal Server Error | Twilio error | `"Failed to initiate call: <error>"` |
| 503 Service Unavailable | Not configured | `"Outbound calls require RECORDING_WEBHOOK_BASE_URL to be set"` |

---

### Get Call Status

Poll for call status updates. Works for both inbound and outbound calls.

```
GET /admin/calls/{call_id}/status
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_id` | string | Call UUID |

**Response:**
```json
{
  "call_id": "1ef88a12-3456-7890-abcd-ef1234567890",
  "twilio_call_sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "in-progress",
  "direction": "outbound",
  "from_number": "+15559876543",
  "to_number": "+15551234567",
  "agent_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "agent_name": "Sales Agent",
  "started_at": "2025-01-15T10:30:00Z",
  "connected_at": "2025-01-15T10:30:15Z",
  "ended_at": null,
  "duration_seconds": null,
  "error_message": null
}
```

**Call Status Values:**
- `initiating` - Call is being set up
- `queued` - Call is queued at Twilio
- `ringing` - Recipient phone is ringing
- `in-progress` - Call is connected and active
- `completed` - Call ended normally
- `busy` - Recipient line was busy
- `no-answer` - Recipient didn't answer
- `failed` - Call failed (check error_message)
- `canceled` - Call was canceled

---

### Get Call Debug Trace

Fetch complete call trace for debugging. Aggregates all call data from PostgreSQL into a single response, including messages, transitions, RAG queries, variables, interruptions, and metrics.

```
GET /admin/calls/{call_id}/debug
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `call_id` | string | Call UUID |

**Response:**
```json
{
  "call_id": "01934a7f-1234-5678-9abc-def012345678",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "agent_name": "Sales Agent",
  "status": "ended",
  "direction": "inbound",
  "started_at": "2025-12-09T10:30:00.123456+00:00",
  "ended_at": "2025-12-09T10:32:45.789012+00:00",
  "duration_seconds": 165,

  "from_number": "+15551234567",
  "to_number": "+15559876543",
  "twilio_call_sid": "CA1234567890abcdef",
  "twilio_stream_sid": "MZ1234567890abcdef",

  "initial_node_id": "greeting",
  "final_node_id": "end_call",

  "total_turns": 5,
  "total_messages": 10,
  "total_transitions": 4,
  "total_rag_queries": 2,
  "total_interruptions": 1,

  "transitions": [
    {
      "sequence": 1,
      "timestamp": "2025-12-09T10:30:05.000000+00:00",
      "from_node_id": "greeting",
      "from_node_name": "Greeting",
      "to_node_id": "collect_info",
      "to_node_name": "Collect Information",
      "reason": "user_responded",
      "condition": "always",
      "turn_number": 1
    }
  ],

  "messages": [
    {
      "sequence": 1,
      "timestamp": "2025-12-09T10:30:02.000000+00:00",
      "role": "assistant",
      "content": "Hello! How can I help you today?",
      "node_id": "greeting",
      "turn_number": 0,
      "was_interrupted": false
    },
    {
      "sequence": 2,
      "timestamp": "2025-12-09T10:30:05.000000+00:00",
      "role": "user",
      "content": "I need help with my order",
      "node_id": "greeting",
      "turn_number": 1,
      "was_interrupted": false
    }
  ],

  "rag_retrievals": [
    {
      "sequence": 3,
      "timestamp": "2025-12-09T10:30:10.000000+00:00",
      "query": "help with order",
      "node_id": "collect_info",
      "search_mode": "hybrid",
      "chunks_retrieved": 3,
      "processing_time_ms": 320.5
    }
  ],

  "variables": {
    "customer_name": "John Smith",
    "order_number": "ORD-12345"
  },

  "interruptions": [
    {
      "sequence": 5,
      "timestamp": "2025-12-09T10:31:20.000000+00:00",
      "turn_number": 3,
      "node_id": "collect_info"
    }
  ],

  "metrics_summary": {
    "stt_delay": {"avg": 45.2, "min": 30, "max": 65, "num": 5},
    "user_to_bot_latency": {"avg": 1250.5, "min": 800, "max": 1800, "num": 5},
    "llm_ttfb": {"avg": 450.3, "min": 320, "max": 620, "num": 5},
    "rag_processing_time": {"avg": 315.0, "min": 280, "max": 350, "num": 2}
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `call_id` | string | Call UUID |
| `tenant_id` | string | Tenant UUID |
| `agent_id` | string | Agent UUID |
| `agent_name` | string | Human-readable agent name |
| `status` | string | Call status (started, ongoing, ended, failed) |
| `direction` | string | Call direction (inbound, outbound) |
| `started_at` | string | ISO timestamp of call start |
| `ended_at` | string | ISO timestamp of call end (null if ongoing) |
| `duration_seconds` | integer | Call duration in seconds |
| `from_number` | string | Caller phone number |
| `to_number` | string | Recipient phone number |
| `twilio_call_sid` | string | Twilio call SID |
| `twilio_stream_sid` | string | Twilio stream SID |
| `initial_node_id` | string | Starting workflow node |
| `final_node_id` | string | Ending workflow node |
| `total_turns` | integer | Number of conversation turns |
| `total_messages` | integer | Total messages exchanged |
| `total_transitions` | integer | Number of workflow transitions |
| `total_rag_queries` | integer | Number of RAG queries |
| `total_interruptions` | integer | Number of user interruptions |
| `transitions` | array | List of workflow transitions in chronological order |
| `messages` | array | List of conversation messages in chronological order |
| `rag_retrievals` | array | List of RAG queries with results |
| `variables` | object | Extracted variables (key-value pairs) |
| `interruptions` | array | List of user interruption events |
| `metrics_summary` | object | Performance metrics (JSONB from call_metrics_summary) |

**Error Responses:**

| Status Code | Scenario | Detail |
|-------------|----------|--------|
| 400 Bad Request | Invalid UUID format | `"Invalid call_id format: <call_id>"` |
| 404 Not Found | Call not found | `"Call not found: <call_id>"` |

**Use Case:**

This endpoint is designed for debugging call issues. Instead of querying CloudWatch logs or multiple database tables, you can get a complete picture of a call in a single API request:

1. **What happened?** - See all messages exchanged between user and bot
2. **How did it flow?** - See all workflow transitions with reasons
3. **What was retrieved?** - See RAG queries and their results
4. **What was extracted?** - See collected variables
5. **Were there interruptions?** - See when users interrupted the bot
6. **Performance issues?** - See latency metrics

See also: [TRACEABILITY_GUIDE.md](TRACEABILITY_GUIDE.md) for more debugging guidance.

---

### Outbound Call CLI Tool

A Python CLI tool is provided for easy outbound call initiation.

**Usage:**

```bash
# Basic call (uses agent's mapped phone as caller ID)
uv run python scripts/outbound_call_cli.py \
    --tenant <tenant_id> --agent <agent_id> --to +15551234567

# With explicit caller ID
uv run python scripts/outbound_call_cli.py \
    --tenant <tenant_id> --agent <agent_id> --to +15551234567 --from +15559876543

# Initiate only (no polling)
uv run python scripts/outbound_call_cli.py \
    --tenant <tenant_id> --agent <agent_id> --to +15551234567 --no-poll

# Custom poll interval
uv run python scripts/outbound_call_cli.py \
    --tenant <tenant_id> --agent <agent_id> --to +15551234567 --poll-interval 5
```

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_API_KEY` | Yes | Shared secret for HMAC signing |

---

## OpenAPI Documentation

When the orchestrator is running, you can access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

These include the Admin API endpoints with request/response schemas.
