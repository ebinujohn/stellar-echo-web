# Workflow System Reference

Complete reference for the node-based workflow system enabling multi-stage conversations with dynamic branching, state management, and conditional logic.

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow Configuration](#workflow-configuration)
3. [Nodes](#nodes)
4. [Transitions](#transitions)
5. [Transition Conditions](#transition-conditions)
6. [Actions](#actions)
7. [Data Collection](#data-collection)
8. [RAG Configuration](#rag-configuration)
9. [History Management](#history-management)
10. [Complete Examples](#complete-examples)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The workflow system enables complex multi-stage conversations where:
- Each **node** represents a distinct conversation phase with its own prompt
- **Transitions** move between nodes based on conditions (time, turns, user intent)
- **Actions** execute code on node entry/exit (logging, webhooks, hangups)
- **Data collection** captures structured information throughout the conversation
- **Per-node RAG** allows selective knowledge base access

### When to Use Workflows

**Use workflows for:**
- Multi-stage conversations (5+ distinct phases)
- Different behaviors per stage (greeting → education → survey → closing)
- Complex branching logic based on user responses
- Data collection throughout conversation
- Per-stage RAG configuration

**Use single prompt for:**
- Simple Q&A or chitchat
- No distinct conversation stages
- Single purpose interactions
- Simpler maintenance requirements

---

## Workflow Configuration

### Top-Level Structure

```json
{
  "workflow": {
    "initial_node": "greeting",
    "history_window": 0,
    "max_transitions": 50,
    "nodes": [
      {
        "id": "node_1"
      }
    ]
  }
}
```

Comments:
- `initial_node`: Starting node ID (required)
- `history_window`: Message preservation (0 = all, N = last N)
- `max_transitions`: Safety limit to prevent infinite loops

### Global Prompt (Database Column)

> **Important:** The `global_prompt` is stored in the **database column** (`agent_config_versions.global_prompt`), NOT in the JSON configuration.

The `global_prompt` is prepended to **every** node's `system_prompt`. Use it for:
- Agent identity and name
- Universal safety guardrails
- Compliance requirements
- Common formatting instructions

**When seeding from JSON files:** Include `global_prompt` in the workflow section. The seed script extracts it and stores it in the database column separately.

**Example content:**
```
You are Dr. Smith, a medical education assistant.

IMPORTANT RULES:
- Provide education only, NOT medical advice
- Always recommend consulting a healthcare provider
- Use clear, jargon-free language
- If unsure, admit it and suggest consulting a doctor
```

### History Window

Controls conversation history preservation during transitions:

```json
{
  "history_window": 0
}
```

Options:
- `0`: Keep ALL messages (default)
- `20`: Keep last 20 messages (10 exchanges)
- `40`: Keep last 40 messages (20 exchanges)

**Benefits:**
- Prevents token limit issues in long conversations
- Maintains relevant context without overwhelming the model
- Configurable per agent

**Note:** User/assistant pairs count as 2 messages, so `history_window: 20` = 10 conversation exchanges.

### Max Transitions

Safety limit to prevent infinite loops:

```json
{
  "max_transitions": 50
}
```

Options:
- `50`: Default
- `100`: For very complex workflows

When exceeded, workflow forces transition to first available end node.

---

## Nodes

### Node Structure

```json
{
  "nodes": [
    {
      "id": "unique_node_id",
      "name": "Human Readable Name",
      "type": "standard",
      "system_prompt": "...",
      "transitions": [],
      "rag": {},
      "data_collection": [],
      "actions": {}
    }
  ]
}
```

Field descriptions:
- `id`: Unique identifier (required)
- `name`: Display name (required)
- `type`: Node type: "standard" or "end"
- `system_prompt`: Node-specific prompt (required)
- `transitions`: Transition conditions
- `rag`: Per-node RAG override
- `data_collection`: Data to collect
- `actions`: Entry/exit actions

### Node Types

#### Standard Node
```json
{
  "id": "conversation",
  "type": "standard",
  "system_prompt": "Have a helpful conversation.",
  "transitions": [
    {
      "condition": "max_turns:10",
      "target": "closing"
    }
  ]
}
```

Default node type for normal conversation stages. Must have at least one transition. (Note: `type` can be omitted as "standard" is the default)

#### End Node
```json
{
  "id": "closing",
  "type": "end_call",
  "system_prompt": "Say goodbye warmly and end the call."
}
```

Note: No transitions allowed on end nodes. Auto-hangup: Call disconnects 3 seconds after reaching this node.

Terminal node that marks workflow completion. Should not have transitions.

#### API Call Node
```json
{
  "id": "fetch_patient_data",
  "type": "api_call",
  "name": "Fetch Patient Data",
  "static_text": "Please hold while I retrieve your information...",
  "api_call": {
    "method": "GET",
    "url": "https://api.example.com/patients/{{patient_id}}",
    "headers": {
      "Authorization": "Bearer {{api_token}}",
      "Content-Type": "application/json"
    },
    "query_params": {
      "include": "medications,allergies"
    },
    "timeout_seconds": 30,
    "retry": {
      "max_retries": 2,
      "initial_delay_ms": 500,
      "backoff_multiplier": 2.0
    },
    "response_extraction": [
      {
        "path": "data.patient.first_name",
        "variable_name": "patient_first_name",
        "default_value": "Patient"
      },
      {
        "path": "data.patient.medications",
        "variable_name": "patient_medications"
      }
    ]
  },
  "transitions": [
    { "condition": "api_success", "target": "show_info", "priority": 0 },
    { "condition": "api_failed", "target": "api_error", "priority": 1 }
  ]
}
```

Executes HTTP API calls during conversation flow, extracts response data into variables, and transitions based on API result. Similar to Retell AI's custom functions.

**How it works:**

1. **Loading message** (optional): If `static_text` is provided, it's delivered first (e.g., "Please hold...")
2. **Variable substitution**: `{{variable}}` placeholders in URL, headers, query params, and body are replaced with collected values
3. **HTTP execution**: Request is made with configurable timeout and exponential backoff retry
4. **Response extraction**: JSON paths extract values into workflow variables
5. **Auto-transition**: Transitions evaluate based on `api_success`, `api_failed`, etc.

**API Call Configuration Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `method` | string | `"GET"` | HTTP method: GET, POST, PUT, PATCH, DELETE |
| `url` | string | required | URL with optional `{{variable}}` placeholders |
| `headers` | object | `{}` | Request headers (supports variable substitution) |
| `query_params` | object | `{}` | URL query parameters |
| `body` | object | `null` | Request body for POST/PUT/PATCH (JSON) |
| `timeout_seconds` | int | `30` | Request timeout (max 120s) |
| `retry` | object | see below | Retry configuration |
| `response_extraction` | array | `[]` | List of values to extract from response |
| `response_size_limit_bytes` | int | `15000` | Max response body size |
| `allowed_hosts` | array | `null` | Optional host allowlist for security |

**Retry Configuration:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_retries` | int | `2` | Maximum retry attempts |
| `initial_delay_ms` | int | `500` | Initial delay before first retry |
| `max_delay_ms` | int | `5000` | Maximum delay between retries |
| `backoff_multiplier` | float | `2.0` | Exponential backoff multiplier |

**Response Extraction:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Dot notation JSON path (e.g., `data.user.name`, `items.0.id`) |
| `variable_name` | string | Yes | Variable name to store extracted value |
| `default_value` | string | No | Fallback value if path not found or null |

**POST Request Example:**

```json
{
  "id": "create_appointment",
  "type": "api_call",
  "name": "Create Appointment",
  "api_call": {
    "method": "POST",
    "url": "https://api.example.com/appointments",
    "headers": {
      "Authorization": "Bearer {{api_token}}",
      "Content-Type": "application/json"
    },
    "body": {
      "patient_id": "{{patient_id}}",
      "date": "{{selected_date}}",
      "provider_id": "{{provider_id}}"
    },
    "response_extraction": [
      { "path": "data.confirmation_code", "variable_name": "confirmation_code" }
    ]
  },
  "transitions": [
    { "condition": "api_success", "target": "confirm", "priority": 0 },
    { "condition": "api_status:409", "target": "slot_taken", "priority": 1 },
    { "condition": "api_failed", "target": "error", "priority": 2 }
  ]
}
```

**Security Considerations:**

- **Host Allowlist**: Use `allowed_hosts` to restrict URLs to approved domains
- **Timeout Limits**: Max 120 seconds to prevent resource exhaustion
- **Response Size**: Max 50KB to prevent memory issues
- **Sensitive Data**: Headers with "auth" or "key" in name are masked in logs

**Auto-Hangup Behavior:**
When an end node is reached, the system automatically:
1. Generates and delivers the closing message using the node's `system_prompt`
2. Waits 3 seconds for the TTS to complete and audio to be delivered
3. Automatically hangs up the call via Twilio REST API

**Requirements:**
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` must be configured in `.env`
- Without these credentials, end nodes will log a warning but won't disconnect

**Best Practices:**
- Keep end node prompts brief (under 30 words) for clean call endings
- Design prompts to clearly signal conversation completion
- Test timing with your TTS voice to ensure 3 seconds is sufficient

### System Prompt

Each node has its own system prompt that defines behavior for that stage:

```json
{
  "system_prompt": "You are helping the user select a topic.\n\nAsk which topic they'd like to learn about:\n- GLP-1 medications\n- Colonoscopy screening\n\nListen carefully and route them to the right information."
}
```

**Final prompt = `global_prompt + "\n\n" + system_prompt`**

### Static Text (Zero-Latency Messages)

For pre-defined messages that don't require LLM generation, use `static_text` instead of `system_prompt`:

```json
{
  "id": "disclaimer",
  "type": "standard",
  "name": "Fast Disclaimer",
  "proactive": true,
  "static_text": "Thank you for calling. This call may be recorded for quality purposes.",
  "transitions": [
    {
      "condition": "always",
      "target": "greeting"
    }
  ]
}
```

Note: Omit `system_prompt` when using `static_text` (it defaults to empty). Use `proactive: true` + `always` for auto-advance after delivery.

**Key Benefits:**
- **Zero LLM latency** (~200ms vs ~1500ms typical)
- **Predictable output** for compliance, legal disclaimers, confirmations
- **Variable substitution** supported (e.g., `{{first_name}}`)
- **Cost savings** (no LLM API call)

**Variable Substitution Example:**
```json
{
  "id": "confirmation",
  "proactive": true,
  "static_text": "Perfect, {{first_name}}! I'm ready to help you with {{topic}}.",
  "transitions": [
    {
      "condition": "always",
      "target": "main_conversation"
    }
  ]
}
```

Note: Omit `system_prompt` - it defaults to empty when using `static_text`.

**Important Rules:**
- Nodes must have **either** `static_text` **OR** `system_prompt`, not both
- When using `static_text`, **omit** the `system_prompt` field (it defaults to empty)
- `static_text` must be non-empty
- Works with all transition types, actions, and history tracking
- Supports `{{variable_name}}` placeholders (replaced with extracted values)

**Use Cases:**
- Fast greetings/disclaimers at call start
- Legal/compliance messages (TCPA, recording notices)
- Confirmations after data collection
- Fixed transfer messages
- Any message where exact wording is required

---

## Transitions

Transitions define when and how to move from one node to another.

### Transition Structure

```json
{
  "transitions": [
    {
      "condition": "timeout:10s",
      "target": "next_node",
      "priority": 1
    }
  ]
}
```

Field descriptions:
- `condition`: When to transition (required)
- `target`: Target node ID (required)
- `priority`: Evaluation order - lower number = higher priority, evaluated first (optional, default: 0)

### Evaluation Order

Transitions are evaluated **by priority** (lower number = higher priority), then by array order for equal priorities.

**Default Behavior (No Priority Set):**
All transitions default to `priority: 0`, so they are evaluated in array order (first match wins):

```json
{
  "transitions": [
    {
      "condition": "contains:goodbye",
      "target": "closing"
    },
    {
      "condition": "max_turns:5",
      "target": "timeout_handler"
    },
    {
      "condition": "user_responded",
      "target": "continue"
    }
  ]
}
```

Evaluation order: First → Second → Third (all priority 0, so array order is used)

**Explicit Priority (Recommended for Complex Workflows):**
Use `priority` to control evaluation order explicitly (lower number = higher priority, like "1st priority", "2nd priority"):

```json
{
  "transitions": [
    {
      "condition": "max_turns:10",
      "target": "timeout",
      "priority": 1
    },
    {
      "condition": "contains:done",
      "target": "closing",
      "priority": 2
    },
    {
      "condition": "user_responded",
      "target": "continue",
      "priority": 3
    }
  ]
}
```

Evaluation order:
1. `max_turns:10` (priority 1) - First priority, checked first
2. `contains:done` (priority 2) - Second priority
3. `user_responded` (priority 3) - Third priority, fallback

**Priority Rules:**
- Lower numbers = higher priority (evaluated first)
- Think "1st priority", "2nd priority", "3rd priority"
- Default priority = 0
- Transitions with same priority maintain array order (stable sort)
- First matching transition wins (others are skipped)

**Same Priority Handling:**

When multiple transitions have the same priority, they are evaluated in their **array order**:

```json
{
  "transitions": [
    {
      "condition": "contains:goodbye",
      "target": "closing",
      "priority": 1
    },
    {
      "condition": "contains:bye",
      "target": "closing",
      "priority": 1
    },
    {
      "condition": "contains:exit",
      "target": "closing",
      "priority": 1
    },
    {
      "condition": "max_turns:10",
      "target": "timeout",
      "priority": 2
    }
  ]
}
```

**Evaluation order:**
1. `contains:goodbye` (priority 1, first in array)
2. `contains:bye` (priority 1, second in array)
3. `contains:exit` (priority 1, third in array)
4. `max_turns:10` (priority 2)

This is useful when you want multiple conditions at the same priority level to be checked in a specific sequence.

**Best Practices:**
- Use priority for critical transitions (safety checks, timeouts)
- Reserve priority 1-3 for must-check-first conditions
- Use priority 4-10 for normal branching logic
- Use priority 11+ for fallback behaviors
- Omit priority for simple linear flows (array order is clearer)

---

## Transition Conditions

Conditions determine when transitions trigger. Two types: **pattern-based** (fast, deterministic) and **intent-based** (LLM batch classification).

### Pattern-Based Conditions (Deterministic)

Fast evaluation (~0ms) using regex and logic:

#### `timeout:Xs`
Triggers after X seconds in current node.

```json
{
  "condition": "timeout:10s",
  "target": "next_node"
}
```

Or with optional 's':
```json
{
  "condition": "timeout:30",
  "target": "timeout_handler"
}
```

**Use case:** Move forward after silence or inactivity.

#### `max_turns:N`
Triggers after N user inputs in current node.

```json
{
  "condition": "max_turns:5",
  "target": "next_stage"
}
```

Or for single turn:
```json
{
  "condition": "max_turns:1",
  "target": "acknowledged"
}
```

**Use case:** Limit conversation length per stage, force progression.

#### `contains:keyword`
Triggers if user input contains keyword (case-insensitive).

```json
{
  "condition": "contains:goodbye",
  "target": "closing"
}
```

Other examples:
```json
{
  "condition": "contains:help",
  "target": "support"
}
```
```json
{
  "condition": "contains:glp",
  "target": "glp1_education"
}
```

**Use case:** Simple keyword-based routing.

#### `user_responded`
Triggers after any user input (non-empty).

```json
{
  "condition": "user_responded",
  "target": "next_node"
}
```

**Use case:** Simple acknowledgment transitions.

#### `survey_complete`
Triggers when required survey data is collected.

```json
{
  "condition": "survey_complete",
  "target": "closing"
}
```

**Use case:** Multi-question surveys with data collection.

**Note:** Currently checks for `survey_q1` and `survey_q2` in collected data. Customize in `transition_evaluator.py`.

### Variable Conditions (For Data-Driven Routing)

Conditions for routing based on collected variables (from `retrieve_variable` nodes or API responses):

#### `variables_extracted:var1,var2`
Triggers when ALL specified variables are present and non-null in collected data.

```json
{
  "condition": "variables_extracted:first_name,last_name",
  "target": "verify_name"
}
```

**Use case:** Proceed after successful variable extraction.

#### `extraction_failed:var1,var2`
Triggers when ANY specified variable is missing or null in collected data.

```json
{
  "condition": "extraction_failed:first_name",
  "target": "ask_name_again"
}
```

**Use case:** Handle failed extraction with retry or fallback.

#### `variable_equals:var_name=value`
Triggers when a collected variable equals a specific value (case-insensitive string comparison).

```json
{
  "condition": "variable_equals:call_intent_in_days=5",
  "target": "five_day_flow"
}
```

```json
{
  "condition": "variable_equals:is_verified=true",
  "target": "verified_path"
}
```

**Use case:** Deterministic branching based on variable values — zero-latency alternative to LLM-based routing for known values. Works with values from `retrieve_variable` extraction or `api_call` response extraction.

**Complete Variable Routing Example:**

```json
{
  "transitions": [
    { "condition": "variable_equals:plan_type=premium", "target": "premium_flow", "priority": 1 },
    { "condition": "variable_equals:plan_type=basic", "target": "basic_flow", "priority": 2 },
    { "condition": "always", "target": "default_flow", "priority": 10 }
  ]
}
```

### API Call Conditions (For api_call Nodes)

Conditions specific to `api_call` node types, evaluated after API execution:

#### `api_success`
Triggers when API returned 2xx status code.

```json
{
  "condition": "api_success",
  "target": "process_data"
}
```

**Use case:** Continue workflow when API call succeeds.

#### `api_failed`
Triggers when API returned non-2xx, timed out, or encountered an error.

```json
{
  "condition": "api_failed",
  "target": "error_handler"
}
```

**Use case:** Handle API failures gracefully.

#### `api_status:CODE`
Triggers when API returned a specific HTTP status code.

```json
{
  "condition": "api_status:404",
  "target": "not_found_handler"
}
```

```json
{
  "condition": "api_status:409",
  "target": "conflict_handler"
}
```

**Use case:** Handle specific HTTP status codes differently (e.g., 404 for not found, 409 for conflict).

#### `api_response_contains:VALUE`
Triggers when API response body contains specific text (case-insensitive).

```json
{
  "condition": "api_response_contains:error",
  "target": "error_handler"
}
```

```json
{
  "condition": "api_response_contains:success",
  "target": "success_handler"
}
```

**Use case:** Route based on response content when status codes alone aren't sufficient.

**Complete API Call Transition Example:**

```json
{
  "transitions": [
    { "condition": "api_success", "target": "process_results", "priority": 0 },
    { "condition": "api_status:404", "target": "patient_not_found", "priority": 1 },
    { "condition": "api_status:401", "target": "auth_error", "priority": 1 },
    { "condition": "api_status:429", "target": "rate_limited", "priority": 1 },
    { "condition": "api_failed", "target": "general_error", "priority": 2 }
  ]
}
```

**Note:** Evaluation order matters. More specific conditions (like `api_status:404`) should have higher priority (lower number) than general conditions (like `api_failed`).

### Intent-Based Conditions (LLM Batch Classification)

For content-based routing where you need to classify user responses into predefined categories, use **intent-based transitions**. Intent classification uses a single LLM call to classify against all defined intents (~100-150ms total), with configurable descriptions, examples, and confidence thresholds.

#### Node Configuration with Intents

Define intents on the node:

```json
{
  "id": "topic_selection",
  "name": "Topic Selection",
  "type": "standard",
  "system_prompt": "Ask the user what aspect they'd like to explore.",
  "intents": {
    "wants_basics": {
      "description": "User wants to learn fundamentals or get started",
      "examples": ["tell me the basics", "I'm new to this", "introduction"]
    },
    "wants_practical": {
      "description": "User wants practical tips or how-to guides",
      "examples": ["practical tips", "how do I apply this", "real world examples"]
    },
    "wants_advanced": {
      "description": "User wants deep dive or expert level content",
      "examples": ["advanced topics", "deep dive", "complex stuff"]
    }
  },
  "intent_config": {
    "confidence_threshold": 0.7,
    "context_scope": "node",
    "context_messages": 6
  },
  "transitions": [
    {"condition": "intent:wants_basics", "target": "basics_node", "priority": 1},
    {"condition": "intent:wants_practical", "target": "practical_node", "priority": 1},
    {"condition": "intent:wants_advanced", "target": "advanced_node", "priority": 1},
    {"condition": "intent:no_match", "target": "clarify", "priority": 2},
    {"condition": "max_turns:3", "target": "fallback", "priority": 10}
  ]
}
```

#### Intent Definition Structure

Each intent requires:
- **description** (required): Clear description of what this intent represents
- **examples** (optional): Example user messages that should trigger this intent

```json
"intents": {
  "intent_id": {
    "description": "What this intent represents",
    "examples": ["example phrase 1", "example phrase 2"]
  }
}
```

#### Intent Config Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `confidence_threshold` | float | 0.7 | Minimum confidence (0.0-1.0) to match an intent |
| `context_scope` | string | "node" | `"node"` = only messages since entering node, `"conversation"` = entire call history |
| `context_messages` | int | 6 | Maximum messages to include in classification context |

**Context Scope Explained:**
- **`"node"`** (default): Uses only messages since entering the current node. Best for decision points where prior context could confuse the classification.
- **`"conversation"`**: Uses the entire conversation history. Best when classification needs broader context.

#### Special `no_match` Intent

Use `intent:no_match` to handle cases where no intent matched with sufficient confidence:

```json
{
  "condition": "intent:no_match",
  "target": "clarify_intent",
  "priority": 2
}
```

This triggers when:
- LLM couldn't match any defined intent
- Matched intent's confidence is below the threshold

#### How It Works

1. **User responds** in a node with intent transitions
2. **Single LLM call** classifies the input against ALL defined intents
3. **Returns**: matched intent ID + confidence score (0.0-1.0)
4. **Cache**: Result is cached for this input (avoids re-classification)
5. **Threshold check**: Only triggers if confidence >= threshold
6. **Transition**: First matching `intent:X` condition fires

**Performance:**
- Single LLM call regardless of intent count (~100-150ms)
- Results cached per user input per node
- Structured JSON output with confidence scores

#### Complete Example

```json
{
  "id": "support_routing",
  "name": "Support Routing",
  "type": "standard",
  "system_prompt": "What can I help you with today? I can assist with billing, technical issues, or account management.",
  "intents": {
    "billing_inquiry": {
      "description": "User has questions about billing, payments, invoices, or charges",
      "examples": ["billing question", "about my invoice", "payment issue", "why was I charged"]
    },
    "technical_support": {
      "description": "User needs help with technical problems, bugs, or how to use features",
      "examples": ["not working", "bug report", "how do I", "technical problem"]
    },
    "account_management": {
      "description": "User wants to manage their account, settings, or profile",
      "examples": ["change my password", "update profile", "account settings", "cancel subscription"]
    }
  },
  "intent_config": {
    "confidence_threshold": 0.6,
    "context_scope": "conversation",
    "context_messages": 8
  },
  "transitions": [
    {"condition": "intent:billing_inquiry", "target": "billing_support", "priority": 1},
    {"condition": "intent:technical_support", "target": "tech_support", "priority": 1},
    {"condition": "intent:account_management", "target": "account_help", "priority": 1},
    {"condition": "intent:no_match", "target": "general_help", "priority": 2}
  ]
}
```

### Custom Conditions

Add custom pattern matchers in `app/core/transition_evaluator.py`:

```python
def _evaluate_custom_condition(
    self, condition: str, context: dict[str, Any]
) -> tuple[bool | None, str]:
    """Evaluate custom:my_condition."""
    if condition != "custom:my_condition":
        return None, ""

    # Your logic here
    result = check_something(context)
    return result, "Reason for transition"
```

Register in `__init__`:
```python
self.pattern_matchers["custom"] = self._evaluate_custom_condition
```

---

## Actions

Actions execute code on node entry or exit.

### Action Structure

```json
{
  "actions": {
    "on_entry": [
      "log:Node started",
      "webhook:https://api.example.com/start"
    ],
    "on_exit": [
      "webhook:https://api.example.com/complete",
      "log:Node completed"
    ]
  }
}
```

Comments:
- `on_entry`: Executed when entering node
- `on_exit`: Executed when leaving node

### Action Types

#### Log Action
Logs a message to console.

```json
{
  "actions": {
    "on_entry": [
      "log:Survey phase started",
      "log:User entered support node"
    ],
    "on_exit": [
      "log:Education completed"
    ]
  }
}
```

**Format:** `log:message`

**Use case:** Debugging, audit trails, session tracking.

#### Webhook Action
POSTs data to external API.

```json
{
  "actions": {
    "on_exit": [
      "webhook:https://api.example.com/survey",
      "webhook:https://analytics.company.com/track"
    ]
  }
}
```

**Format:** `webhook:url`

**Payload:**
```json
{
  "action_type": "on_exit",
  "node_id": "survey",
  "timestamp": 1234567890.123,
  "session_id": "session_123",
  "collected_data": {
    "survey_q1": "5",
    "survey_q2": "yes"
  }
}
```

**Use case:** Send survey results, analytics, CRM updates.

#### Hangup Action
Terminates the call.

```json
{
  "id": "closing",
  "type": "end_call",
  "actions": {
    "on_entry": [
      "hangup"
    ]
  }
}
```

**Format:** `hangup`

**Requirements:**
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`
- Twilio credentials configured

**Use case:** Programmatic call termination, automatic goodbye.

#### Custom Action
Executes custom Python function.

```json
{
  "actions": {
    "on_entry": [
      "custom:send_sms",
      "custom:update_database"
    ]
  }
}
```

**Format:** `custom:function_name`

**Implementation:** Register in `ActionExecutor`:
```python
custom_actions = {
    "send_sms": my_sms_function,
    "update_database": my_db_function,
}

action_executor = ActionExecutor(
    twilio_hangup_callback=hangup_fn,
    custom_actions=custom_actions,
)
```

**Use case:** Complex integrations, external system updates.

### Action Execution Order

1. **On Exit** of old node (if leaving a node)
2. State update (transition_count++, reset turn_count)
3. Context switch (LLM prompt update)
4. RAG configuration (enable/disable for new node)
5. **On Entry** of new node

**Example flow:**
```
survey [on_exit: webhook] → closing [on_entry: hangup]
```

---

## Data Collection

Collect structured data from user inputs during conversation.

### Data Collection Structure

```json
{
  "data_collection": [
    {
      "key": "selected_topic",
      "extract": "topic_name",
      "prompt": "Extract topic..."
    }
  ]
}
```

Field descriptions:
- `key`: Storage key in collected_data dict
- `extract`: Extraction strategy
- `prompt`: Optional LLM prompt (for llm_extract)

### Extraction Strategies

#### `full_input`
Stores complete user message.

```json
{
  "data_collection": [
    {
      "key": "survey_q1",
      "extract": "full_input"
    },
    {
      "key": "user_feedback",
      "extract": "full_input"
    }
  ]
}
```

**Use case:** Survey answers, open-ended feedback.

#### `topic_name`
Extracts topic using keyword matching.

```json
{
  "data_collection": [
    {
      "key": "selected_topic",
      "extract": "topic_name"
    }
  ]
}
```

**Supported topics:** `glp1`, `colonoscopy`, `diabetes`

**How it works:** Simple keyword matching against predefined lists.

**Customize:** Edit `_extract_topic()` in `node_manager.py`:
```python
topic_keywords = {
    "glp1": ["glp", "glp-1", "semaglutide", "ozempic", "wegovy"],
    "colonoscopy": ["colonoscopy", "colon", "screening"],
    "mynewtopic": ["keyword1", "keyword2"],
}
```

#### `llm_extract`
Uses LLM to extract structured data with custom prompt.

```json
{
  "data_collection": [
    {
      "key": "appointment_date",
      "extract": "llm_extract",
      "prompt": "Extract the appointment date from the user's message. Return ONLY the date in YYYY-MM-DD format, or 'none' if no date mentioned."
    },
    {
      "key": "phone_number",
      "extract": "llm_extract",
      "prompt": "Extract the phone number from the message. Return ONLY the 10-digit number or 'none'."
    }
  ]
}
```

**Use case:** Complex structured extraction (dates, phone numbers, emails, names).

**Latency:** ~100-300ms per extraction (uses gpt-5-mini).

### Accessing Collected Data

Data is available in:

1. **Transition conditions** (intent classification context)
2. **Action webhooks** (sent as JSON payload)
3. **Custom actions** (passed in context dict)
4. **Session summary** (logged at end)

**Example webhook payload:**
```json
{
  "collected_data": {
    "selected_topic": "glp1",
    "survey_q1": "5",
    "survey_q2": "yes, definitely"
  }
}
```

---

## RAG Configuration

Control knowledge base access per node.

### Global RAG (Agent Default)

Set in agent JSON root:

```json
{
  "rag": {
    "enabled": true,
    "search_mode": "hybrid",
    "top_k": 5,
    "relevance_filter": true
  }
}
```

**Applies to all nodes unless overridden.**

### Per-Node RAG Override

Override RAG settings for specific nodes:

```json
{
  "nodes": [
    {
      "id": "education",
      "system_prompt": "Provide educational information.",
      "rag": {
        "enabled": true,
        "search_mode": "hybrid",
        "top_k": 5
      }
    },
    {
      "id": "survey",
      "system_prompt": "Ask survey questions.",
      "rag": {
        "enabled": false
      }
    },
    {
      "id": "chitchat",
      "system_prompt": "Have casual conversation."
    }
  ]
}
```

Node comments:
- `education`: Enable RAG for this node with hybrid search
- `survey`: Disable RAG for this node
- `chitchat`: No rag key = use agent default (inherited)

### RAG Configuration Options

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `enabled` | bool | `true`, `false` | Enable/disable RAG for node |
| `search_mode` | string | `vector`, `fts`, `hybrid` | Search strategy |
| `top_k` | int | 1-20 | Number of chunks to retrieve |

**Search modes:**
- `vector`: Semantic similarity (fastest)
- `fts`: Full-text keyword search
- `hybrid`: RRF fusion of vector + FTS (best accuracy)

### Use Cases

**Enable RAG:**
- Educational content nodes
- Information lookup stages
- Q&A phases

**Disable RAG:**
- Survey/data collection nodes
- Greeting/farewell nodes
- Pure conversation flow nodes
- Faster responses needed

---

## History Management

Control how much conversation context is preserved across transitions.

### Full Preservation (Default)

```json
{
  "workflow": {
    "history_window": 0
  }
}
```

Comment: Keep ALL messages

**Behavior:** Every message from start of conversation is maintained.

**Use when:**
- Short conversations (< 10 minutes)
- Context from beginning is critical
- Plenty of token budget available

### Windowed History

```json
{
  "workflow": {
    "history_window": 30
  }
}
```

Comment: Keep last 30 messages (15 exchanges)

**Behavior:** When transitioning, only last N messages are preserved.

**Use when:**
- Long conversations (> 10 minutes)
- Recent context more important than distant history
- Token limits are a concern
- Cost optimization needed

### Example Impact

**Conversation with 50 messages total:**

```json
{
  "history_window": 0
}
```
Result: All 50 messages carried forward

```json
{
  "history_window": 20
}
```
Result: Only last 20 messages (10 exchanges)

```json
{
  "history_window": 40
}
```
Result: Only last 40 messages (20 exchanges)

**Token savings:**
- GPT-4o: ~750 tokens per message pair
- 30 messages saved = ~22,500 tokens saved per transition
- Can reduce costs by 50-80% in long conversations

---

## Complete Examples

### Example 1: Simple Linear Flow

Basic greeting → conversation → closing flow.

```json
{
  "workflow": {
    "initial_node": "greeting",
    "history_window": 0,
    "max_transitions": 10,
    "nodes": [
      {
        "id": "greeting",
        "name": "Welcome",
        "system_prompt": "Greet the user warmly and ask how you can help.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "conversation"
          }
        ]
      },
      {
        "id": "conversation",
        "name": "Main Chat",
        "system_prompt": "Have a helpful conversation.",
        "transitions": [
          {
            "condition": "contains:goodbye",
            "target": "closing"
          },
          {
            "condition": "max_turns:10",
            "target": "closing"
          }
        ]
      },
      {
        "id": "closing",
        "type": "end_call",
        "name": "Farewell",
        "system_prompt": "Thank the user and say goodbye."
      }
    ]
  }
}
```

### Example 2: Branching Flow with Data Collection

Topic selection with multiple paths.

```json
{
  "workflow": {
    "initial_node": "greeting",
    "history_window": 20,
    "max_transitions": 30,
    "nodes": [
      {
        "id": "greeting",
        "name": "Welcome",
        "system_prompt": "Welcome the user and ask what topic they need help with.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "topic_selection"
          }
        ]
      },
      {
        "id": "topic_selection",
        "name": "Topic Selection",
        "system_prompt": "Listen to what topic they need. Guide them to billing, technical, or returns.",
        "data_collection": [
          {
            "key": "topic",
            "extract": "topic_name"
          }
        ],
        "transitions": [
          {
            "condition": "contains:billing",
            "target": "billing_support"
          },
          {
            "condition": "contains:technical",
            "target": "technical_support"
          },
          {
            "condition": "contains:return",
            "target": "returns_support"
          },
          {
            "condition": "max_turns:3",
            "target": "general_support"
          }
        ]
      },
      {
        "id": "billing_support",
        "name": "Billing Help",
        "system_prompt": "Help with billing questions.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid"
        },
        "transitions": [
          {
            "condition": "contains:thanks",
            "target": "closing"
          },
          {
            "condition": "max_turns:8",
            "target": "closing"
          }
        ]
      },
      {
        "id": "technical_support",
        "name": "Technical Help",
        "system_prompt": "Help with technical issues.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid"
        },
        "transitions": [
          {
            "condition": "contains:thanks",
            "target": "closing"
          },
          {
            "condition": "max_turns:8",
            "target": "closing"
          }
        ]
      },
      {
        "id": "returns_support",
        "name": "Returns Help",
        "system_prompt": "Help with returns and refunds.",
        "transitions": [
          {
            "condition": "contains:thanks",
            "target": "closing"
          },
          {
            "condition": "max_turns:5",
            "target": "closing"
          }
        ]
      },
      {
        "id": "general_support",
        "name": "General Help",
        "system_prompt": "Provide general assistance.",
        "transitions": [
          {
            "condition": "max_turns:5",
            "target": "closing"
          }
        ]
      },
      {
        "id": "closing",
        "type": "end_call",
        "name": "Goodbye",
        "system_prompt": "Thank them and say goodbye.",
        "actions": {
          "on_entry": [
            "log:Support session completed"
          ]
        }
      }
    ]
  }
}
```

### Example 3: Survey with Webhooks

Multi-stage conversation with survey and data submission.

```json
{
  "workflow": {
    "initial_node": "greeting",
    "history_window": 30,
    "max_transitions": 20,
    "nodes": [
      {
        "id": "greeting",
        "name": "Welcome",
        "system_prompt": "Warmly greet the user.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "education"
          }
        ],
        "actions": {
          "on_entry": [
            "log:Session started"
          ]
        }
      },
      {
        "id": "education",
        "name": "Education",
        "system_prompt": "Provide educational information about their health topic.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 5
        },
        "transitions": [
          {
            "condition": "contains:survey",
            "target": "survey"
          },
          {
            "condition": "contains:done",
            "target": "survey"
          },
          {
            "condition": "max_turns:12",
            "target": "survey"
          }
        ]
      },
      {
        "id": "survey",
        "name": "Feedback Survey",
        "system_prompt": "Ask two questions ONE AT A TIME:\n1. \"How satisfied were you with the information? (1-5)\"\n2. \"Would you recommend us?\"",
        "rag": {
          "enabled": false
        },
        "data_collection": [
          {
            "key": "satisfaction",
            "extract": "full_input"
          },
          {
            "key": "recommend",
            "extract": "full_input"
          }
        ],
        "transitions": [
          {
            "condition": "max_turns:3",
            "target": "closing"
          }
        ],
        "actions": {
          "on_exit": [
            "webhook:https://api.mycompany.com/survey",
            "log:Survey submitted"
          ]
        }
      },
      {
        "id": "closing",
        "type": "end_call",
        "name": "Goodbye",
        "system_prompt": "Thank them sincerely and say goodbye.",
        "actions": {
          "on_entry": [
            "log:Session completed"
          ]
        }
      }
    ]
  }
}
```

### Example 4: Timeout Handling

Proactive timeout management.

```json
{
  "workflow": {
    "initial_node": "active",
    "history_window": 20,
    "max_transitions": 10,
    "nodes": [
      {
        "id": "active",
        "name": "Active Conversation",
        "system_prompt": "Have an engaging conversation.",
        "transitions": [
          {
            "condition": "timeout:15s",
            "target": "check_in"
          },
          {
            "condition": "contains:goodbye",
            "target": "closing"
          }
        ]
      },
      {
        "id": "check_in",
        "name": "Check-In",
        "system_prompt": "Ask if they're still there and need help.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "active"
          },
          {
            "condition": "timeout:10s",
            "target": "closing"
          }
        ]
      },
      {
        "id": "closing",
        "type": "end_call",
        "name": "Goodbye",
        "system_prompt": "Say goodbye and thank them.",
        "actions": {
          "on_entry": [
            "hangup"
          ]
        }
      }
    ]
  }
}
```

---

## Best Practices

### Workflow Design

1. **Start simple:** Begin with 3-4 nodes, add complexity gradually
2. **Clear node purposes:** Each node should have ONE clear responsibility
3. **Global prompt for guardrails:** Put safety/compliance rules in `global_prompt`
4. **Always have end nodes:** Every workflow needs at least one `type: "end"` node
5. **Timeout fallbacks:** Include timeout transitions to prevent stuck states

### Transition Design

1. **Order matters:** Most specific conditions first, fallbacks last
2. **Mix pattern + intent:** Use patterns for speed, intents for LLM-powered routing
3. **Test conditions:** Use `LOG_LEVEL=DEBUG` to see evaluation results
4. **Avoid loops:** Be careful with circular transitions
5. **Include escape hatches:** Always provide max_turns fallback

### Prompt Engineering

1. **Node prompts are focused:** Each node prompt should be specific to that stage
2. **Global prompt stays general:** Use for identity, guardrails, universal rules
3. **Keep prompts concise:** 2-5 sentences per node typically sufficient
4. **Test context switching:** Verify LLM understands new context after transition

### Performance Optimization

1. **History windowing:** Use `history_window: 20-40` for conversations > 10 min
2. **Pattern conditions first:** Put timeout/max_turns before intent conditions
3. **Disable RAG when unneeded:** Survey/greeting nodes don't need knowledge lookup
4. **Use intents for complex routing:** Intent classification is fast (~100-150ms for all intents)

### Data Collection

1. **Collect early:** Capture data when context is fresh
2. **Use simple strategies first:** `full_input` and `topic_name` are faster than `llm_extract`
3. **Validate in webhooks:** Don't rely on perfect extraction, validate server-side
4. **Store incrementally:** Don't wait until end to collect critical data

### Action Design

1. **Log liberally:** Actions are cheap, logging helps debugging
2. **Webhooks on exit:** Send data after node completion, not entry
3. **Handle failures gracefully:** Actions shouldn't crash the workflow
4. **Test webhooks separately:** Ensure endpoints work before integrating

### Testing Strategy

1. **Test each node individually:** Verify prompts produce expected behavior
2. **Test transitions:** Confirm conditions trigger correctly
3. **Test full paths:** Walk through complete user journeys
4. **Monitor latency:** Check logs for transition evaluation times
5. **Test edge cases:** Timeouts, max transitions, empty inputs

---

## Troubleshooting

### Workflow Not Loading

**Symptom:** Error on startup or agent load failure.

**Check:**
1. JSON syntax is valid (proper formatting and brackets)
2. `workflow:` section exists in agent JSON
3. `initial_node` exists in nodes list
4. All node IDs are unique
5. All transition targets point to valid nodes

**Debug:**
```bash
LOG_LEVEL=DEBUG uv run uvicorn app.main:app --reload
```

Look for validation error messages listing specific issues.

### Transitions Not Firing

**Symptom:** Stuck in one node, transitions don't trigger.

**Debug steps:**

1. **Enable debug logging:**
```bash
LOG_LEVEL=DEBUG uv run uvicorn app.main:app --reload
```

2. **Check condition syntax:**
```json
{
  "condition": "timeout:10s"
}
```
CORRECT

```json
{
  "condition": "timeout: 10s"
}
```
WRONG - No space after colon

```json
{
  "condition": "timeout:10"
}
```
WRONG - Missing 's' (technically works but inconsistent)

3. **Verify evaluation logs:**
```
Pattern match | condition=max_turns:5 | result=False | reason=Max turns not reached (3 < 5)
```

4. **Test with simple conditions first:**
```json
{
  "transitions": [
    {
      "condition": "user_responded",
      "target": "next"
    }
  ]
}
```
Note: Always triggers after input

5. **Check turn/time counters:**
```
📥 User input | node=education | turn=3 | input=tell me more...
```

### Context Not Switching

**Symptom:** LLM continues with old behavior after transition.

**Check:**

1. **Verify transition completed:**
```
✅ Transitioned | from=greeting → to=education | total_transitions=1
```

2. **Check combined prompt in logs:**
```
🔄 Context switched | node=education | history_messages=10 | prompt_length=250
```

3. **Test with dramatically different prompts:**
```json
{
  "id": "node1",
  "system_prompt": "You are a pirate. Say 'Arrr' a lot."
}
```
```json
{
  "id": "node2",
  "system_prompt": "You are a robot. Say 'Beep boop' a lot."
}
```

4. **Verify global_prompt isn't overriding:**
- Check if `global_prompt` is too prescriptive
- Node prompts should add specificity, not fight global prompt

### RAG Not Working Per-Node

**Symptom:** RAG stays enabled/disabled despite per-node config.

**Check:**

1. **Verify RAG processor exists:**
```
RAG enabled | hybrid | top_k=5
```

2. **Check node RAG config syntax:**
```json
{
  "rag": {
    "enabled": false
  }
}
```
Note: Must be boolean, not string "false"

3. **Look for RAG configuration logs:**
```
🧠 RAG enabled | node=education | mode=hybrid | top_k=5
🧠 RAG disabled | node=survey
```

4. **Test with queries that trigger RAG:**
- Use knowledge-seeking questions in nodes with RAG enabled
- Check for RAG query logs

### Actions Not Executing

**Symptom:** Logs missing, webhooks not called.

**Check:**

1. **Verify action syntax:**
```json
{
  "actions": {
    "on_entry": [
      "log:Message here"
    ]
  }
}
```
CORRECT

```json
{
  "actions": {
    "on_exit": [
      "log:Message"
    ]
  }
}
```
Note: In JSON all strings must be quoted, but ensure the value contains the full action string

2. **Check action executor logs:**
```
⚡ Executing actions | type=on_entry | node=survey | count=2
  Action result: Logged: Survey started
