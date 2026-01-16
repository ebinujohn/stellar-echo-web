# Text Chat API Reference

Complete API reference and UI implementation guide for the text-only chat mode.

## Overview

The Text Chat API enables text-based interactions with agents without voice (STT/TTS) processing. It uses the same workflow configurations as voice mode but communicates over REST instead of WebSocket.

### Key Features

- **Same Agent Configs**: Uses identical `workflow`, `llm`, and node configurations
- **Session-Based**: Stateful sessions with full conversation history
- **PostgreSQL Persistence**: Complete audit trail of all messages, transitions, and variables
- **HMAC Authentication**: Secure API access with signature verification
- **APScheduler Integration**: Background session cleanup using industry-standard scheduler
- **Enhanced Response Data**: Full transition chains, node names, and extracted variables returned with every response

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI / Client                                  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ REST API (HMAC authenticated)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TextChatHandler                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Session Management          │  In-memory state + PostgreSQL │  │
│  │  • conversation_history      │  • Real-time tracking         │  │
│  │  • current_node              │  • Full persistence           │  │
│  │  • collected_data            │                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ TransitionEval  │  │ VariableExtract │  │   OpenAI SDK     │   │
│  │ (reused)        │  │ (reused)        │  │   (direct calls) │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Session Flow

```
1. Create Session           2. Send Messages              3. End Session
   POST /sessions              POST /sessions/{id}/messages    DELETE /sessions/{id}
        │                           │                               │
        ▼                           ▼                               ▼
   Get session_id          Send user message            Cleanup & close
   Get initial greeting    Receive agent response       Get final stats
```

**Session Lifecycle:**
1. Client creates session with `tenant_id` and `agent_id`
2. Server returns unique `session_id` (used in all subsequent requests)
3. Client sends messages → Server returns agent responses
4. Client ends session OR session times out after inactivity

---

## Authentication

All endpoints require **HMAC-SHA256** authentication.

**⚠️ IMPORTANT**: The signature scheme was updated to match the Admin API format (includes method + path + body_hash). Old clients using the simplified format need to update their signature generation.

### Headers

| Header | Description |
|--------|-------------|
| `X-Timestamp` | Unix timestamp (seconds) |
| `X-Signature` | HMAC-SHA256 signature |
| `Content-Type` | `application/json` |

### Signature Generation

**IMPORTANT**: This API uses the same HMAC signature scheme as the Admin API.

```python
import hmac
import hashlib
import time
import json

def compute_signature(
    api_key: str,
    timestamp: str,
    method: str,
    path: str,
    body: bytes,
) -> str:
    """
    Compute HMAC-SHA256 signature for request authentication.

    Signature = HMAC-SHA256(api_key, timestamp + method + path + body_sha256)
    """
    # Hash the body to normalize it (handles empty bodies consistently)
    body_hash = hashlib.sha256(body).hexdigest()

    # Create the message to sign
    message = f"{timestamp}{method.upper()}{path}{body_hash}"

    # Compute HMAC-SHA256
    signature = hmac.new(
        api_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return signature

# Example usage
timestamp = str(int(time.time()))
body_dict = {"tenant_id": "...", "agent_id": "..."}
body_bytes = json.dumps(body_dict).encode('utf-8')
method = "POST"
path = "/api/chat/sessions"

signature = compute_signature(
    api_key=API_SECRET,
    timestamp=timestamp,
    method=method,
    path=path,
    body=body_bytes
)

headers = {
    "Content-Type": "application/json",
    "X-Timestamp": timestamp,
    "X-Signature": signature
}
```

### JavaScript Example

```javascript
async function sha256(data) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function computeSignature(apiSecret, timestamp, method, path, bodyBytes) {
    // Hash the body
    const bodyHash = await sha256(bodyBytes || '');

    // Create message to sign
    const message = `${timestamp}${method.toUpperCase()}${path}${bodyHash}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(message)
    );

    const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return signature;
}

