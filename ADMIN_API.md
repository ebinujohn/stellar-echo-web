# Admin API Documentation

The Admin API provides cache management and RAG query endpoints for the orchestrator service. These endpoints are designed for machine-to-machine (M2M) communication, allowing external applications to trigger cache refresh operations and query knowledge bases.

## Authentication

All Admin API endpoints require **HMAC-SHA256 request signing**. This provides protection against replay attacks - even if a request is intercepted, it cannot be reused.

### How HMAC Signing Works

1. Each request includes a **timestamp** and **signature**
2. The signature is computed from: `timestamp + method + path + body_hash`
3. Server rejects requests older than **5 minutes** (replay protection)
4. Signatures are compared using constant-time comparison (timing attack protection)

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Timestamp` | Unix timestamp in seconds (e.g., `1700000000`) |
| `X-Signature` | HMAC-SHA256 signature (hex-encoded) |
| `Content-Type` | `application/json` |

### Signature Computation

```
body_hash = SHA256(request_body)
message = timestamp + method + path + body_hash
signature = HMAC-SHA256(api_key, message)
```

**Example:**
```
timestamp = "1700000000"
method = "POST"
path = "/admin/cache/refresh/all"
body = "{}"
body_hash = SHA256("{}") = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
message = "1700000000POST/admin/cache/refresh/all44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
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
    "rag_config_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
import time

import httpx

API_KEY = "your_api_key_here"
BASE_URL = "http://localhost:8000"


def compute_signature(api_key: str, timestamp: str, method: str, path: str, body: bytes) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    message = f"{timestamp}{method.upper()}{path}{body_hash}"
    return hmac.new(api_key.encode(), message.encode(), hashlib.sha256).hexdigest()


def make_request(method: str, path: str, body: dict | None = None) -> dict:
    timestamp = str(int(time.time()))
    body_bytes = json.dumps(body or {}).encode()
    signature = compute_signature(API_KEY, timestamp, method, path, body_bytes)

    headers = {
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "Content-Type": "application/json",
    }

    with httpx.Client() as client:
        if method == "GET":
            response = client.get(f"{BASE_URL}{path}", headers=headers)
        else:
            response = client.post(f"{BASE_URL}{path}", headers=headers, content=body_bytes)

    return response.json()


# Health check
print(make_request("GET", "/admin/health"))

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
```

### Node.js

```javascript
const crypto = require("crypto");

const API_KEY = "your_api_key_here";
const BASE_URL = "http://localhost:8000";

function computeSignature(apiKey, timestamp, method, path, body) {
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  const message = `${timestamp}${method.toUpperCase()}${path}${bodyHash}`;
  return crypto.createHmac("sha256", apiKey).update(message).digest("hex");
}

async function makeRequest(method, path, body = null) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : "{}";
  const signature = computeSignature(API_KEY, timestamp, method, path, bodyStr);

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      "Content-Type": "application/json",
    },
    body: method !== "GET" ? bodyStr : undefined,
  });

  return response.json();
}

// Health check
makeRequest("GET", "/admin/health").then(console.log);

// Refresh all caches
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

```bash
#!/bin/bash

API_KEY="your_api_key_here"
BASE_URL="http://localhost:8000"
PATH_="/admin/cache/refresh/all"
METHOD="POST"
BODY="{}"

TIMESTAMP=$(date +%s)
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X POST "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
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
BODY_HASH=$(echo -n "$BODY" | sha256sum | cut -d' ' -f1)
MESSAGE="${TIMESTAMP}${METHOD}${PATH_}${BODY_HASH}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$API_KEY" | cut -d' ' -f2)

curl -X POST "${BASE_URL}${PATH_}" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$BODY"
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

The HMAC authentication provides protection against replay attacks:

1. **Timestamp Validation**: Requests older than 5 minutes are rejected
2. **Request Binding**: Signature includes method, path, and body - cannot be used for different requests
3. **Time Window**: Even if captured, requests expire quickly

**Attack Scenario Prevention:**
| Attack | Protection |
|--------|------------|
| Replay same request | Timestamp expires after 5 minutes |
| Modify request body | Signature includes body hash - will fail |
| Use signature for different endpoint | Signature includes path - will fail |
| Timing attack on signature | Constant-time comparison used |

---

## OpenAPI Documentation

When the orchestrator is running, you can access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

These include the Admin API endpoints with request/response schemas.