```

3. **Webhook-specific:**
```json
"webhook:https://api.example.com/endpoint"
```
Note: Must be valid URL

Check network logs for HTTP errors:
```
📡 Webhook | on_exit | node=survey | url=https://...
Webhook failed: Connection timeout
```

4. **Hangup-specific:**
- Requires `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`
- Check for: `Hangup callback not configured`

### Data Collection Not Working

**Symptom:** `collected_data` is empty or missing keys.

**Check:**

1. **Verify data collection config:**
```json
{
  "data_collection": [
    {
      "key": "topic",
      "extract": "topic_name"
    }
  ]
}
```
Note: Must have 'key' and 'extract' fields

2. **Check for collection logs:**
```
💾 Data collected | key=survey_q1 | value=5
```

3. **Test extraction strategies:**
- `full_input`: Should always work if user provides input
- `topic_name`: Requires matching keywords
- `llm_extract`: Check for LLM errors in logs

4. **Verify data in session summary:**
```
🔄 Workflow Summary | ... | collected_data=3 items
```

### Performance Issues

**Symptom:** Slow transitions, high latency.

**Optimization steps:**

1. **Use pattern conditions when possible:**
```json
{
  "condition": "max_turns:5"
}
```
FAST (~0ms)

```json
{
  "condition": "user_ready_to_continue"
}
```
SLOW (~200ms)

2. **Reduce history window:**
```json
{
  "history_window": 20
}
```
Instead of 0 (all)

3. **Disable RAG on non-educational nodes:**
```json
{
  "rag": {
    "enabled": false
  }
}
```
For greeting, survey, closing

4. **Use pattern conditions when possible:**
```json
{
  "transitions": [
    {
      "condition": "contains:done",
      "target": "closing"
    },
    {
      "condition": "max_turns:10",
      "target": "closing"
    }
  ]
}
```
Good: Pattern conditions only (~0ms)

```json
{
  "intents": {
    "wants_billing": {"description": "User has billing questions"},
    "wants_technical": {"description": "User needs technical help"},
    "wants_account": {"description": "User wants account help"}
  },
  "transitions": [
    {"condition": "intent:wants_billing", "target": "billing"},
    {"condition": "intent:wants_technical", "target": "tech"},
    {"condition": "intent:wants_account", "target": "account"},
    {"condition": "intent:no_match", "target": "general"}
  ]
}
```
Good: Intent classification (single LLM call ~100-150ms for all intents)

5. **Monitor evaluation times:**
```
Intent classification | 145ms | intent=wants_billing | confidence=0.85
```

### Workflow Summary Not Logging

**Symptom:** No summary at end of call.

**Check:**

1. **Pipeline completion:** Summary logs in `finally` block, should always run
2. **Check for exception before summary:**
```
Pipeline error: ...
🔄 Workflow Summary | ...  # Should still appear
```

3. **Verify NodeManager exists:**
```python
if node_manager:
    summary = node_manager.get_session_summary()