// Example usage
const timestamp = Math.floor(Date.now() / 1000).toString();
const bodyStr = JSON.stringify({ tenant_id: "...", agent_id: "..." });
const signature = await computeSignature(
    API_SECRET,
    timestamp,
    "POST",
    "/api/chat/sessions",
    bodyStr
);
```

---

## API Endpoints

### Create Session

Create a new text chat session with an agent.

```http
POST /api/chat/sessions
```

**Request Body:**
```json
{
    "tenant_id": "6bc1814c-5705-5b6e-af99-104b91962282",
    "agent_id": "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
    "version": 2,
    "metadata": {
        "user_id": "user123",
        "channel": "web",
        "custom_field": "value"
    }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenant_id` | string (UUID) | Yes | Tenant identifier |
| `agent_id` | string (UUID) | Yes | Agent identifier |
| `version` | integer | No | Agent config version (≥1). If not provided, uses active version |
| `metadata` | object | No | Client metadata (passed to webhooks) |

**Response (201 Created):**
```json
{
    "session_id": "text_abc123def456",
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "node_id": "collect_info",
    "node_name": "Collect User Information",
    "initial_node_id": "fast_disclaimer",
    "initial_node_name": "Fast Disclaimer",
    "transitions": [
        {
            "from_node": "fast_disclaimer",
            "from_node_name": "Fast Disclaimer",
            "to_node": "greeting",
            "to_node_name": "Welcome Greeting",
            "condition": "always"
        },
        {
            "from_node": "greeting",
            "from_node_name": "Welcome Greeting",
            "to_node": "collect_info",
            "to_node_name": "Collect User Information",
            "condition": "always"
        }
    ],
    "agent_config_version": 2,
    "is_active_version": false,
    "initial_message": "Thank you for calling. Hello! I'm Ivan. How can I help you today?",
    "created_at": "2025-11-26T10:30:00.000Z"
}
```

| Field | Description |
|-------|-------------|
| `session_id` | External identifier for client use (include in subsequent requests) |
| `conversation_id` | Database UUID for the conversation record |
| `status` | Always `"active"` on creation |
| `node_id` | Current workflow node after initialization |
| `node_name` | Human-readable name of the current node |
| `initial_node_id` | Starting node before automatic transitions |
| `initial_node_name` | Human-readable name of the starting node |
| `transitions` | List of automatic transitions during initialization (e.g., proactive node chains) |
| `agent_config_version` | Agent config version number being used |
| `is_active_version` | `true` if active version was used, `false` if specific version requested |
| `initial_message` | Greeting if node has `static_text` or LLM response (null otherwise) |
| `created_at` | Timestamp |

**Error Responses:**
- `401 Unauthorized` - Invalid or missing HMAC signature
- `404 Not Found` - Agent not found or version does not exist
- `500 Internal Server Error` - Server error

**Version Notes:**
- If `version` is omitted, the **active** agent configuration version is used
- If `version` is specified but doesn't exist, a `404` error is returned
- Use this to test non-active versions before promoting them

---

### Send Message

Send a user message and receive the agent's response.

```http
POST /api/chat/sessions/{session_id}/messages
```

**Path Parameters:**
| Parameter | Description |
|-----------|-------------|
| `session_id` | Session identifier from create session response |

**Request Body:**
```json
{
    "content": "I'd like to schedule an appointment"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `content` | string | Yes | 1-10,000 characters |

**Response (200 OK):**
```json
{
    "response": "I'd be happy to help you schedule an appointment. What day works best for you?",
    "node_id": "scheduling",
    "node_name": "Schedule Appointment",
    "previous_node_id": "greeting",
    "previous_node_name": "Welcome Greeting",
    "transitions": [
        {
            "from_node": "greeting",
            "from_node_name": "Welcome Greeting",
            "to_node": "scheduling",
            "to_node_name": "Schedule Appointment",
            "condition": "intent:schedule_appointment"
        }
    ],
    "transition": {
        "from_node": "greeting",
        "from_node_name": "Welcome Greeting",
        "to_node": "scheduling",
        "to_node_name": "Schedule Appointment",
        "condition": "intent:schedule_appointment"
    },
    "extracted_variables": {
        "intent": "scheduling"
    },
    "session_ended": false,
    "turn_number": 1,
    "latency_ms": 523
}
```

| Field | Description |
|-------|-------------|
| `response` | Agent's response text |
| `node_id` | Current workflow node after processing |
| `node_name` | Human-readable name of the current node |
| `previous_node_id` | Node before processing this message |
| `previous_node_name` | Human-readable name of the previous node |
| `transitions` | List of all transitions during message processing |
| `transition` | Last transition info (for backwards compatibility, null if no transitions) |
| `extracted_variables` | Variables extracted in this turn (null if none) |
| `session_ended` | True if reached `end_call` node |
| `turn_number` | Current turn number |
| `latency_ms` | LLM response time in milliseconds |

**Error Responses:**
- `401 Unauthorized` - Invalid signature
- `404 Not Found` - Session not found
- `410 Gone` - Session no longer active

---

### Get Session Status

Get current status and collected data for a session.

```http
GET /api/chat/sessions/{session_id}
```

**Response (200 OK):**
```json
{
    "session_id": "text_abc123def456",
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "node_id": "collect_info",
    "node_name": "Collect User Information",
    "turns": 5,
    "transition_count": 2,
    "collected_data": {
        "first_name": "John",
        "appointment_date": "Monday"
    },
    "created_at": "2025-11-26T10:30:00.000Z",
    "updated_at": "2025-11-26T10:32:15.000Z",
    "ended_at": null
}
```

| Field | Description |
|-------|-------------|
| `session_id` | External session identifier |
| `conversation_id` | Database UUID for the conversation record |
| `status` | `active`, `completed`, `abandoned`, or `error` |
| `node_id` | Current workflow node ID |
| `node_name` | Human-readable name of the current node |
| `turns` | Total user inputs processed |
| `transition_count` | Total workflow transitions |
| `collected_data` | All extracted variables |
| `created_at` | Session creation timestamp |
| `updated_at` | Last activity timestamp |
| `ended_at` | End timestamp (null if still active) |

---

### End Session

Explicitly end a session and cleanup resources.

```http
DELETE /api/chat/sessions/{session_id}
```

**Response (200 OK):**
```json
{
    "success": true,
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "final_node_id": "end_call",
    "final_node_name": "Terminate Call",
    "total_turns": 8,
    "total_transitions": 4
}
```

| Field | Description |
|-------|-------------|
| `success` | Whether session was ended successfully |
| `conversation_id` | Database UUID for the conversation record |
| `final_node_id` | Final workflow node ID |
| `final_node_name` | Human-readable name of the final node |
| `total_turns` | Total turns in the session |
| `total_transitions` | Total transitions in the session |

---

## Response Models

### TransitionInfo

Every transition in the workflow is represented with full context:

```json
{
    "from_node": "greeting",
    "from_node_name": "Welcome Greeting",
    "to_node": "collect_info",
    "to_node_name": "Collect User Information",
    "condition": "always"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `from_node` | string | Source node ID |
| `from_node_name` | string \| null | Human-readable name of source node |
| `to_node` | string | Target node ID |
| `to_node_name` | string \| null | Human-readable name of target node |
| `condition` | string \| null | Condition that triggered the transition |

**Common Conditions:**
- `always` - Automatic transition (with `proactive: true` = after bot speaks)
- `user_responded` - User provided any input
- `contains:keyword` - User message contains specific keyword
- `intent:intent_name` - Intent classification matched
- `variables_extracted:var1,var2` - Specified variables were extracted
- `max_turns:N` - Maximum turns reached in current node

### Understanding Transitions

**Single Message, Multiple Transitions:**

A single user message can trigger multiple transitions. For example, when a user provides their name:

```
User: "My name is Jack and I want to learn about trading"

Transitions:
1. collect_info → extract_user_info (user_responded)
2. extract_user_info → personalized_greeting (variables_extracted:first_name,topic)
3. personalized_greeting → topic_selection (always, proactive node)
```

The `transitions` array captures this entire chain, while `transition` (singular) contains only the last one for backwards compatibility.

**Initialization Transitions:**

When a session is created, automatic transitions from proactive nodes may occur before the first user message:

```
Initial node: fast_disclaimer
Transitions during init:
1. fast_disclaimer → greeting (always, proactive node)
2. greeting → collect_info (always, proactive node)
Final node: collect_info
```

This explains why `initial_node_id` may differ from `node_id` in the create session response.

---

## UI Implementation Guide

### React Example

```tsx
import { useState, useCallback, useEffect } from 'react';

// Types matching the API response
interface TransitionInfo {
    from_node: string;
    from_node_name: string | null;
    to_node: string;
    to_node_name: string | null;
    condition: string | null;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    nodeId?: string;
    nodeName?: string;
    transitions?: TransitionInfo[];
    extractedVariables?: Record<string, string>;
    latencyMs?: number;
}

interface ChatState {
    sessionId: string | null;
    messages: ChatMessage[];
    currentNodeId: string | null;
    currentNodeName: string | null;
    isLoading: boolean;
    error: string | null;
    sessionEnded: boolean;
}

// API Configuration
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_SECRET = process.env.REACT_APP_API_SECRET!;

async function apiRequest(
    endpoint: string,
    method: string,
    body?: object
): Promise<any> {
    const bodyStr = body ? JSON.stringify(body) : '';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await computeSignature(
        API_SECRET,
        timestamp,
        method,
        endpoint,
        bodyStr
    );

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Timestamp': timestamp,
            'X-Signature': signature,
        },
        body: bodyStr || undefined,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API Error');
    }

    return response.json();
}

