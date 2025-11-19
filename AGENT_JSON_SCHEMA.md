# Agent JSON Configuration Schema

**Complete reference for agent configuration JSON format.**

This document provides a comprehensive specification of the JSON schema used for agent configurations, including all fields, data types, required/optional parameters, and examples.

---

## Table of Contents

1. [Overview](#overview)
2. [Top-Level Structure](#top-level-structure)
3. [Agent Section](#agent-section)
4. [Workflow Section](#workflow-section)
   - [Interruption Settings](#interruption-settings)
   - [Recording Configuration](#recording-configuration)
   - [Per-Node Interruption Control](#per-node-interruption-control)
   - [History Window Details](#history-window-details)
   - [Max Transitions Limit](#max-transitions-limit)
5. [Node Types](#node-types)
   - [Standard Node](#standard-node)
   - [Retrieve Variable Node](#retrieve-variable-node)
   - [End Call Node](#end-call-node)
6. [Variable Substitution](#variable-substitution)
7. [Transition Conditions](#transition-conditions)
8. [Actions](#actions)
9. [LLM Configuration](#llm-configuration)
   - [Environment Variable Fallbacks](#environment-variable-fallbacks)
   - [Service Tier](#service-tier)
   - [Temperature and Randomness](#temperature-and-randomness)
10. [TTS Configuration](#tts-configuration)
11. [STT Configuration](#stt-configuration)
12. [RAG Configuration](#rag-configuration)
    - [Per-Node RAG Override](#per-node-rag-override)
13. [Auto-Hangup Configuration](#auto-hangup-configuration)
14. [Logging Configuration](#logging-configuration)
15. [Complete Examples](#complete-examples)
16. [Validation Rules](#validation-rules)

---

## Overview

Agent configurations are stored as JSON files with the naming convention:
- **Multi-tenant**: `agents/tenant_{tenant_id}/agent_{agent_id}.json`
- **Legacy**: `agents/agent_{agent_id}.json`

All agents **must** use node-based workflows. Traditional single-prompt mode has been removed.

---

## Top-Level Structure

```json
{
  "agent": { ... },
  "workflow": { ... },
  "llm": { ... },
  "tts": { ... },
  "stt": { ... },
  "rag": { ... },
  "auto_hangup": { ... },
  "logging": { ... }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent` | object | ✅ Yes | Agent metadata (ID, name, description) |
| `workflow` | object | ✅ Yes | Workflow configuration with nodes and transitions |
| `llm` | object | ❌ No | LLM configuration (defaults to environment settings) |
| `tts` | object | ❌ No | Text-to-Speech configuration |
| `stt` | object | ❌ No | Speech-to-Text configuration |
| `rag` | object | ❌ No | RAG (knowledge base) configuration |
| `auto_hangup` | object | ❌ No | Auto-hangup configuration |
| `logging` | object | ❌ No | Logging level configuration |

---

## Agent Section

Metadata describing the agent.

### Schema

```json
{
  "agent": {
    "id": "string",
    "name": "string",
    "description": "string",
    "version": "string",
    "tenant_id": "string"
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | ✅ Yes | - | Unique agent identifier (alphanumeric, underscores, hyphens) |
| `name` | string | ✅ Yes | - | Human-readable agent name |
| `description` | string | ❌ No | `""` | Agent description |
| `version` | string | ❌ No | `"1.0.0"` | Agent version (semantic versioning) |
| `tenant_id` | string | ❌ No | `""` | Tenant ID (auto-populated from directory structure) |

### Example

```json
{
  "agent": {
    "id": "medical_assistant",
    "name": "Medical Education Assistant",
    "description": "Provides GLP-1 education and answers common questions",
    "version": "2.1.0"
  }
}
```

---

## Workflow Section

Complete workflow configuration with nodes, transitions, and settings.

### Schema

```json
{
  "workflow": {
    "initial_node": "string",
    "global_prompt": "string",
    "history_window": 0,
    "max_transitions": 50,
    "interruption_settings": { ... },
    "recording": { ... },
    "nodes": [ ... ]
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `initial_node` | string | ✅ Yes | - | ID of starting node |
| `nodes` | array | ✅ Yes | - | Array of node configurations |
| `global_prompt` | string | ❌ No | `""` | Prepended to all node prompts |
| `history_window` | integer | ❌ No | `0` | Message preservation (0 = all, N = last N messages) |
| `max_transitions` | integer | ❌ No | `50` | Maximum node transitions (prevents infinite loops) |
| `interruption_settings` | object | ❌ No | See below | Global interruption handling configuration |
| `recording` | object | ❌ No | See below | Call recording configuration |

### Interruption Settings

```json
{
  "interruption_settings": {
    "enabled": true,
    "delay_ms": 300,
    "resume_prompt": "Go ahead"
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Enable/disable interruption handling globally |
| `delay_ms` | integer | ❌ No | `300` | Milliseconds before interruption triggers |
| `resume_prompt` | string | ❌ No | `"Go ahead"` | What bot says when resuming after interruption |

### Recording Configuration

```json
{
  "recording": {
    "enabled": false,
    "track": "both",
    "channels": "dual"
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `false` | Enable/disable call recording |
| `track` | string | ❌ No | `"both"` | Track to record: `"inbound"`, `"outbound"`, `"both"` |
| `channels` | string | ❌ No | `"dual"` | Channel mode: `"mono"` (mixed), `"dual"` (separate) |

**Note**: Requires Twilio external S3 storage configuration. See `docs/RECORDING_CONFIG.md` for setup.

### Per-Node Interruption Control

Each node can override the global interruption setting:

```json
{
  "workflow": {
    "interruption_settings": {
      "enabled": true,      // Global default
      "delay_ms": 300
    },
    "nodes": [
      {
        "id": "greeting",
        "interruptions_enabled": false,  // Cannot interrupt greeting
        "system_prompt": "Greet the user..."
      },
      {
        "id": "conversation",
        "interruptions_enabled": true,   // Can interrupt conversation
        "system_prompt": "Have a conversation..."
      },
      {
        "id": "disclaimer",
        // No override - uses global setting
        "system_prompt": "This is important..."
      }
    ]
  }
}
```

**Behavior:**
- `interruptions_enabled: true` - User can interrupt and stop TTS
- `interruptions_enabled: false` - Bot completes speech uninterrupted
- `interruptions_enabled: null` (or omitted) - Uses global setting
- When user interrupts: TTS cancelled, bot stops speaking immediately
- Resume prompt not configurable per-node (uses global `resume_prompt`)

**Common Patterns:**
- Set `false` for disclaimers and legal notices
- Set `false` for critical instructions
- Set `true` for conversational nodes
- Use global `interruption_settings.enabled: false` for call center mode (no interruptions allowed)

### History Window Details

Controls how much conversation history is preserved when switching nodes:

```json
{
  "workflow": {
    "history_window": 10
  }
}
```

**Behavior:**
- `0` (default): All conversation history preserved
- `N` > 0: Only last N messages included in LLM context
- Applied when switching nodes (helps prevent context overflow)
- Does NOT affect call history storage (all messages stored in database)
- Useful for long conversations to keep LLM focused on recent context

**Example:**
```json
{
  "history_window": 20
}
```

When node transitions occur:
1. Old node's full history sent to new node
2. If `history_window` set, trimmed to last N messages
3. New node's system prompt added to context
4. Extracted variables added as context annotations

### Max Transitions Limit

Prevents infinite loops by limiting node transitions:

```json
{
  "workflow": {
    "max_transitions": 50
  }
}
```

**Behavior:**
- Default: 50 transitions max
- Each transition to a new node increments counter
- When exceeded: Forces transition to `end_call` node
- If no `end_call` node exists: Sends `EndFrame` with error
- Counter resets per call (not per node)

**Example Runaway Loop:**
```
Greeting → Main → Main → Main (transition via feedback loop)
```

If transitions exceed 50, call forces end.

**When to Adjust:**
- **Increase** (100+): Complex workflows with many steps
- **Decrease** (10): Simple workflows, detect runaway loops quickly
- Keep sensible limit to catch infinite loop bugs

---

## Node Types

Nodes represent distinct conversation phases. Three node types are supported:

1. **`standard`** - Regular conversation node with LLM
2. **`retrieve_variable`** - Extract structured data from conversation
3. **`end_call`** - Terminate call

### Standard Node

Regular conversation node with system prompt and LLM processing.

#### Schema

```json
{
  "id": "string",
  "type": "standard",
  "name": "string",
  "system_prompt": "string",
  "static_text": "string",
  "interruptions_enabled": true,
  "transitions": [ ... ],
  "rag": { ... },
  "actions": { ... }
}
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | ✅ Yes | - | Unique node identifier |
| `type` | string | ❌ No | `"standard"` | Node type (must be `"standard"`) |
| `name` | string | ✅ Yes | - | Human-readable node name |
| `system_prompt` | string | ⚠️ Conditional | `""` | LLM system prompt (required if no `static_text`) |
| `static_text` | string | ⚠️ Conditional | `null` | Static text bypass (required if no `system_prompt`) |
| `interruptions_enabled` | boolean | ❌ No | `null` | Override global interruption setting |
| `transitions` | array | ❌ No | `[]` | Transition conditions to other nodes |
| `rag` | object | ❌ No | `null` | Per-node RAG configuration override |
| `actions` | object | ❌ No | `{}` | Actions to execute on entry/exit |

**Important**: Node must have **either** `system_prompt` OR `static_text`, but not both.

#### Static Text vs System Prompt

**Static Text** (zero latency):
- Bypasses LLM completely
- Text sent directly to TTS
- Perfect for disclaimers, fixed greetings
- Use with `skip_response` transition for instant progression

**System Prompt** (LLM processing):
- Dynamic response generation
- Context-aware conversation
- Variable substitution supported (`{{variable_name}}`)

#### Example: Standard Node with System Prompt

```json
{
  "id": "greeting",
  "type": "standard",
  "name": "Welcome Greeting",
  "interruptions_enabled": false,
  "system_prompt": "Greet the user warmly. Introduce yourself as Ivan.\nAsk for their name and what topic they're interested in.",
  "transitions": [
    {
      "condition": "contains:goodbye",
      "target": "closing"
    },
    {
      "condition": "skip_response",
      "target": "collect_info"
    }
  ],
  "actions": {
    "on_entry": [
      "log:Greeting node started"
    ]
  }
}
```

#### Example: Static Text Node

```json
{
  "id": "fast_disclaimer",
  "type": "standard",
  "name": "Fast Disclaimer",
  "interruptions_enabled": false,
  "static_text": "Thank you for calling. This call may be recorded for quality purposes.",
  "transitions": [
    {
      "condition": "skip_response",
      "target": "greeting"
    }
  ]
}
```

### Retrieve Variable Node

Extracts structured data from conversation using LLM.

#### Schema

```json
{
  "id": "string",
  "type": "retrieve_variable",
  "name": "string",
  "variables": [
    {
      "variable_name": "string",
      "extraction_prompt": "string",
      "default_value": "string or null"
    }
  ],
  "variable_name": "string",
  "extraction_prompt": "string",
  "default_value": "string or null",
  "transitions": [ ... ],
  "actions": { ... }
}
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | ✅ Yes | - | Unique node identifier |
| `type` | string | ✅ Yes | - | Must be `"retrieve_variable"` |
| `name` | string | ✅ Yes | - | Human-readable node name |
| `variables` | array | ⚠️ Conditional | `[]` | Array of variables to extract (batch mode) |
| `variable_name` | string | ⚠️ Conditional | `null` | Single variable name (legacy mode) |
| `extraction_prompt` | string | ⚠️ Conditional | `null` | Single extraction prompt (legacy mode) |
| `default_value` | string/null | ❌ No | `null` | Default if extraction fails (legacy mode) |
| `transitions` | array | ❌ No | `[]` | Transition conditions |
| `actions` | object | ❌ No | `{}` | Actions to execute |

**Important**: Use **either**:
- **Batch mode**: `variables` array (recommended) for extracting multiple variables
- **Legacy mode**: `variable_name` + `extraction_prompt` (single variable only)

#### Automatic Transition Evaluation

After variable extraction completes, transitions are **automatically evaluated** in order (does not wait for user input):

```json
{
  "id": "extract_user_info",
  "type": "retrieve_variable",
  "name": "Extract User Information",
  "variables": [...],
  "transitions": [
    {
      "condition": "variables_extracted:first_name,last_name,topic",
      "target": "personalized_greeting"
    },
    {
      "condition": "extraction_failed:first_name,last_name,topic",
      "target": "greeting_retry"
    }
  ]
}
```

**Important Behavior:**
- Transitions evaluated **immediately after extraction** (not waiting for user input)
- Use `variables_extracted:var1,var2` to check successful extraction
- Use `extraction_failed:var1,var2` to handle missing variables
- If extraction fails, variables use `default_value` (if specified) or `null`
- LLM will generate initial message for extraction node, but **won't respond to user** until transition occurs

#### Variable Extraction Config

For batch mode (`variables` array):

```json
{
  "variable_name": "string",
  "extraction_prompt": "string",
  "default_value": "string or null"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `variable_name` | string | ✅ Yes | - | Variable identifier |
| `extraction_prompt` | string | ✅ Yes | - | LLM prompt for extraction |
| `default_value` | string/null | ❌ No | `null` | Fallback value if extraction fails |

#### Special Transition Conditions

- `variables_extracted:var1,var2,var3` - True if all variables successfully extracted
- `extraction_failed:var1,var2,var3` - True if any variable missing or null

#### Example: Batch Variable Extraction

```json
{
  "id": "extract_user_info",
  "type": "retrieve_variable",
  "name": "Extract User Information",
  "variables": [
    {
      "variable_name": "first_name",
      "extraction_prompt": "Extract the user's first name from the conversation.",
      "default_value": null
    },
    {
      "variable_name": "last_name",
      "extraction_prompt": "Extract the user's last name from the conversation.",
      "default_value": null
    },
    {
      "variable_name": "topic",
      "extraction_prompt": "Extract the topic of interest that the user mentioned.",
      "default_value": null
    }
  ],
  "transitions": [
    {
      "condition": "variables_extracted:first_name,last_name,topic",
      "target": "personalized_greeting"
    },
    {
      "condition": "extraction_failed:first_name,last_name,topic",
      "target": "greeting"
    }
  ],
  "actions": {
    "on_entry": [
      "log:Extracting user information",
      "log:Extracted - Name: {{first_name}} {{last_name}}, Topic: {{topic}}"
    ]
  }
}
```

#### Example: Legacy Single Variable Extraction

```json
{
  "id": "get_name",
  "type": "retrieve_variable",
  "name": "Get User Name",
  "variable_name": "user_name",
  "extraction_prompt": "Extract the user's full name from the conversation.",
  "default_value": "Guest",
  "transitions": [
    {
      "condition": "always",
      "target": "next_node"
    }
  ]
}
```

#### Variable Usage

Extracted variables can be used in subsequent node prompts using `{{variable_name}}` syntax:

```json
{
  "system_prompt": "Hello {{first_name}} {{last_name}}! You're interested in {{topic}}."
}
```

See [Variable Substitution](#variable-substitution) section for complete details.

---

## Variable Substitution

Extracted variables can be substituted into system prompts, static text, and actions using `{{variable_name}}` syntax.

### In System Prompts

```json
{
  "nodes": [
    {
      "id": "extract_name",
      "type": "retrieve_variable",
      "variables": [
        {
          "variable_name": "first_name",
          "extraction_prompt": "Extract the user's first name."
        }
      ],
      "transitions": [
        {
          "condition": "always",
          "target": "personalized"
        }
      ]
    },
    {
      "id": "personalized",
      "system_prompt": "Hello {{first_name}}! How can I help you today?"
    }
  ]
}
```

### In Static Text

```json
{
  "id": "welcome",
  "static_text": "Welcome back, {{user_name}}! Let's continue where we left off."
}
```

### In Actions

```json
{
  "actions": {
    "on_entry": [
      "log:User {{first_name}} {{last_name}} entered node",
      "webhook:https://api.example.com/track?name={{first_name}}"
    ]
  }
}
```

### Substitution Rules

- Variables must be extracted in earlier nodes (via `retrieve_variable` nodes)
- `{{variable_name}}` replaced with extracted value at runtime
- If variable not found, replaced with empty string `""`
- Use `default_value` in `retrieve_variable` to provide fallback
- Substitution happens when node becomes active
- Works in: `system_prompt`, `static_text`, action values

### Default Values

```json
{
  "type": "retrieve_variable",
  "variables": [
    {
      "variable_name": "department",
      "extraction_prompt": "What department is the user asking about?",
      "default_value": "General"
    }
  ]
}
```

**When extraction fails:**
- Variable stored with `default_value` ("General" in this case)
- If no `default_value`, variable is `null`
- Later prompts receive the default value in substitution
- Empty string used if variable is `null` and referenced

### Example Workflow with Variables

```json
{
  "workflow": {
    "initial_node": "greeting",
    "nodes": [
      {
        "id": "greeting",
        "system_prompt": "Ask for the user's name and favorite color.",
        "transitions": [
          { "condition": "user_responded", "target": "extract" }
        ]
      },
      {
        "id": "extract",
        "type": "retrieve_variable",
        "variables": [
          {
            "variable_name": "name",
            "extraction_prompt": "Extract user's name",
            "default_value": "friend"
          },
          {
            "variable_name": "color",
            "extraction_prompt": "Extract favorite color",
            "default_value": "blue"
          }
        ],
        "transitions": [
          { "condition": "always", "target": "personalized" }
        ]
      },
      {
        "id": "personalized",
        "system_prompt": "Great, {{name}}! {{color}} is a wonderful color. Let me tell you more about it.",
        "actions": {
          "on_entry": [
            "log:Personalized greeting for {{name}} who likes {{color}}"
          ]
        },
        "transitions": [
          { "condition": "contains:bye", "target": "end" }
        ]
      },
      {
        "id": "end",
        "type": "end_call",
        "name": "End Call"
      }
    ]
  }
}
```

---

### End Call Node

Terminates the call immediately. No further transitions possible.

#### Schema

```json
{
  "id": "string",
  "type": "end_call",
  "name": "string"
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique node identifier |
| `type` | string | ✅ Yes | Must be exactly `"end_call"` |
| `name` | string | ✅ Yes | Human-readable name |

**Not Supported:**
- `system_prompt` - No LLM processing
- `static_text` - No speech
- `transitions` - Call already ending
- `actions` - Not executed
- `rag` - No knowledge base access

#### Workflow Requirements

Every workflow **must** have at least one `end_call` node. Validation will fail without it.

#### Auto-Hangup Behavior

**If `auto_hangup.enabled: true` (default):**
- Call terminates immediately via Twilio
- Call recorded until hangup completes
- Database updated with call end time
- Post-call analysis triggered (if enabled)

**If `auto_hangup.enabled: false`:**
- Call stored in database but remains connected
- Custom application logic must handle termination
- Useful for call transfers or custom hangup flows

#### Example

```json
{
  "id": "end_call",
  "type": "end_call",
  "name": "Terminate Call"
}
```

#### Exit with Error

If `max_transitions` exceeded with no `end_call` node configured:
- Application will search for any `end_call` node
- If none found, sends `EndFrame` with error reason
- Call terminates with error state

---

## Transition Conditions

Transitions move between nodes based on conditions. Conditions are evaluated in priority order (highest to lowest).

### Transition Schema

```json
{
  "condition": "string",
  "target": "string",
  "priority": 0
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `condition` | string | ✅ Yes | - | Condition to evaluate |
| `target` | string | ✅ Yes | - | Target node ID |
| `priority` | integer | ❌ No | `0` | Evaluation priority (higher = first) |

### Condition Types

#### 1. Pattern-Based Conditions (Deterministic)

| Condition | Syntax | Description | Example |
|-----------|--------|-------------|---------|
| **Timeout** | `timeout:Xs` | Elapsed time in node | `timeout:10s` (10 seconds) |
| **Max Turns** | `max_turns:N` | Turn count in node | `max_turns:5` (5 exchanges) |
| **Contains** | `contains:keyword` | Case-insensitive keyword match | `contains:goodbye` |
| **User Responded** | `user_responded` | User has spoken at least once | `user_responded` |
| **Skip Response** | `skip_response` | Auto-advance after bot speaks | `skip_response` |
| **Always** | `always` | Immediate transition | `always` |
| **Variables Extracted** | `variables_extracted:var1,var2` | All variables present and non-null | `variables_extracted:name,email` |
| **Extraction Failed** | `extraction_failed:var1,var2` | Any variable missing or null | `extraction_failed:name,email` |

#### 2. Semantic Conditions (LLM-Based)

Custom conditions evaluated by LLM based on conversation context:

- `user_satisfied`
- `topic_is:glp1`
- `user_wants_help`
- `ready_to_close`
- Any custom natural language condition

**Note**: Requires `EXTRACTION_LLM_API_KEY` or `OPENAI_API_KEY` in `.env`.

### Examples

#### Timeout Transition

```json
{
  "condition": "timeout:30s",
  "target": "timeout_node",
  "priority": 10
}
```

#### Contains Keyword

```json
{
  "condition": "contains:help",
  "target": "help_node",
  "priority": 5
}
```

#### Skip Response (Auto-Advance)

⚠️ **Important**: `skip_response` is **event-based**, not user-input-based. It fires when the bot finishes speaking, not on user input.

```json
{
  "condition": "skip_response",
  "target": "next_node",
  "priority": 0
}
```

**Timing Details:**
1. Bot finishes speaking (TTS completes)
2. 300ms technical delay to confirm no more audio chunks
3. Automatically transition to target node
4. User input during this time is **blocked** and added to history for next node

**Use Cases:**
- Static text disclaimers that auto-advance
- Fixed greeting messages
- Automated confirmations

**Technical Constraints:**
- Only one `skip_response` transition per node supported
- Cancelled if user input triggers different transition
- Cancelled if manually transitioning to different node

#### Variable Extraction Success

```json
{
  "condition": "variables_extracted:first_name,last_name",
  "target": "personalized_node",
  "priority": 5
}
```

#### Semantic Condition

```json
{
  "condition": "user_satisfied",
  "target": "closing",
  "priority": 3
}
```

### Transition Priority and Evaluation Order

⚠️ **Important**: The `priority` field is accepted in the JSON schema for future use but is **currently NOT implemented**. Transitions are evaluated in the order they appear in the JSON array, not by priority value.

**Current Behavior** (v0.0.93):
- Transitions evaluated **sequentially** from first to last in the array
- **First matching condition triggers immediately**
- `priority` field accepted but ignored in evaluation
- Array order determines evaluation sequence

**Future Implementation**:
- Will sort transitions by priority (highest first) before evaluation
- Higher priority = evaluated first

**Current Workaround**: Place high-priority conditions **first** in the transitions array:

```json
{
  "transitions": [
    {
      "condition": "contains:emergency",
      "target": "emergency_node",
      "priority": 100
    },
    {
      "condition": "contains:goodbye",
      "target": "closing",
      "priority": 50
    },
    {
      "condition": "max_turns:10",
      "target": "closing",
      "priority": 10
    },
    {
      "condition": "skip_response",
      "target": "next_node",
      "priority": 0
    }
  ]
}
```

In this example, `contains:emergency` is checked first (array position 0), even though priority sorting is not implemented yet.

---

## Actions

Actions execute code on node entry or exit.

### Actions Schema

```json
{
  "actions": {
    "on_entry": ["action_type:value", ...],
    "on_exit": ["action_type:value", ...]
  }
}
```

### Action Types

| Type | Syntax | Description |
|------|--------|-------------|
| **Log** | `log:message` | Log message (supports variable substitution) |
| **Webhook** | `webhook:url` | HTTP POST to URL |
| **Hangup** | `hangup:` | Terminate call immediately |
| **Custom** | `custom:identifier` | Custom action handler |

### Variable Substitution

Actions support variable substitution with `{{variable_name}}`:

```json
{
  "actions": {
    "on_entry": [
      "log:User {{first_name}} {{last_name}} entered node",
      "webhook:https://api.example.com/track?name={{first_name}}"
    ]
  }
}
```

### Examples

#### Logging

```json
{
  "actions": {
    "on_entry": [
      "log:Greeting node started",
      "log:User name: {{user_name}}"
    ],
    "on_exit": [
      "log:Leaving greeting node"
    ]
  }
}
```

#### Webhook

```json
{
  "actions": {
    "on_entry": [
      "webhook:https://api.example.com/events"
    ]
  }
}
```

#### Hangup

```json
{
  "actions": {
    "on_entry": [
      "hangup:"
    ]
  }
}
```

**Note**: Prefer `end_call` node type over `hangup:` action.

---

## LLM Configuration

Configure the Large Language Model for conversation generation.

### Schema

```json
{
  "llm": {
    "enabled": true,
    "model": "gpt-4.1",
    "service_tier": "auto",
    "temperature": 0.8,
    "max_tokens": 150,
    "base_url": "",
    "api_version": ""
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Enable/disable LLM |
| `model` | string | ❌ No | `"gpt-5-mini-2025-08-07"` | Model name or deployment name (Azure) |
| `service_tier` | string | ❌ No | `"auto"` | Service tier (`"auto"`, `"default"`) |
| `temperature` | float | ❌ No | `1.0` | Sampling temperature (0.0-2.0) |
| `max_tokens` | integer | ❌ No | `150` | Maximum completion tokens |
| `base_url` | string | ❌ No | `""` | Custom API endpoint (Azure) |
| `api_version` | string | ❌ No | `""` | API version (Azure) |

### Environment Variable Fallbacks

If not specified in JSON, values fall back to environment variables:
- `LLM_MODEL` → `model`
- `OPENAI_BASE_URL` → `base_url`
- `OPENAI_API_VERSION` → `api_version`

### Examples

#### OpenAI

```json
{
  "llm": {
    "model": "gpt-4.1",
    "temperature": 0.8,
    "max_tokens": 150
  }
}
```

#### Azure OpenAI

```json
{
  "llm": {
    "model": "your-deployment-name",
    "temperature": 0.8,
    "max_tokens": 150,
    "base_url": "https://your-resource.cognitiveservices.azure.com",
    "api_version": "2024-12-01-preview"
  }
}
```

**Note**: For Azure, `model` is the deployment name, not the model name.

### Environment Variable Fallbacks

LLM configuration fields fall back to environment variables if not specified in JSON:

```json
{
  "llm": {
    "model": "gpt-4.1",           // Falls back to: LLM_MODEL env var
    "base_url": "",               // Falls back to: OPENAI_BASE_URL env var
    "api_version": ""             // Falls back to: OPENAI_API_VERSION env var
  }
}
```

**Fallback Priority** (highest to lowest):
1. Agent JSON config values
2. Environment variables (`.env` file)
3. Code defaults (see LLMConfig dataclass)

**Extraction LLM Fallback Chain:**

Variable extraction and semantic transition evaluation use a separate LLM configuration:

1. Agent's `llm` config (if present)
2. `EXTRACTION_LLM_*` environment variables (if set)
3. `OPENAI_*` environment variables (if set)
4. Code defaults (model: `gpt-4o-mini`, temperature: `0.0`)

**Example:**
```bash
# .env
LLM_MODEL=gpt-4.1
OPENAI_BASE_URL=https://api.openai.com/v1

# agent.json (overrides .env)
{
  "llm": {
    "model": "gpt-3.5-turbo"  // ← This wins (specific to agent)
  }
}
```

**Important**: Always specify `model` in agent JSON OR as `LLM_MODEL` env var. There is no code default for production models.

### Service Tier

Controls resource allocation and priority with OpenAI's models:

```json
{
  "llm": {
    "service_tier": "auto"
  }
}
```

| Value | Description | Use Case |
|-------|-------------|----------|
| `"auto"` (default) | OpenAI manages resource allocation | Standard usage |
| `"default"` | Standard tier | Baseline performance |

**Note**: Service tier is passed to OpenAI API and applies to your OpenAI account tier. Not available with Azure or custom endpoints.

**Azure & Custom Endpoints**: `service_tier` is ignored when using `base_url` + `api_version` (Azure) or custom endpoints.

### Temperature and Randomness

```json
{
  "llm": {
    "temperature": 0.8
  }
}
```

**Value Range**: 0.0 - 2.0

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| `0.0` | Deterministic - always same response | Variable extraction, semantic transitions |
| `0.5` - `0.7` | Focused - mostly consistent | Medical information, critical data |
| `0.8` - `1.0` (default) | Balanced | Natural conversation, general purpose |
| `1.0` - `1.5` | Creative - varied responses | Personalized greetings, sales calls |
| `1.5` - `2.0` | Very creative - highly unpredictable | Brainstorming (NOT for critical tasks) |

**Recommendations:**
- Use `0.0` for extraction and semantic evaluations (internal LLM calls)
- Use `0.8-1.0` for conversational nodes
- Avoid > 1.5 for anything with user-facing consistency requirements

**Note**: Variable extraction and semantic evaluation always use `temperature: 0.0` internally, regardless of this setting.

---

## TTS Configuration

Configure Text-to-Speech (ElevenLabs).

### Schema

```json
{
  "tts": {
    "enabled": true,
    "voice_id": "string",
    "model": "eleven_turbo_v2_5",
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": true,
    "enable_ssml_parsing": false,
    "pronunciation_dictionaries_enabled": true,
    "pronunciation_dictionary_ids": ["dict_id_1", "dict_id_2"]
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Enable/disable TTS |
| `voice_id` | string | ⚠️ Conditional | `""` | ElevenLabs voice ID (required if enabled) |
| `model` | string | ❌ No | `"eleven_turbo_v2_5"` | TTS model |
| `stability` | float | ❌ No | `0.5` | Voice stability (0.0-1.0) |
| `similarity_boost` | float | ❌ No | `0.75` | Similarity boost (0.0-1.0) |
| `style` | float | ❌ No | `0.0` | Style exaggeration (0.0-1.0) |
| `use_speaker_boost` | boolean | ❌ No | `true` | Enable speaker boost |
| `enable_ssml_parsing` | boolean | ❌ No | `false` | Parse SSML tags |
| `pronunciation_dictionaries_enabled` | boolean | ❌ No | `true` | Use pronunciation dictionaries |
| `pronunciation_dictionary_ids` | array | ❌ No | `[]` | Dictionary IDs from ElevenLabs |

### SSML Support

When `enable_ssml_parsing: true`, you can use SSML tags in prompts:

```xml
<break time="500ms"/>
<prosody rate="slow">Speak slowly</prosody>
<emphasis level="strong">Important</emphasis>
```

### Pronunciation Dictionaries

1. Create dictionary in [ElevenLabs Dashboard](https://elevenlabs.io)
2. Add pronunciation rules (alias or IPA)
3. Copy Dictionary ID
4. Add to configuration:

```json
{
  "tts": {
    "pronunciation_dictionaries_enabled": true,
    "pronunciation_dictionary_ids": [
      "dict_medical_terms_abc123"
    ]
  }
}
```

### Example

```json
{
  "tts": {
    "enabled": true,
    "voice_id": "JBFqnCBsd6RMkjVDRZzb",
    "model": "eleven_turbo_v2_5",
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.2,
    "use_speaker_boost": true,
    "enable_ssml_parsing": true,
    "pronunciation_dictionaries_enabled": true,
    "pronunciation_dictionary_ids": [
      "dict_abc123xyz789"
    ]
  }
}
```

---

## STT Configuration

Configure Speech-to-Text (Deepgram Flux v2).

### Schema

```json
{
  "stt": {
    "model": "flux-general-en",
    "sample_rate": 8000,
    "eager_eot_threshold": null,
    "eot_threshold": null,
    "eot_timeout_ms": null
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | string | ❌ No | `"flux-general-en"` | Deepgram model |
| `sample_rate` | integer | ❌ No | `8000` | Audio sample rate (Hz) |
| `eager_eot_threshold` | float/null | ❌ No | `null` | Eager end-of-turn threshold |
| `eot_threshold` | float/null | ❌ No | `null` | End-of-turn threshold |
| `eot_timeout_ms` | integer/null | ❌ No | `null` | End-of-turn timeout (ms) |

### Example

```json
{
  "stt": {
    "model": "flux-general-en",
    "sample_rate": 8000
  }
}
```

---

## RAG Configuration

Configure Retrieval-Augmented Generation (knowledge base).

### Schema

```json
{
  "rag": {
    "enabled": false,
    "search_mode": "hybrid",
    "top_k": 5,
    "relevance_filter": true,
    "faiss_index_path": "data/faiss/index.faiss",
    "faiss_mapping_path": "data/faiss/mapping.pkl",
    "sqlite_db_path": "data/metadata/healthcare_rag.db",
    "rrf_k": 60,
    "vector_weight": 0.6,
    "fts_weight": 0.4,
    "hnsw_ef_search": 64,
    "bedrock_model": "amazon.titan-embed-text-v2:0",
    "bedrock_dimensions": 1024
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `false` | Enable/disable RAG |
| `search_mode` | string | ❌ No | `"hybrid"` | Search mode: `"vector"`, `"fts"`, `"hybrid"` |
| `top_k` | integer | ❌ No | `5` | Number of chunks to retrieve |
| `relevance_filter` | boolean | ❌ No | `true` | Only query for questions/info requests |
| `faiss_index_path` | string | ❌ No | `"data/faiss/index.faiss"` | FAISS index file |
| `faiss_mapping_path` | string | ❌ No | `"data/faiss/mapping.pkl"` | FAISS metadata file |
| `sqlite_db_path` | string | ❌ No | `"data/metadata/healthcare_rag.db"` | SQLite FTS5 database |
| `rrf_k` | integer | ❌ No | `60` | RRF fusion constant |
| `vector_weight` | float | ❌ No | `0.6` | Vector search weight (hybrid mode) |
| `fts_weight` | float | ❌ No | `0.4` | FTS weight (hybrid mode) |
| `hnsw_ef_search` | integer | ❌ No | `64` | FAISS HNSW search parameter |
| `bedrock_model` | string | ❌ No | `"amazon.titan-embed-text-v2:0"` | Bedrock embedding model |
| `bedrock_dimensions` | integer | ❌ No | `1024` | Embedding dimensions |

### Per-Node RAG Override

Nodes can override global RAG settings. When a node specifies RAG config, specified fields **completely override** the global config for those fields:

```json
{
  "rag": {
    "enabled": false,
    "search_mode": "hybrid",
    "top_k": 5
  },
  "workflow": {
    "nodes": [
      {
        "id": "faq_node",
        "rag": {
          "enabled": true,          // ← Enables RAG for this node only
          "search_mode": "vector",  // ← Uses vector search (not hybrid)
          "top_k": 10               // ← Returns 10 chunks (not 5)
        }
      }
    ]
  }
}
```

**Override Behavior:**
- Node-level settings take precedence over global
- Only specified fields override (unspecified fields don't fall back to global defaults)
- If node-level `enabled: false`, RAG disabled for that node only
- Each node can have different RAG behavior

**Field Compatibility:**

Node-level RAG overrides only support: `enabled`, `search_mode`, `top_k`

Other RAG fields (`rrf_k`, `vector_weight`, `fts_weight`, file paths) **cannot** be overridden per-node and always use global configuration.

### Example

```json
{
  "rag": {
    "enabled": true,
    "search_mode": "hybrid",
    "top_k": 5,
    "relevance_filter": true,
    "vector_weight": 0.6,
    "fts_weight": 0.4
  }
}
```

---

## Auto-Hangup Configuration

Controls whether call automatically ends or waits for manual termination:

### Schema

```json
{
  "auto_hangup": {
    "enabled": true
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Auto-terminate call on `end_call` node |

### Behavior

| Value | Behavior |
|-------|----------|
| `true` (default) | Call ends automatically when `end_call` node reached |
| `false` | Application notifies but doesn't hang up (Twilio controls) |

**When to Disable:**
- Testing (prevents auto-termination)
- Custom hangup logic
- Twilio-managed termination
- Call transfers

### Example

```json
{
  "auto_hangup": {
    "enabled": false
  }
}
```

---

## Logging Configuration

Controls application logging verbosity:

### Schema

```json
{
  "logging": {
    "level": "INFO"
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `level` | string | ❌ No | `"INFO"` | Logging level |

### Logging Levels

| Level | Output | Use Case |
|-------|--------|----------|
| `"DEBUG"` | Detailed debug info, SQL queries, LLM details | Development, troubleshooting |
| `"INFO"` | Key events, transitions, metrics | Production, normal operation |
| `"WARNING"` | Problems and warnings | Production monitoring |
| `"ERROR"` | Errors only | Silent operation |

**Note**: Can also be set via `LOG_LEVEL` environment variable. Agent JSON config takes precedence over environment variable.

### Example

```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```

---

## Complete Examples

### Minimal Agent

Simplest valid configuration:

```json
{
  "agent": {
    "id": "simple_agent",
    "name": "Simple Agent"
  },
  "workflow": {
    "initial_node": "greeting",
    "nodes": [
      {
        "id": "greeting",
        "name": "Greeting",
        "system_prompt": "Greet the user and ask how you can help.",
        "transitions": [
          {
            "condition": "contains:bye",
            "target": "end"
          }
        ]
      },
      {
        "id": "end",
        "type": "end_call",
        "name": "End Call"
      }
    ]
  },
  "llm": {
    "model": "gpt-4.1"
  },
  "tts": {
    "voice_id": "your_voice_id"
  }
}
```

### Multi-Stage Workflow with Variable Extraction

```json
{
  "agent": {
    "id": "survey_bot",
    "name": "Survey Bot",
    "description": "Collects user feedback"
  },
  "workflow": {
    "initial_node": "disclaimer",
    "global_prompt": "You are a friendly survey bot. Be concise and polite.",
    "history_window": 10,
    "max_transitions": 30,
    "interruption_settings": {
      "enabled": true,
      "delay_ms": 300,
      "resume_prompt": "Please continue"
    },
    "nodes": [
      {
        "id": "disclaimer",
        "type": "standard",
        "name": "Disclaimer",
        "interruptions_enabled": false,
        "static_text": "This call may be recorded. The survey takes 2 minutes.",
        "transitions": [
          {
            "condition": "skip_response",
            "target": "greeting"
          }
        ]
      },
      {
        "id": "greeting",
        "type": "standard",
        "name": "Greeting",
        "system_prompt": "Greet the user warmly and ask for their name.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "extract_name"
          }
        ]
      },
      {
        "id": "extract_name",
        "type": "retrieve_variable",
        "name": "Extract Name",
        "variables": [
          {
            "variable_name": "user_name",
            "extraction_prompt": "Extract the user's full name.",
            "default_value": "Guest"
          }
        ],
        "transitions": [
          {
            "condition": "always",
            "target": "ask_rating"
          }
        ]
      },
      {
        "id": "ask_rating",
        "type": "standard",
        "name": "Ask Rating",
        "system_prompt": "Thank {{user_name}} and ask them to rate our service from 1 to 5.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "extract_rating"
          }
        ]
      },
      {
        "id": "extract_rating",
        "type": "retrieve_variable",
        "name": "Extract Rating",
        "variable_name": "rating",
        "extraction_prompt": "Extract the numeric rating (1-5) from the user's response.",
        "default_value": "0",
        "transitions": [
          {
            "condition": "always",
            "target": "closing"
          }
        ],
        "actions": {
          "on_entry": [
            "log:Rating received: {{rating}}",
            "webhook:https://api.example.com/ratings?name={{user_name}}&rating={{rating}}"
          ]
        }
      },
      {
        "id": "closing",
        "type": "standard",
        "name": "Closing",
        "interruptions_enabled": false,
        "system_prompt": "Thank {{user_name}} for their time and their {{rating}} rating.",
        "transitions": [
          {
            "condition": "skip_response",
            "target": "end"
          }
        ]
      },
      {
        "id": "end",
        "type": "end_call",
        "name": "End Call"
      }
    ]
  },
  "llm": {
    "model": "gpt-4.1",
    "temperature": 0.7,
    "max_tokens": 100
  },
  "tts": {
    "voice_id": "your_voice_id",
    "model": "eleven_turbo_v2_5",
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

### Medical Assistant with RAG

```json
{
  "agent": {
    "id": "medical_assistant",
    "name": "Medical Education Assistant",
    "description": "Provides GLP-1 medication education"
  },
  "workflow": {
    "initial_node": "greeting",
    "global_prompt": "You are a medical education assistant.\n\nIMPORTANT:\n- Provide education only, NOT medical advice\n- Always recommend consulting a healthcare provider\n- Use clear, jargon-free language",
    "history_window": 20,
    "nodes": [
      {
        "id": "greeting",
        "type": "standard",
        "name": "Greeting",
        "system_prompt": "Greet the user and ask what they'd like to learn about GLP-1 medications.",
        "rag": {
          "enabled": false
        },
        "transitions": [
          {
            "condition": "contains:goodbye",
            "target": "closing",
            "priority": 10
          },
          {
            "condition": "user_responded",
            "target": "education"
          }
        ]
      },
      {
        "id": "education",
        "type": "standard",
        "name": "Education",
        "system_prompt": "Answer the user's questions about GLP-1 medications using the knowledge base.\nProvide clear, educational information.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 5
        },
        "transitions": [
          {
            "condition": "contains:goodbye",
            "target": "closing",
            "priority": 10
          },
          {
            "condition": "max_turns:15",
            "target": "closing"
          }
        ]
      },
      {
        "id": "closing",
        "type": "standard",
        "name": "Closing",
        "interruptions_enabled": false,
        "system_prompt": "Thank the user and remind them to consult their healthcare provider.",
        "rag": {
          "enabled": false
        },
        "transitions": [
          {
            "condition": "skip_response",
            "target": "end"
          }
        ]
      },
      {
        "id": "end",
        "type": "end_call",
        "name": "End Call"
      }
    ]
  },
  "llm": {
    "model": "gpt-4.1",
    "temperature": 0.8,
    "max_tokens": 200
  },
  "tts": {
    "voice_id": "your_voice_id",
    "pronunciation_dictionaries_enabled": true,
    "pronunciation_dictionary_ids": [
      "dict_medical_terms_abc123"
    ]
  },
  "rag": {
    "enabled": true,
    "search_mode": "hybrid",
    "top_k": 5,
    "relevance_filter": true
  }
}
```

---

## Validation Rules

The system validates configurations on load. Common validation errors:

### Workflow Validation

1. **Initial node must exist**
   ```
   Error: Initial node 'greeting' not found
   ```
   Fix: Ensure `initial_node` matches an existing node `id`.

2. **Duplicate node IDs**
   ```
   Error: Duplicate node IDs: {'greeting'}
   ```
   Fix: Each node must have a unique `id`.

3. **Unknown transition target**
   ```
   Error: Node 'greeting' transitions to unknown node 'next'
   ```
   Fix: All transition targets must be valid node IDs.

4. **Missing end_call node**
   ```
   Error: Workflow must have at least one 'end_call' node
   ```
   Fix: Add at least one node with `"type": "end_call"`.

### Node Validation

5. **retrieve_variable missing fields**
   ```
   Error: retrieve_variable node 'extract' missing 'variable_name'
   ```
   Fix: Provide either `variables` array OR `variable_name` + `extraction_prompt`.

6. **Empty variables array**
   ```
   Error: retrieve_variable node 'extract' has empty 'variables' list
   ```
   Fix: Add at least one variable to the `variables` array.

7. **Both static_text and system_prompt**
   ```
   Error: Node 'greeting' has both 'static_text' and 'system_prompt'
   ```
   Fix: Use only one. Remove the other.

8. **Missing prompt**
   ```
   Error: Node 'greeting' must have either 'static_text' or 'system_prompt'
   ```
   Fix: Add either `static_text` OR `system_prompt` (for standard nodes).

### Testing Validation

Test your configuration:

```bash
# Start application (validates on load)
uv run uvicorn app.main:app --reload

# Check logs for validation errors
```

---

## Additional Resources

- **Workflow Guide**: `docs/WORKFLOW_GUIDE.md` - Quick start and common patterns
- **Workflow Reference**: `docs/WORKFLOW_REFERENCE.md` - Detailed workflow concepts
- **Config Reference**: `docs/CONFIG_REFERENCE.md` - Environment variables
- **Recording Config**: `docs/RECORDING_CONFIG.md` - Call recording setup
- **Example Agent**: `agents/tenant_12345/agent_workflow_simple.json` - Working example

---

**Last Updated**: 2025-11-19