```

### Common Error Messages

#### "Initial node not found"
```
Initial node 'greting' not found in nodes
```
**Fix:** Check spelling of `initial_node` matches a node `id`.

#### "Transition to unknown node"
```
Node 'education' transition to unknown node 'survay'
```
**Fix:** Check spelling of `target` in transitions.

#### "End node should not have transitions"
```
End node 'closing' should not have transitions
```
**Fix:** Remove `transitions:` from end nodes.

#### "Max transitions exceeded"
```
Max transitions exceeded (50), forcing end
```
**Fix:** Check for circular transitions or increase `max_transitions`.

---

## Architecture Reference

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Pipeline Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Deepgram STT                                                │
│       ↓                                                       │
│  TranscriptionHandler (metrics)                              │
│       ↓                                                       │
│  NodeManager ←→ TransitionEvaluator                          │
│       ↓              ↓                                        │
│       ↓         (evaluates conditions)                       │
│       ↓                                                       │
│  [switches context, configures RAG, executes actions]        │
│       ↓                                                       │
│  RAGProcessor (optional, per-node)                           │
│       ↓                                                       │
│  OpenAI LLM                                                  │
│       ↓                                                       │
│  ElevenLabs TTS                                              │
│       ↓                                                       │
│  Twilio Output                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Supporting Components:
- ActionExecutor: Runs log/webhook/hangup/custom actions
- RAGKnowledgeBase: FAISS + SQLite + Bedrock embeddings
- LatencyTracker: Metrics collection
```