function useChat(
    tenantId: string,
    agentId: string,
    version?: number
) {
    const [state, setState] = useState<ChatState>({
        sessionId: null,
        messages: [],
        currentNodeId: null,
        currentNodeName: null,
        isLoading: false,
        error: null,
        sessionEnded: false,
    });

    // Start a new chat session
    const startSession = useCallback(async () => {
        setState(s => ({ ...s, isLoading: true, error: null }));

        try {
            const requestBody: any = {
                tenant_id: tenantId,
                agent_id: agentId,
            };
            if (version !== undefined) {
                requestBody.version = version;
            }

            const response = await apiRequest('/api/chat/sessions', 'POST', requestBody);

            const messages: ChatMessage[] = [];
            if (response.initial_message) {
                messages.push({
                    role: 'assistant',
                    content: response.initial_message,
                    nodeId: response.node_id,
                    nodeName: response.node_name,
                    transitions: response.transitions,
                });
            }

            setState({
                sessionId: response.session_id,
                messages,
                currentNodeId: response.node_id,
                currentNodeName: response.node_name,
                isLoading: false,
                error: null,
                sessionEnded: false,
            });
        } catch (err) {
            setState(s => ({
                ...s,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to start session',
            }));
        }
    }, [tenantId, agentId, version]);

    // Send a message
    const sendMessage = useCallback(async (content: string) => {
        if (!state.sessionId || state.sessionEnded) return;

        // Optimistic update - add user message immediately
        setState(s => ({
            ...s,
            messages: [...s.messages, { role: 'user', content }],
            isLoading: true,
            error: null,
        }));

        try {
            const response = await apiRequest(
                `/api/chat/sessions/${state.sessionId}/messages`,
                'POST',
                { content }
            );

            setState(s => ({
                ...s,
                messages: [
                    ...s.messages,
                    {
                        role: 'assistant',
                        content: response.response,
                        nodeId: response.node_id,
                        nodeName: response.node_name,
                        transitions: response.transitions,
                        extractedVariables: response.extracted_variables,
                        latencyMs: response.latency_ms,
                    },
                ],
                currentNodeId: response.node_id,
                currentNodeName: response.node_name,
                isLoading: false,
                sessionEnded: response.session_ended,
            }));
        } catch (err) {
            setState(s => ({
                ...s,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to send message',
            }));
        }
    }, [state.sessionId, state.sessionEnded]);

    // End the session
    const endSession = useCallback(async () => {
        if (!state.sessionId) return;

        try {
            await apiRequest(`/api/chat/sessions/${state.sessionId}`, 'DELETE');
            setState(s => ({ ...s, sessionEnded: true }));
        } catch (err) {
            // Session may already be ended, ignore errors
        }
    }, [state.sessionId]);

    return {
        ...state,
        startSession,
        sendMessage,
        endSession,
    };
}

