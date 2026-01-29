# Webhook Guide

**Retell AI-Compatible Webhook System for Call Lifecycle Events**

This guide covers how to configure, test, and integrate webhooks for receiving real-time call events.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Events & Payloads](#events--payloads)
5. [Authentication](#authentication)
6. [Retry Behavior](#retry-behavior)
7. [Testing Webhooks](#testing-webhooks)
8. [Integration Examples](#integration-examples)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The webhook system delivers call lifecycle events to your endpoints in a format **identical to Retell AI's webhooks**. This enables:

- **Seamless migration** from Retell AI
- **Real-time notifications** when calls start, end, or are analyzed
- **CRM integration** with call transcripts and collected data
- **Analytics pipelines** with latency metrics and sentiment analysis

### Supported Events

| Event | When Fired | Use Cases |
|-------|------------|-----------|
| `call_started` | Call connects (voice) or session created (text) | Update CRM, start timers, log call attempt |
| `call_ended` | Call finalizes | Store transcript, process collected data, update records |
| `call_analyzed` | Post-call AI analysis completes | Store sentiment, success metrics, SDOH data |

### Delivery Guarantees

- **Timeout**: 10 seconds (configurable)
- **Retries**: Up to 3 attempts with exponential backoff
- **Fire-and-forget**: Webhook delivery never blocks call flow
- **Idempotency**: Use `call_id` to deduplicate if needed

---

## Quick Start

### 1. Add Webhook Config to Agent JSON

```json
{
  "workflow": {
    "webhook": {
      "enabled": true,
      "url": "https://your-api.com/webhooks/calls",
      "events": ["call_started", "call_ended", "call_analyzed"]
    },
    "initial_node": "greeting",
    "nodes": [...]
  }
}
```

### 2. Clear Redis Cache (if config was previously loaded)

```bash
docker exec orchestrator-redis redis-cli FLUSHALL
```

### 3. Make a Test Call

Use text chat CLI for quick testing:
```bash
uv run python scripts/chat_cli.py --tenant <tenant_id> --agent <agent_id>
```

---

## Configuration

### Full Configuration Example

```json
{
  "workflow": {
    "webhook": {
      "enabled": true,
      "url": "https://api.example.com/webhooks/calls",
      "events": ["call_started", "call_ended", "call_analyzed"],
      "timeout_seconds": 10,
      "auth": {
        "type": "hmac",
        "secret": "your-secret-key-min-32-chars-recommended"
      },
      "retry": {
        "max_retries": 3,
        "initial_delay_ms": 1000,
        "max_delay_ms": 10000,
        "backoff_multiplier": 2.0
      },
      "include_transcript": true,
      "include_latency_metrics": true
    }
  }
}
```

### Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Master switch for webhooks |
| `url` | string | `""` | Your webhook endpoint (HTTPS recommended) |
| `events` | array | All events | Which events to send |
| `timeout_seconds` | integer | `10` | HTTP request timeout |
| `auth.type` | string | `"none"` | `"none"`, `"bearer"`, or `"hmac"` |
| `auth.secret` | string | `null` | Secret for bearer token or HMAC signing |
| `retry.max_retries` | integer | `3` | Retry attempts after failure |
| `retry.initial_delay_ms` | integer | `1000` | First retry delay |
| `retry.max_delay_ms` | integer | `10000` | Maximum retry delay |
| `retry.backoff_multiplier` | float | `2.0` | Exponential backoff factor |
| `include_transcript` | boolean | `true` | Include transcript in call_ended |
| `include_latency_metrics` | boolean | `true` | Include p50/p90/p95/p99 latencies |

---

## Events & Payloads

### call_started

Fired when a call connects (voice) or a chat session is created (text).

```json
{
  "event": "call_started",
  "call": {
    "call_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_id": "123e4567-e89b-12d3-a456-426614174000",
    "agent_name": "Customer Support Agent",
    "call_type": "phone_call",
    "direction": "inbound",
    "call_status": "in_progress",
    "from_number": "+14155551234",
    "to_number": "+18005551234",
    "twilio_call_sid": "CA1234567890abcdef",
    "start_timestamp": 1706400000000,
    "metadata": null
  }
}
```

### call_ended

Fired when a call ends. Contains full conversation data.

```json
{
  "event": "call_ended",
  "call": {
    "call_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_id": "123e4567-e89b-12d3-a456-426614174000",
    "agent_name": "Customer Support Agent",
    "call_type": "phone_call",
    "direction": "inbound",
    "call_status": "ended",
    "from_number": "+14155551234",
    "to_number": "+18005551234",
    "twilio_call_sid": "CA1234567890abcdef",
    "start_timestamp": 1706400000000,
    "end_timestamp": 1706400120000,
    "duration_ms": 120000,
    "disconnection_reason": "user_hangup",
    "transcript": "Agent: Hello, how can I help you today?\nUser: I need to schedule an appointment.\nAgent: I'd be happy to help with that...",
    "transcript_object": [
      {"role": "assistant", "content": "Hello, how can I help you today?"},
      {"role": "user", "content": "I need to schedule an appointment."},
      {"role": "assistant", "content": "I'd be happy to help with that..."}
    ],
    "collected_dynamic_variables": {
      "first_name": "John",
      "appointment_date": "2026-02-15",
      "appointment_time": "2:00 PM"
    },
    "latency": {
      "e2e": {"p50": 450, "p90": 620, "p95": 710, "p99": 890},
      "llm": {"p50": 320, "p90": 480, "p95": 550, "p99": 680}
    },
    "total_tokens": 1250,
    "total_tts_characters": 890,
    "metadata": null
  }
}
```

#### Disconnection Reasons

| Reason | Description |
|--------|-------------|
| `user_hangup` | User ended the call |
| `agent_hangup` | Agent workflow ended the call |
| `call_transfer` | Call was transferred to another agent |
| `max_duration_reached` | Call hit maximum duration limit |
| `inactivity` | No user response for extended period |
| `dial_busy` | Outbound: number was busy |
| `dial_failed` | Outbound: call failed to connect |
| `dial_no_answer` | Outbound: no answer |
| `error_llm` | LLM service error |
| `error_tts` | TTS service error |
| `error_stt` | STT service error |
| `error_pipeline` | Pipeline error |

### call_analyzed

Fired after post-call AI analysis completes.

```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_id": "123e4567-e89b-12d3-a456-426614174000",
    "agent_name": "Customer Support Agent",
    "call_type": "phone_call",
    "metadata": null
  },
  "analysis": {
    "sentiment": "positive",
    "sentiment_score": 0.85,
    "summary": "Customer called to schedule an appointment. Agent successfully booked appointment for February 15th at 2:00 PM.",
    "call_successful": true,
    "success_confidence": 0.92,
    "keywords_detected": ["appointment", "schedule", "booking"],
    "topics_discussed": ["appointment_scheduling", "availability"],
    "custom_analysis_data": [
      {
        "question_name": "appointment_scheduled",
        "question_type": "boolean",
        "response_value": "true",
        "response_confidence": 0.95
      }
    ]
  }
}
```

---

## Authentication

### No Authentication

```json
{ "auth": { "type": "none" } }
```

No authentication headers sent. Use only for testing or internal endpoints.

### Bearer Token

```json
{ "auth": { "type": "bearer", "secret": "your-api-token" } }
```

Sends header:
```
Authorization: Bearer your-api-token
```

### HMAC-SHA256 Signature (Recommended)

```json
{ "auth": { "type": "hmac", "secret": "your-secret-key" } }
```

Sends headers:
```
X-Webhook-Signature: sha256=<hex-encoded-signature>
X-Webhook-Timestamp: 1706400000
```

#### Verifying HMAC Signature

```python
import hmac
import hashlib
import json

def verify_webhook(request_body: bytes, signature_header: str, secret: str) -> bool:
    """Verify webhook HMAC signature."""
    # Extract signature from header
    if not signature_header.startswith("sha256="):
        return False
    received_signature = signature_header[7:]

    # Calculate expected signature
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        request_body,
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(received_signature, expected_signature)
```

---

## Retry Behavior

When a webhook delivery fails (non-2xx response or timeout), the system retries with exponential backoff:

| Attempt | Delay | Total Elapsed |
|---------|-------|---------------|
| 1 (initial) | 0ms | 0ms |
| 2 (retry 1) | 1000ms | 1s |
| 3 (retry 2) | 2000ms | 3s |
| 4 (retry 3) | 4000ms | 7s |

**Configuration:**
- `initial_delay_ms`: Starting delay (default: 1000ms)
- `backoff_multiplier`: Delay multiplier (default: 2.0)
- `max_delay_ms`: Maximum delay cap (default: 10000ms)
- `max_retries`: Maximum retry attempts (default: 3)

**Success Criteria:** Any 2xx HTTP status code is considered success.

---

## Testing Webhooks

### Option 1: webhook.site (Recommended for Quick Testing)

1. Go to [https://webhook.site](https://webhook.site)
2. Copy your unique URL
3. Configure agent with that URL
4. Make a test call - payloads appear in real-time

### Option 2: Local Test Server

```python
# test_webhook_server.py
from fastapi import FastAPI, Request
import uvicorn
import json

app = FastAPI()

@app.post("/webhook")
async def receive_webhook(request: Request):
    body = await request.json()
    print(f"\n{'='*60}")
    print(f"EVENT: {body.get('event')}")
    print(f"CALL_ID: {body.get('call', {}).get('call_id')}")
    print(f"{'='*60}")
    print(json.dumps(body, indent=2))
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
```

Run: `uv run python test_webhook_server.py`

Configure agent: `"url": "http://localhost:9000/webhook"`

### Option 3: ngrok for External Testing

```bash
# Terminal 1: Run local server
uv run python test_webhook_server.py

# Terminal 2: Expose via ngrok
ngrok http 9000
```

Use the ngrok URL in your agent config.

---

## Integration Examples

### Node.js/Express Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(req) {
  const signature = req.headers['x-webhook-signature'];
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

app.post('/webhooks/calls', (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, call, analysis } = req.body;

  switch (event) {
    case 'call_started':
      console.log(`Call started: ${call.call_id}`);
      // Update CRM, start tracking
      break;

    case 'call_ended':
      console.log(`Call ended: ${call.call_id}, duration: ${call.duration_ms}ms`);
      // Store transcript, process variables
      break;

    case 'call_analyzed':
      console.log(`Call analyzed: ${call.call_id}, sentiment: ${analysis.sentiment}`);
      // Store analysis results
      break;
  }

  res.status(200).json({ received: true });
});

app.listen(3000);
```

### Python/FastAPI Webhook Handler

```python
from fastapi import FastAPI, Request, HTTPException
import hmac
import hashlib

app = FastAPI()
WEBHOOK_SECRET = "your-secret-key"

def verify_signature(body: bytes, signature: str) -> bool:
    if not signature.startswith("sha256="):
        return False
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature[7:], expected)

@app.post("/webhooks/calls")
async def handle_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("x-webhook-signature", "")

    if not verify_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()
    event = data["event"]
    call = data.get("call", {})

    if event == "call_started":
        print(f"Call started: {call['call_id']}")

    elif event == "call_ended":
        print(f"Call ended: {call['call_id']}")
        if "collected_dynamic_variables" in call:
            print(f"Collected: {call['collected_dynamic_variables']}")

    elif event == "call_analyzed":
        analysis = data.get("analysis", {})
        print(f"Sentiment: {analysis['sentiment']}")

    return {"status": "ok"}
```

---

## Troubleshooting

### Webhooks Not Firing

1. **Check `enabled` is `true`** in agent config
2. **Check `url` is set** and accessible
3. **Check `events` array** includes the event type
4. **Clear Redis cache** after config changes:
   ```bash
   docker exec orchestrator-redis redis-cli FLUSHALL
   ```

### Webhook Delivery Failing

Check logs for webhook errors:
```bash
# Look for webhook-related logs
grep -i "webhook" logs/orchestrator.log
```

Common issues:
- **Timeout**: Increase `timeout_seconds` or optimize endpoint
- **SSL errors**: Ensure valid HTTPS certificate
- **Auth failures**: Verify secret matches on both ends

### Verifying Payloads

Use the call debug API to see what data was stored:
```bash
curl -X GET "http://localhost:8000/admin/calls/{call_id}/debug" \
  -H "X-Timestamp: $(date +%s)" \
  -H "X-Signature: <hmac-signature>"
```

### Missing transcript or metrics

- **transcript**: Set `include_transcript: true`
- **latency**: Set `include_latency_metrics: true`
- **call_analyzed**: Requires `ANALYSIS_LLM_ENABLED=true` in `.env`

---

---

## Database Storage

All webhook delivery attempts for **voice calls** are logged to the `webhook_deliveries` table.

### webhook_deliveries Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `call_id` | UUID | FK to calls.call_id |
| `event_type` | VARCHAR(50) | Event type (call_started, call_ended, call_analyzed) |
| `webhook_url` | VARCHAR(1000) | Target webhook URL |
| `request_payload` | JSONB | Full request payload sent |
| `status` | VARCHAR(20) | pending, success, or failed |
| `attempts` | INTEGER | Number of delivery attempts |
| `last_attempt_at` | TIMESTAMPTZ | Timestamp of last attempt |
| `last_status_code` | INTEGER | HTTP status code from last attempt |
| `last_error` | TEXT | Error message from last failure |
| `response_body` | TEXT | Response body (truncated to 1000 chars) |
| `duration_ms` | INTEGER | Total delivery duration |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `completed_at` | TIMESTAMPTZ | When delivery completed |

### Querying Webhook Logs

```sql
-- Find failed webhook deliveries for a call
SELECT event_type, status, attempts, last_error, created_at
FROM webhook_deliveries
WHERE call_id = 'your-call-id'
ORDER BY created_at;

-- Find all failed deliveries in the last hour
SELECT call_id, event_type, webhook_url, last_error, attempts
FROM webhook_deliveries
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Get delivery success rate by event type
SELECT
    event_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'success') as success,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 1) as success_rate
FROM webhook_deliveries
GROUP BY event_type;
```

### Notes

- **Voice calls**: All webhooks logged to `webhook_deliveries` table
- **Text chat**: Webhooks delivered but not logged to database (text_conversations uses separate table)
- **Payload storage**: Full request payload stored as JSONB for debugging
- **Response truncation**: Response body truncated to 1000 characters

---

## See Also

- **[AGENT_JSON_SCHEMA.md](AGENT_JSON_SCHEMA.md)** - Complete agent configuration reference
- **[TEXT_CHAT_API.md](TEXT_CHAT_API.md)** - Text chat REST API (also triggers webhooks)
- **[CALL_STORAGE_GUIDE.md](CALL_STORAGE_GUIDE.md)** - Call data storage reference