### File Reference

| File | Purpose | Lines |
|------|---------|-------|
| `workflow_config.py` | Data models (nodes, transitions, actions) | 198 |
| `node_manager.py` | Core workflow orchestrator | 436 |
| `transition_evaluator.py` | Condition evaluation (pattern + LLM) | 252 |
| `action_executor.py` | Action execution engine | 198 |
| `agent_config.py` | JSON loading + validation | 433 |
| `websocket_handler.py` | Pipeline integration | 509 |

### State Management

```python
@dataclass
class NodeState:
    current_node_id: str              # Current node
    node_start_time: float            # When entered current node
    turn_count: int                   # Turns in current node
    transition_count: int             # Total transitions
    collected_data: dict              # Data collected so far
    conversation_history: list        # Full conversation
    transition_history: list          # Transition log
```

### Transition Evaluation Flow

```
User Input Received
     ↓
NodeManager._handle_user_input()
     ↓
Update state (turn_count++, add to history)
     ↓
Collect data (if configured)
     ↓
Loop through transitions (first match wins):
     ↓
For each transition:
     ↓
TransitionEvaluator.evaluate()
     ├─→ Pattern matchers (timeout, max_turns, contains, etc.)
     └─→ LLM intent classification (if intent: condition)
     ↓
If match found:
     ↓
NodeManager._transition_to_node()
     ↓
Execute old node on_exit actions
     ↓
Update state (transition_count++, reset turn_count)
     ↓
Switch LLM context (with history windowing)
     ↓
Configure RAG for new node
     ↓
Execute new node on_entry actions
     ↓
Done (LLM generates response with new context)
```