// Helper component to display transitions
function TransitionChain({ transitions }: { transitions?: TransitionInfo[] }) {
    if (!transitions || transitions.length === 0) return null;

    return (
        <div className="transition-chain">
            {transitions.map((t, i) => (
                <div key={i} className="transition">
                    <span className="from">{t.from_node_name || t.from_node}</span>
                    <span className="arrow">→</span>
                    <span className="to">{t.to_node_name || t.to_node}</span>
                    <span className="condition">({t.condition})</span>
                </div>
            ))}
        </div>
    );
}

// Example Chat Component with enhanced display
function ChatWidget({ tenantId, agentId }: { tenantId: string; agentId: string }) {
    const {
        sessionId,
        messages,
        currentNodeId,
        currentNodeName,
        isLoading,
        error,
        sessionEnded,
        startSession,
        sendMessage,
        endSession,
    } = useChat(tenantId, agentId);

    const [input, setInput] = useState('');
    const [showDebug, setShowDebug] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage(input.trim());
            setInput('');
        }
    };

    // Auto-start session on mount
    useEffect(() => {
        if (!sessionId) startSession();
    }, [sessionId, startSession]);

    return (
        <div className="chat-widget">
            {/* Header with current node info */}
            <div className="chat-header">
                <span>Chat with Agent</span>
                {currentNodeName && (
                    <span className="node-badge" title={currentNodeId || ''}>
                        📍 {currentNodeName}
                    </span>
                )}
                <button
                    className="debug-toggle"
                    onClick={() => setShowDebug(!showDebug)}
                >
                    {showDebug ? 'Hide Debug' : 'Show Debug'}
                </button>
            </div>

            {/* Messages */}
            <div className="messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <div className="content">{msg.content}</div>

                        {/* Debug info for assistant messages */}
                        {showDebug && msg.role === 'assistant' && (
                            <div className="debug-info">
                                {msg.nodeName && (
                                    <div className="node">
                                        📍 Node: {msg.nodeName} ({msg.nodeId})
                                    </div>
                                )}
                                {msg.latencyMs && (
                                    <div className="latency">⏱️ {msg.latencyMs}ms</div>
                                )}
                                {msg.extractedVariables && Object.keys(msg.extractedVariables).length > 0 && (
                                    <div className="variables">
                                        📝 Extracted: {JSON.stringify(msg.extractedVariables)}
                                    </div>
                                )}
                                <TransitionChain transitions={msg.transitions} />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && <div className="typing-indicator">Agent is typing...</div>}
            </div>

            {/* Error */}
            {error && <div className="error">{error}</div>}

            {/* Input */}
            {!sessionEnded ? (
                <form onSubmit={handleSubmit}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()}>
                        Send
                    </button>
                </form>
            ) : (
                <div className="session-ended">
                    Session ended.
                    <button onClick={() => window.location.reload()}>Start New</button>
                </div>
            )}
        </div>
    );
}
```

### Best Practices

1. **Session Management**
   - Store `session_id` in component state (not localStorage for security)
   - Handle session timeout gracefully (re-create on 410 errors)
   - Call `DELETE` endpoint when user closes chat

2. **Error Handling**
   - Retry transient errors (5xx) with exponential backoff
   - Show user-friendly messages for client errors (4xx)
   - Handle signature errors (clock skew) by syncing time

3. **UX Considerations**
   - Show typing indicator while waiting for response
   - Optimistically add user messages to UI immediately
   - Disable input during loading to prevent double-sends
   - Auto-scroll to latest message

4. **Using Enhanced Response Data**
   - Display `node_name` in header/status bar for context
   - Use `transitions` array to show workflow progress
   - Highlight `extracted_variables` to confirm data capture
   - Show `latency_ms` for performance monitoring
   - Use `previous_node_id` vs `node_id` to detect transitions

5. **Security**
   - Never expose `API_SECRET` in client-side code for production
   - Use a backend proxy that adds authentication
   - Implement rate limiting

### Production Architecture

For production, add a backend proxy to handle authentication:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Browser UI    │ ──────> │   Your Backend  │ ──────> │  Orchestrator   │
│  (no secrets)   │         │ (adds HMAC sig) │         │   Text Chat API │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## CLI Testing Tool

A command-line tool is provided for testing with enhanced visual output:

```bash
# Interactive chat (uses active version)
uv run python scripts/chat_cli.py --tenant <tenant_id> --agent <agent_id>

# Test specific agent version
uv run python scripts/chat_cli.py --tenant <tenant_id> --agent <agent_id> --version 2

# Custom server URL
uv run python scripts/chat_cli.py -t <tenant_id> -a <agent_id> --url http://custom:8000
```

**Enhanced CLI Features:**
- Clear visual distinction between user and agent messages
- Node names and IDs displayed after each response
- Full transition chains shown with conditions
- Extracted variables highlighted
- Response latency displayed

**Commands during chat:**
- `/status` - Show session status (node name, turns, transitions)
- `/vars` - Show collected variables
- `/history` - Show conversation history
- `/end` - End session and exit
- `/quit` - Exit without ending (session will timeout)
- `/help` - Show commands

**Example CLI Session:**

```
============================================================
  Text Chat CLI - Interactive Agent Testing
============================================================
  Server: http://localhost:8000
  Tenant: 6bc1814c-5705-5b6e-af99-104b91962282
  Agent:  a1b2c3d4-e5f6-4890-abcd-ef1234567890
============================================================

  Creating session...
  ✓ Session ID: text_abc123def456
  ✓ Agent Config Version: 1 (active)
  ✓ Starting node: Static Greeting
  Startup transitions:
    ➡️  Static Greeting → Dynamic Greeting (always)
    ➡️  Dynamic Greeting → Wait for User Info (always)
  ✓ Current node: Wait for User Info

  ┌─ Agent ───────────────────────────────────────────────────
  │ Thank you for calling MRI Eligibility Support.
  │ This call may be recorded for quality and training purposes.
  │ Hi, I'm Nancy from MRI Support. Could you please tell me
  │ your first name and zip code?
  └─────────────────────────────────────────────────────────────

  You: My name is Jack and my zip code is 30301

  ┌─ Agent ───────────────────────────────────────────────────
  │ Thank you, Jack! I'm here to help you with any questions
  │ about MRI eligibility. What would you like to know?
  └─────────────────────────────────────────────────────────────
  📍 Node: MRI Q&A Conversation (mri_qa_conversation) | ⏱️ 523ms
    ➡️  Wait for User Info → Extract User Info (user_responded)
    ➡️  Extract User Info → Personalized Greeting (variables_extracted:first_name,zip_code)
    ➡️  Personalized Greeting → MRI Q&A Conversation (always)
    📝 Extracted: first_name=Jack, zip_code=30301