---

## API Reference

### WorkflowConfig

```python
@dataclass
class WorkflowConfig:
    initial_node: str
    nodes: list[NodeConfig]
    global_prompt: str = ""
    history_window: int = 0
    max_transitions: int = 50

    def get_node(node_id: str) -> NodeConfig | None
    def get_combined_prompt(node_id: str) -> str
    def validate() -> list[str]
```

### NodeConfig

```python
@dataclass
class NodeConfig:
    id: str
    name: str
    system_prompt: str
    type: Literal["standard", "end"] = "standard"
    transitions: list[TransitionConfig] = []
    rag: NodeRAGConfig | None = None
    data_collection: list[DataCollectionConfig] = []
    actions: dict[str, list[ActionConfig]] = {}
```

### TransitionConfig

```python
@dataclass
class TransitionConfig:
    condition: str        # Condition to evaluate (required)
    target: str          # Target node ID (required)
    priority: int = 0    # Evaluation priority - lower number = checked first (optional)
```

### ActionConfig

```python
@dataclass
class ActionConfig:
    type: Literal["log", "webhook", "hangup", "custom"]
    params: dict[str, str] = {}
```

### DataCollectionConfig

```python
@dataclass
class DataCollectionConfig:
    key: str
    extract: str
    prompt: str | None = None
```