```

---

## Background Session Management

The text chat handler uses **APScheduler** for reliable background session cleanup instead of raw asyncio loops.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Application                               │
├─────────────────────────────────────────────────────────────────────┤
│  startup_event()                                                     │
│    └── text_chat_handler.start()                                    │
│          └── APScheduler.add_job(cleanup, interval=5min)            │
│                                                                      │
│  Every 5 minutes:                                                    │
│    └── cleanup_stale_sessions(timeout=30min)                        │
│          └── Find sessions where (now - updated_at) > 30min         │
│          └── Mark as "abandoned" in PostgreSQL                      │
│          └── Remove from in-memory dict                             │
│                                                                      │
│  shutdown_event()                                                    │
│    └── text_chat_handler.stop()                                     │
│          └── APScheduler.shutdown()                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SESSION_TIMEOUT_SECONDS` | 1800 (30 min) | Idle time before session is abandoned |
| `CLEANUP_INTERVAL_MINUTES` | 5 | How often cleanup job runs |
| `max_history_size` | 100 | Max messages kept in memory per session |

### Why APScheduler?

| Approach | Pros | Cons |
|----------|------|------|
| **Raw `while` loop** | Simple | No job management, manual lifecycle |
| **APScheduler** ✅ | Cron support, job persistence option, clean API | Extra dependency |
| **Celery/ARQ** | Distributed, status tracking | Requires Redis, overkill |

APScheduler provides the right balance: industry-standard scheduling without external infrastructure requirements.

### Session States

```
┌─────────┐  create_session()  ┌─────────┐
│ (none)  │ ─────────────────> │ active  │
└─────────┘                    └────┬────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
        end_session()        idle > 30min          workflow ends
              │                     │                     │
              ▼                     ▼                     ▼
        ┌───────────┐        ┌───────────┐        ┌───────────┐
        │ completed │        │ abandoned │        │ completed │
        └───────────┘        └───────────┘        └───────────┘
```

---

## Database Schema

Text conversations are stored in PostgreSQL with monthly partitioning:

| Table | Description |
|-------|-------------|
| `text_conversations` | Main conversation records |
| `text_conversation_messages` | Individual messages (partitioned) |
| `text_conversation_transitions` | Workflow transitions (partitioned) |
| `text_conversation_variables` | Extracted variables |

### Querying Conversations

```sql
-- Get conversation with messages
SELECT
    c.session_id,
    c.status,
    c.total_turns,
    c.collected_data,
    m.role,
    m.content,
    m.created_at
FROM text_conversations c
JOIN text_conversation_messages m ON m.conversation_id = c.id
WHERE c.session_id = 'text_abc123'
ORDER BY m.sequence;

-- Analytics: Messages per day
SELECT
    DATE(created_at) as date,
    COUNT(*) as messages
FROM text_conversation_messages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

---

## Comparison: Voice vs Text Mode

| Feature | Voice Mode | Text Mode |
|---------|------------|-----------|
| **Protocol** | WebSocket | REST API |
| **Input** | Audio (STT) | Text |
| **Output** | Audio (TTS) | Text |
| **Latency** | ~500-800ms (incl. STT/TTS) | ~100-300ms (LLM only) |
| **Pipeline** | Pipecat + Deepgram + ElevenLabs | Direct OpenAI SDK |
| **Workflow** | Same configs | Same configs |
| **Transitions** | Same logic | Same logic |
| **Variable Extraction** | Same logic | Same logic |
| **Response Data** | Logged only | Full transition chains in response |
| **Node Names** | In logs | In API response |
| **Database** | `calls` table | `text_conversations` table |
| **Use Case** | Phone calls | Chat UI, Testing, Bots |

### Response Data Advantage

The Text Chat API returns detailed workflow information with every response, making it ideal for:

- **Debugging workflows** - See exactly which nodes were visited and why
- **UI development** - Display progress through multi-step flows
- **Testing** - Verify workflow logic without checking server logs
- **Analytics** - Track transition patterns client-side

---

## Security Considerations

### Authentication Model

The Text Chat API uses **HMAC-SHA256 authentication**, designed for **server-to-server** communication where:
- Your backend creates sessions on behalf of users
- Your backend stores the `session_id` securely
- Only your backend (with the HMAC key) can access the API

### Session Security

| Aspect | Implementation | Notes |
|--------|---------------|-------|
| **Session ID** | 128-bit cryptographic random | `secrets.token_urlsafe(16)` - practically unguessable |
| **Tenant Isolation** | By session_id only | Sessions not scoped to tenant_id in API calls |
| **Replay Prevention** | Timestamp validation | Signatures expire after 5 minutes |

**Design Decision**: Sessions are accessed by `session_id` alone (not `tenant_id + session_id`). This simplifies the API since:
1. Session IDs have 128-bit entropy (unguessable)
2. HMAC key holders are already trusted backends
3. Your backend should map users to sessions internally

If you need stricter tenant isolation, implement session-to-tenant mapping in your backend.

### Rate Limiting

The API does **not** include built-in rate limiting. For production:

```nginx
# nginx rate limiting example
limit_req_zone $binary_remote_addr zone=chat_api:10m rate=10r/s;

location /api/chat/ {
    limit_req zone=chat_api burst=20 nodelay;
    proxy_pass http://orchestrator:8000;
}
```

Or use API gateway rate limiting (Kong, AWS API Gateway, etc.).

### Recommended Security Checklist

- [ ] Store `ADMIN_API_KEY` securely (not in client-side code)
- [ ] Use HTTPS in production
- [ ] Implement rate limiting at infrastructure level
- [ ] Map session_ids to user IDs in your backend
- [ ] Set appropriate session timeouts (default: 30 min)

---

## Troubleshooting

### Common Errors

**401 Unauthorized**
- Check `ADMIN_API_KEY` matches server
- Verify timestamp is within 5 minutes of server time
- Ensure signature is generated with the request body

**404 Not Found**
- Verify tenant and agent UUIDs exist in database
- Run `uv run python scripts/seed_database.py` to seed data

**410 Gone (Session Not Active)**
- Session has ended or timed out
- Create a new session

**500 Internal Server Error**
- Check server logs for details
- Verify database connectivity
- Ensure agent has valid workflow configuration

### Debug Logging

Enable debug logging in `.env`:
```
LOG_LEVEL=DEBUG
```

Look for these log patterns:
- `📱 Text session created` - Session creation with node info
- `📥 User message` - Incoming messages with turn number
- `➡️ TRANSITION` - Workflow transitions (from → to)
- `🤖 Generated LLM response` - AI response completion
- `Pattern match` - Condition evaluation results
- `Intent classification` - Intent routing decisions
- `📝 Variable substitution` - Template variable replacement
- `🔍 Batch Extracting` - Variable extraction in progress
- `✅ Batch extraction completed` - Variables successfully extracted
- `🏁 Session ended` - Session completion with final node