### NodeRAGConfig

```python
@dataclass
class NodeRAGConfig:
    enabled: bool = True
    search_mode: Literal["vector", "fts", "hybrid"] = "hybrid"
    top_k: int = 5
```

---

## Migration Guide

### From Single Prompt to Workflow

**Before (single prompt):**
```json
{
  "agent": {
    "id": "my_agent",
    "name": "My Agent"
  },
  "llm": {
    "model": "gpt-5-mini",
    "system_prompt": "You are a helpful assistant.\nFirst greet the user.\nThen help them with their question.\nFinally say goodbye."
  }
}
```

**After (workflow):**
```json
{
  "agent": {
    "id": "my_agent",
    "name": "My Agent"
  },
  "workflow": {
    "initial_node": "greeting",
    "nodes": [
      {
        "id": "greeting",
        "system_prompt": "Greet the user warmly.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "help"
          }
        ]
      },
      {
        "id": "help",
        "system_prompt": "Help with their question.",
        "transitions": [
          {
            "condition": "contains:goodbye",
            "target": "closing"
          },
          {
            "condition": "max_turns:10",
            "target": "closing"
          }
        ]
      },
      {
        "id": "closing",
        "type": "end_call",
        "system_prompt": "Say goodbye."
      }
    ]
  },
  "llm": {
    "model": "gpt-5-mini"
  }
}
```

Note: No system_prompt in llm - defined in nodes instead

**Key changes:**
1. Move system_prompt → workflow nodes
2. Extract common rules → global_prompt
3. Add explicit transitions between stages
4. Mark terminal node with `type: "end"`

---

## Version History

- **v1.1.0** (2025-11-22): Semantic conditions removed
  - Removed semantic condition evaluation (e.g., `user_satisfied`)
  - Use intent-based transitions instead for LLM-powered routing
  - Intent classification: single LLM call, descriptions, examples, confidence scores

- **v1.0.0** (2025-01-XX): Initial workflow system
  - Node-based conversation flows
  - Hybrid pattern + intent-based transitions
  - Per-node RAG configuration
  - Action system (log, webhook, hangup, custom)
  - Data collection framework
  - History windowing
  - Comprehensive validation

---

## Support

- **Documentation:** `/docs/WORKFLOW_REFERENCE.md` (this file)
- **Examples:** `/scripts/seed_data/tenant_*/agent_*.json`
- **Source Code:** `/app/core/workflow_config.py`, `node_manager.py`, `transition_evaluator.py`, `action_executor.py`
- **Logging:** Set `LOG_LEVEL=DEBUG` for detailed workflow execution logs
