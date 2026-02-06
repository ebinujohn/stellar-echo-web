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
   - [Per-Node Interruption Control](#per-node-interruption-control)
   - [History Window Details](#history-window-details)
   - [Max Transitions Limit](#max-transitions-limit)
   - [Global Intents](#global-intents)
   - [Post-Call Analysis](#post-call-analysis-configuration)
5. [Node Types](#node-types)
   - [Standard Node](#standard-node)
   - [Retrieve Variable Node](#retrieve-variable-node)
   - [End Call Node](#end-call-node)
   - [Agent Transfer Node](#agent-transfer-node)
   - [API Call Node](#api-call-node)
6. [Variable Substitution](#variable-substitution)
7. [Transition Conditions](#transition-conditions)
8. [Actions](#actions)
9. [LLM Configuration (JSON-based)](#llm-configuration-json-based)
   - [Per-Node LLM Override](#per-node-llm-override)
   - [Available Models](#available-models-default-seed)
10. [Voice/TTS Configuration (Database FK + JSON Tuning)](#voicetts-configuration-database-fk--json-tuning)
11. [STT Configuration (Environment-Based)](#stt-configuration-environment-based)
12. [RAG Configuration](#rag-configuration)
    - [Per-Node RAG Override](#per-node-rag-override)
13. [Phone Number Pool (Database-Backed)](#phone-number-pool-database-backed)
    - [Webhook Configuration](#webhook-configuration)
14. [Logging Configuration](#logging-configuration)
15. [Complete Examples](#complete-examples)
16. [Validation Rules](#validation-rules)
17. [Configuration Type Reference](#configuration-type-reference)

---

## Overview

Agent configurations are stored in the **PostgreSQL database** (`agent_config_versions` table). Seed data files follow this naming convention:
- **Seed files**: `scripts/seed_data/tenant_{tenant_id}/agent_{agent_id}.json`

All agents **must** use node-based workflows. Traditional single-prompt mode has been removed.

---

## Top-Level Structure

```json
{
  "agent": { ... },
  "workflow": { ... }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent` | object | ✅ Yes | Agent metadata (ID, name, description) |
| `workflow` | object | ✅ Yes | Workflow configuration with nodes and transitions |

> **Note:** Configuration management summary:
>
> **Agent JSON (`workflow` section):**
> - **LLM**: `workflow.llm.provider_id` references entry in `llm_providers.json` (includes credentials, model, defaults)
> - **TTS Tuning**: `workflow.tts` section with stability, similarity_boost, etc. (voice selection via `voice_config_id` FK in database)
>
> **LLM Providers (`config/llm_providers.json`):**
> - Contains both credentials AND model configuration per provider
> - Loaded from file (dev) or AWS Parameter Store (prod)
>
> **Database:**
> - **Voice Selection**: `agent_config_versions.voice_config_id` FK links to `voice_configs` table
>
> **Database-backed:**
> - **RAG**: `rag_configs` and `rag_config_versions` tables
> - **Voice Catalog**: `voice_configs` table (system-level, maps voice_name → voice_id)
> - **Phone Numbers**: `phone_configs` table (phone number pool) + `phone_mappings` table
>
> **Environment variables (.env):**
> - **STT**: `DEEPGRAM_MODEL`, `AUDIO_SAMPLE_RATE`, EOT thresholds
> - **Recording Settings**: `RECORDING_TRACK`, `RECORDING_CHANNELS` (when recording enabled per-agent)
>
> See respective sections for details.

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
    "history_window": 0,
    "max_transitions": 50,
    "interruption_settings": { ... },
    "nodes": [ ... ]
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `initial_node` | string | ✅ Yes | - | ID of starting node |
| `nodes` | array | ✅ Yes | - | Array of node configurations |
| `history_window` | integer | ❌ No | `0` | Message preservation (0 = all, N = last N messages) |
| `max_transitions` | integer | ❌ No | `50` | Maximum node transitions (prevents infinite loops) |
| `interruption_settings` | object | ❌ No | See below | Global interruption handling configuration |

> **Note:** Recording configuration has been moved to database-backed phone configs. See [Phone/Call Configuration](#phonecall-configuration-database-backed).

### Global Prompt (Database Column)

> **Note:** The `global_prompt` is stored in the **database column** (`agent_config_versions.global_prompt`), NOT in the JSON configuration. This allows for:
> - Easier editing of large, multiline prompts
> - Direct database queries on prompt content
> - Separation of behavioral configuration (JSON) from prompt content (text)

**When seeding from JSON files:** Include `global_prompt` in the workflow section. The seed script extracts it and stores it in the database column separately.

**At runtime:** The system automatically prepends `global_prompt` to every node's `system_prompt`:
```
Final prompt = global_prompt + "\n\n" + node.system_prompt
```

**Use `global_prompt` for:**
- Agent identity and name
- Universal safety guardrails
- Compliance requirements
- Common formatting instructions

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

### Global Intents

Global intents enable workflow-wide "always listening" conditions that can trigger from any node. Unlike node-level intents (which only work within a specific node), global intents are evaluated on EVERY user input before node-level transitions.

#### Schema

```json
{
  "workflow": {
    "global_intents": {
      "intent_id": {
        "description": "string (required)",
        "examples": ["string"],
        "target_node": "string (required)",
        "priority": 0,
        "active_from_nodes": ["string"] | null,
        "excluded_from_nodes": ["string"] | null
      }
    },
    "global_intent_config": {
      "enabled": true,
      "confidence_threshold": 0.75,
      "context_messages": 4
    }
  }
}
```

#### Global Intent Definition Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `description` | string | ✅ Yes | - | What this intent represents (used for AI classification) |
| `examples` | array | ❌ No | `[]` | Example utterances that trigger this intent |
| `target_node` | string | ✅ Yes | - | Node ID to transition to when matched |
| `priority` | integer | ❌ No | `0` | Higher priority wins when multiple intents match |
| `active_from_nodes` | array | ❌ No | `null` | Whitelist: Only evaluate when in these nodes |
| `excluded_from_nodes` | array | ❌ No | `null` | Blacklist: Never evaluate when in these nodes |

#### Global Intent Config Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Enable/disable global intent matching |
| `confidence_threshold` | float | ❌ No | `0.75` | Minimum confidence (0.0-1.0) to trigger |
| `context_messages` | integer | ❌ No | `4` | Messages to include in classification context |

#### Example: Multi-Topic Agent with Global Intents

```json
{
  "workflow": {
    "initial_node": "greeting",
    "global_intents": {
      "appointment_topic": {
        "description": "User wants to discuss appointments or scheduling",
        "examples": ["appointment", "schedule", "what to bring"],
        "target_node": "appointment_info",
        "priority": 10
      },
      "mri_topic": {
        "description": "User wants information about MRI procedures",
        "examples": ["MRI", "scan", "magnetic", "imaging"],
        "target_node": "mri_info",
        "priority": 10
      },
      "emergency_exit": {
        "description": "User is experiencing an emergency",
        "examples": ["emergency", "urgent", "call 911"],
        "target_node": "emergency_redirect",
        "priority": 100,
        "excluded_from_nodes": ["emergency_redirect", "end_call"]
      }
    },
    "global_intent_config": {
      "enabled": true,
      "confidence_threshold": 0.7,
      "context_messages": 4
    },
    "nodes": [...]
  }
}
```

#### Evaluation Order

1. User input received
2. Global intents evaluated FIRST (if `global_intent_config.enabled: true`)
3. Filter by `active_from_nodes` / `excluded_from_nodes`
4. Classify against active global intents
5. If match with confidence ≥ threshold → transition to `target_node`
6. If no match → proceed with node-level transition evaluation

#### Validation Rules

- All `target_node` values must reference existing nodes
- `active_from_nodes` entries must reference existing nodes
- `excluded_from_nodes` entries must reference existing nodes
- `confidence_threshold` must be between 0.0 and 1.0

### Post-Call Analysis Configuration

Configure post-call AI analysis with optional structured questionnaires for extracting specific data from call transcripts.

#### Schema

```json
{
  "workflow": {
    "post_call_analysis": {
      "enabled": true,
      "provider_id": "azure-gpt-5-mini",
      "questions": [
        {
          "name": "string (required)",
          "description": "string",
          "type": "string|number|enum|boolean",
          "choices": [
            {
              "value": "string (required)",
              "label": "string"
            }
          ],
          "required": false
        }
      ],
      "additional_instructions": "string"
    }
  }
}
```

#### Post-Call Analysis Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Enable/disable post-call analysis |
| `provider_id` | string | ⚠️ When enabled | - | LLM provider ID for analysis (must have `"analysis"` in usage_types) |
| `questions` | array | ❌ No | `[]` | Structured questions to answer from transcript |
| `additional_instructions` | string | ❌ No | `null` | Extra instructions for the analysis LLM |

#### Question Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | ✅ Yes | - | Question identifier/text |
| `description` | string | ❌ No | `""` | Additional context for the LLM |
| `type` | string | ❌ No | `"string"` | Type: `"string"`, `"number"`, `"enum"`, `"boolean"` |
| `choices` | array | ⚠️ Required for enum | `[]` | Valid choices for enum-type questions |
| `required` | boolean | ❌ No | `false` | Whether this question must be answered |

#### Choice Fields (for enum type)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | string | ✅ Yes | - | The answer value stored in database |
| `label` | string | ❌ No | Same as value | Display label for the choice |

#### Example: Healthcare SDOH Screening

```json
{
  "workflow": {
    "post_call_analysis": {
      "enabled": true,
      "questions": [
        {
          "name": "Do you currently have a steady place to live?",
          "type": "enum",
          "choices": [
            {"value": "yes", "label": "Yes"},
            {"value": "yes_worried", "label": "Yes, but worried about losing it"},
            {"value": "no", "label": "No"}
          ],
          "required": true
        },
        {
          "name": "Food security concerns",
          "type": "boolean",
          "description": "Did the caller express concerns about access to food?"
        },
        {
          "name": "Number of risk factors identified",
          "type": "number",
          "description": "Count how many SDOH questions had concerning responses"
        },
        {
          "name": "Caller's primary concern",
          "type": "string",
          "description": "Summarize the caller's main issue in 1-2 sentences"
        }
      ],
      "additional_instructions": "Focus on social determinants of health. Be sensitive to indirect mentions of hardship."
    }
  }
}
```

#### Database Storage

Question responses are stored in the `post_call_question_responses` table:

| Column | Type | Description |
|--------|------|-------------|
| `call_analysis_id` | UUID | FK to call_analysis record |
| `question_name` | string | The question identifier |
| `question_type` | enum | string, number, enum, boolean |
| `response_value` | text | The extracted answer |
| `response_confidence` | decimal | AI confidence (0.0-1.0) |

#### Default Analysis (Always Included)

Even without `questions`, post-call analysis extracts:
- `sentiment`: positive, neutral, negative, mixed
- `sentiment_score`: -1.0 to 1.0
- `summary`: 2-3 sentence overview
- `call_successful`: boolean
- `success_confidence`: 0.0 to 1.0
- `keywords_detected`: array of strings
- `topics_discussed`: array of strings

---

## Node Types

Nodes represent distinct conversation phases. Four node types are supported:

1. **`standard`** - Regular conversation node with LLM
2. **`retrieve_variable`** - Extract structured data from conversation
3. **`end_call`** - Terminate call
4. **`agent_transfer`** - Transfer to another agent (warm handoff)

### Standard Node

Regular conversation node with system prompt and LLM processing.

#### Schema

```json
{
  "id": "string",
  "type": "standard",
  "name": "string",
  "proactive": false,
  "system_prompt": "string",
  "static_text": "string",
  "interruptions_enabled": true,
  "transitions": [ ... ],
  "rag": { ... },
  "llm_override": { ... },
  "actions": { ... },
  "intents": { ... },
  "intent_config": { ... }
}
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | ✅ Yes | - | Unique node identifier |
| `type` | string | ❌ No | `"standard"` | Node type (must be `"standard"`) |
| `name` | string | ✅ Yes | - | Human-readable node name |
| `proactive` | boolean | ❌ No | `false` | If true, node speaks (static_text or LLM) on entry before evaluating transitions |
| `system_prompt` | string | ⚠️ Conditional | `""` | LLM system prompt (required if no `static_text`) |
| `static_text` | string | ⚠️ Conditional | `null` | Static text bypass (required if no `system_prompt`) |
| `interruptions_enabled` | boolean | ❌ No | `null` | Override global interruption setting |
| `transitions` | array | ❌ No | `[]` | Transition conditions to other nodes |
| `rag` | object | ❌ No | `null` | Per-node RAG configuration override |
| `llm_override` | object | ❌ No | `null` | Per-node LLM configuration override (model, temperature, etc.) |
| `actions` | object | ❌ No | `{}` | Actions to execute on entry/exit |
| `intents` | object | ❌ No | `null` | Intent definitions for `intent:` transitions (see below) |
| `intent_config` | object | ❌ No | `null` | Intent classification configuration (see below) |

**Important**: Node must have **either** `system_prompt` OR `static_text`, but not both.

#### Static Text vs System Prompt

**Static Text** (zero latency):
- Bypasses LLM completely
- Text sent directly to TTS
- Perfect for disclaimers, fixed greetings
- Use with `proactive: true` + `always` transition for instant progression

**System Prompt** (LLM processing):
- Dynamic response generation
- Context-aware conversation
- Variable substitution supported (`{{variable_name}}`)

#### Proactive Output

The `proactive` field controls whether a node speaks immediately upon entry:

| `proactive` | Transition | Behavior |
|-------------|------------|----------|
| `true` | `always` | Speak → Continue immediately (auto-advance) |
| `true` | `user_responded` | Speak → Wait for user (speak-then-listen) |
| `false` | `user_responded` | Silent → Wait → LLM responds (default behavior) |
| `false` | `always` | Silent → Continue immediately (processing node) |

**Use Cases:**
- `proactive: true` + `always` - Disclaimers, auto-advancing greetings
- `proactive: true` + `user_responded` - Questions that prompt for user input

#### Example: Standard Node with System Prompt

```json
{
  "id": "greeting",
  "type": "standard",
  "name": "Welcome Greeting",
  "proactive": true,
  "interruptions_enabled": false,
  "system_prompt": "Greet the user warmly. Introduce yourself as Ivan.\nAsk for their name and what topic they're interested in.",
  "transitions": [
    {
      "condition": "contains:goodbye",
      "target": "closing"
    },
    {
      "condition": "user_responded",
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

#### Example: Static Text Node (Auto-Advance)

```json
{
  "id": "fast_disclaimer",
  "type": "standard",
  "name": "Fast Disclaimer",
  "proactive": true,
  "interruptions_enabled": false,
  "static_text": "Thank you for calling. This call may be recorded for quality purposes.",
  "transitions": [
    {
      "condition": "always",
      "target": "greeting"
    }
  ]
}
```

#### Intent-Based Transitions

For content-based routing where you need to classify user responses into predefined categories, use intent-based transitions. A single LLM call classifies the user input against all defined intents (~100-150ms).

##### `intents` Object

Defines the intents that can be matched for this node.

```json
{
  "intents": {
    "intent_id": {
      "description": "string (required)",
      "examples": ["string", "string"]
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | ✅ Yes | Clear description of what this intent represents |
| `examples` | array | ❌ No | Example user messages that should trigger this intent |

##### `intent_config` Object

Configures how intent classification is performed.

```json
{
  "intent_config": {
    "confidence_threshold": 0.7,
    "context_scope": "node",
    "context_messages": 6
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `confidence_threshold` | number | `0.7` | Minimum confidence (0.0-1.0) to match an intent |
| `context_scope` | string | `"node"` | `"node"` = messages since entering node, `"conversation"` = entire call |
| `context_messages` | int | `6` | Maximum messages to include in classification context |

##### Example: Node with Intent-Based Routing

```json
{
  "id": "topic_selection",
  "type": "standard",
  "name": "Topic Selection",
  "system_prompt": "Ask the user what aspect they'd like to explore: basics, practical tips, or advanced topics.",
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
    "confidence_threshold": 0.6,
    "context_scope": "node",
    "context_messages": 4
  },
  "transitions": [
    {
      "condition": "intent:wants_basics",
      "target": "basics_node",
      "priority": 1
    },
    {
      "condition": "intent:wants_practical",
      "target": "practical_node",
      "priority": 1
    },
    {
      "condition": "intent:wants_advanced",
      "target": "advanced_node",
      "priority": 1
    },
    {
      "condition": "intent:no_match",
      "target": "clarify",
      "priority": 2
    },
    {
      "condition": "max_turns:3",
      "target": "fallback",
      "priority": 10
    }
  ]
}
```

**Key Points:**
- Use `intent:intent_id` in transition conditions to match specific intents
- Use `intent:no_match` to handle cases where no intent matched with sufficient confidence
- Intent classification is cached per user input per node (avoids re-classification)
- `context_scope: "node"` is best for decision points; `"conversation"` when broader context matters

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

### Agent Transfer Node

Transfers control to another agent within the same call or text chat session. This is a "warm transfer" - the same connection is maintained while the internal workflow configuration is swapped.

#### Schema

```json
{
  "id": "string",
  "type": "agent_transfer",
  "name": "string",
  "target_agent_id": "string",
  "transfer_context": false,
  "transfer_message": "string",
  "actions": { ... }
}
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | ✅ Yes | - | Unique node identifier |
| `type` | string | ✅ Yes | - | Must be exactly `"agent_transfer"` |
| `name` | string | ✅ Yes | - | Human-readable name |
| `target_agent_id` | string | ✅ Yes | - | UUID of agent to transfer to (same tenant) |
| `transfer_context` | boolean | ❌ No | `false` | Whether to pass conversation history to new agent |
| `transfer_message` | string | ❌ No | `null` | Optional message spoken during handoff |
| `actions` | object | ❌ No | `{}` | Actions to execute on entry |

**Not Supported:**
- `system_prompt` - No LLM processing
- `static_text` - Use `transfer_message` instead
- `transitions` - Transfer handles its own continuation
- `rag` - No knowledge base access

#### Behavior

1. **Variables Always Transfer**: `collected_data` persists across transfers
2. **Context Optional**: Set `transfer_context: true` to pass conversation history
3. **Loop Prevention**: Max 3 transfers per call/session (prevents A→B→A loops)
4. **Same Tenant**: Target agent must be in the same tenant
5. **RAG Reconfiguration**: New agent's RAG config is loaded (if enabled)

#### Transfer Flow

1. Transfer message is spoken (if configured)
2. New agent config is loaded from database
3. Conversation history is optionally cleared
4. New agent's initial node is activated
5. Session continues with new agent's workflow

#### Example

```json
{
  "id": "transfer_to_specialist",
  "type": "agent_transfer",
  "name": "Transfer to Specialist",
  "target_agent_id": "b2c3d4e5-f6a7-4901-bcde-f23456789012",
  "transfer_context": true,
  "transfer_message": "Please hold while I connect you with our specialist.",
  "actions": {
    "on_entry": [
      {"type": "log", "params": {"message": "Transferring to specialist"}}
    ]
  }
}
```

#### Intent-Based Transfer

Combine with intent detection for user-driven transfers:

```json
{
  "id": "listen_for_intent",
  "type": "standard",
  "name": "Listen for Intent",
  "system_prompt": "Help the user. If they ask to speak to someone else, acknowledge warmly.",
  "intents": {
    "wants_transfer": {
      "description": "User wants to be transferred to another agent",
      "examples": [
        "Transfer me to someone else",
        "Can I speak to another agent?",
        "Connect me with support"
      ]
    }
  },
  "transitions": [
    {
      "condition": "intent:wants_transfer",
      "target": "transfer_to_specialist",
      "priority": 1
    }
  ]
}
```

#### Error Handling

| Scenario | Behavior |
|----------|----------|
| Target agent not found | Log error, treat as `end_call` |
| Config load failure | Log error, treat as `end_call` |
| Transfer limit exceeded (3) | Log warning, treat as `end_call` |
| Cross-tenant attempt | Blocked (config won't load) |

---

### API Call Node

Executes HTTP API calls during conversation flow, extracts response data into variables, and transitions based on API result. Similar to Retell AI's custom functions but integrated into the node-based workflow system.

#### Schema

```json
{
  "id": "string",
  "type": "api_call",
  "name": "string",
  "static_text": "string",
  "api_call": {
    "method": "GET",
    "url": "string",
    "headers": { ... },
    "query_params": { ... },
    "body": { ... },
    "timeout_seconds": 30,
    "retry": {
      "max_retries": 2,
      "initial_delay_ms": 500,
      "max_delay_ms": 5000,
      "backoff_multiplier": 2.0
    },
    "response_extraction": [
      {
        "path": "string",
        "variable_name": "string",
        "default_value": "string"
      }
    ],
    "response_size_limit_bytes": 15000,
    "allowed_hosts": ["string"]
  },
  "transitions": [ ... ],
  "actions": { ... }
}
```

#### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | ✅ Yes | - | Unique node identifier |
| `type` | string | ✅ Yes | - | Must be exactly `"api_call"` |
| `name` | string | ✅ Yes | - | Human-readable name |
| `static_text` | string | ❌ No | `null` | Optional loading message delivered before API call |
| `api_call` | object | ✅ Yes | - | API call configuration (see below) |
| `transitions` | array | ✅ Yes | - | Transition rules (typically `api_success`/`api_failed`) |
| `actions` | object | ❌ No | `{}` | Actions to execute on entry |

**Not Supported:**
- `system_prompt` - API call nodes don't generate LLM responses
- `rag` - No knowledge base access during API execution

#### API Call Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `method` | string | ❌ No | `"GET"` | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `url` | string | ✅ Yes | - | Request URL (supports `{{variable}}` substitution) |
| `headers` | object | ❌ No | `{}` | Request headers (supports variable substitution) |
| `query_params` | object | ❌ No | `{}` | URL query parameters (supports variable substitution) |
| `body` | object | ❌ No | `null` | Request body for POST/PUT/PATCH (JSON, supports variable substitution) |
| `timeout_seconds` | int | ❌ No | `30` | Request timeout in seconds (max 120) |
| `retry` | object | ❌ No | see below | Retry configuration |
| `response_extraction` | array | ❌ No | `[]` | List of values to extract from response |
| `response_size_limit_bytes` | int | ❌ No | `15000` | Max response body size in bytes |
| `allowed_hosts` | array | ❌ No | `null` | Optional host allowlist for security |

#### Retry Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_retries` | int | `2` | Maximum retry attempts after initial failure |
| `initial_delay_ms` | int | `500` | Initial delay before first retry |
| `max_delay_ms` | int | `5000` | Maximum delay between retries |
| `backoff_multiplier` | float | `2.0` | Exponential backoff multiplier |

**Retry formula:** `delay = min(initial_delay * (backoff_multiplier ^ attempt), max_delay)`

#### Response Extraction Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | ✅ Yes | Dot notation path into JSON response |
| `variable_name` | string | ✅ Yes | Variable name to store extracted value |
| `default_value` | string | ❌ No | Fallback value if path not found or null |

**Path examples:**
- `data.user.name` → `response["data"]["user"]["name"]`
- `items.0.id` → `response["items"][0]["id"]`
- `meta.total_count` → `response["meta"]["total_count"]`

#### Behavior

1. **Loading Message**: If `static_text` is provided, it's delivered immediately (for user feedback)
2. **Variable Substitution**: `{{variable}}` placeholders in URL, headers, query params, and body are replaced
3. **HTTP Execution**: Request is made with retry logic and timeout
4. **Response Processing**: JSON response is parsed, values extracted into variables
5. **Internal Variables Set**:
   - `__api_success`: boolean - true if 2xx status
   - `__api_failed`: boolean - true if error/timeout/non-2xx
   - `__api_status_code`: int - HTTP status code
   - `__api_response_body`: string - response body (truncated if large)
   - `__api_error`: string - error message if failed
6. **Transition Evaluation**: Conditions like `api_success`, `api_failed` are evaluated

#### API-Specific Transition Conditions

| Condition | Description |
|-----------|-------------|
| `api_success` | API returned 2xx status code |
| `api_failed` | API returned non-2xx, timed out, or error |
| `api_status:CODE` | API returned specific status code (e.g., `api_status:404`) |
| `api_response_contains:VALUE` | Response body contains text (case-insensitive) |

#### Example: GET Request

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
    { "condition": "api_success", "target": "show_patient_info", "priority": 0 },
    { "condition": "api_status:404", "target": "patient_not_found", "priority": 1 },
    { "condition": "api_failed", "target": "api_error", "priority": 2 }
  ]
}
```

#### Example: POST Request

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
      "time": "{{selected_time}}",
      "provider_id": "{{provider_id}}"
    },
    "response_extraction": [
      { "path": "data.confirmation_code", "variable_name": "confirmation_code" },
      { "path": "data.appointment_id", "variable_name": "appointment_id" }
    ]
  },
  "transitions": [
    { "condition": "api_success", "target": "confirm_appointment", "priority": 0 },
    { "condition": "api_status:409", "target": "slot_unavailable", "priority": 1 },
    { "condition": "api_failed", "target": "booking_error", "priority": 2 }
  ]
}
```

#### Security Considerations

| Feature | Description |
|---------|-------------|
| **Host Allowlist** | Use `allowed_hosts` to restrict URLs to approved domains only |
| **Timeout Limits** | Max 120 seconds to prevent resource exhaustion |
| **Response Size** | Max 50KB (system limit) to prevent memory issues |
| **Log Masking** | Headers containing "auth" or "key" are masked in logs |
| **Variable Isolation** | Internal vars (`__api_*`) prefixed to avoid collision with user vars |

#### Error Handling

| Scenario | Behavior |
|----------|----------|
| Network timeout | Retries with exponential backoff, then fails |
| HTTP 4xx/5xx | Sets `__api_failed=true`, `__api_status_code` available |
| Invalid JSON response | Response stored as raw text, extraction skipped |
| Missing extraction path | Uses `default_value` or skips variable |
| URL validation failure | Fails immediately, no HTTP request made |
| Host not in allowlist | Fails immediately, no HTTP request made |

---

## Transition Conditions

Transitions move between nodes based on conditions. Conditions are evaluated in priority order (lower number = higher priority, like "1st priority", "2nd priority").

**Priority Evaluation:**
- Transitions are sorted by priority (ascending order)
- Lower priority number = evaluated first (priority 1 before priority 2)
- Transitions with the **same priority** maintain their **array order** (stable sort)
- First matching condition wins (others are skipped)

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
| `priority` | integer | ❌ No | `0` | Evaluation priority - lower number = checked first (1 before 2) |

**Example with same priority:**

```json
{
  "transitions": [
    {"condition": "contains:goodbye", "target": "closing", "priority": 1},
    {"condition": "contains:bye", "target": "closing", "priority": 1},
    {"condition": "contains:exit", "target": "closing", "priority": 1},
    {"condition": "max_turns:10", "target": "timeout", "priority": 2}
  ]
}
```

**Evaluation order:** goodbye → bye → exit (all priority 1, array order) → max_turns (priority 2)

### Condition Types

#### 1. Pattern-Based Conditions (Deterministic)

| Condition | Syntax | Description | Example |
|-----------|--------|-------------|---------|
| **Timeout** | `timeout:Xs` | Elapsed time in node | `timeout:10s` (10 seconds) |
| **Max Turns** | `max_turns:N` | Turn count in node | `max_turns:5` (5 exchanges) |
| **Contains** | `contains:keyword` | Case-insensitive keyword match | `contains:goodbye` |
| **User Responded** | `user_responded` | User has spoken at least once | `user_responded` |
| **Always** | `always` | Immediate transition (with `proactive: true` = auto-advance after speaking) | `always` |
| **Variables Extracted** | `variables_extracted:var1,var2` | All variables present and non-null | `variables_extracted:name,email` |
| **Extraction Failed** | `extraction_failed:var1,var2` | Any variable missing or null | `extraction_failed:name,email` |
| **Intent** | `intent:intent_id` | LLM batch classification (~100-150ms) | `intent:wants_basics` |
| **API Success** | `api_success` | API returned 2xx status (api_call nodes) | `api_success` |
| **API Failed** | `api_failed` | API error/timeout/non-2xx (api_call nodes) | `api_failed` |
| **API Status** | `api_status:CODE` | API returned specific status (api_call nodes) | `api_status:404` |
| **API Contains** | `api_response_contains:text` | Response body contains text (api_call nodes) | `api_response_contains:error` |

#### 2. Intent-Based Conditions (LLM Batch Classification)

For content-based routing where you need to classify user intent, use `intent:` conditions. A single LLM call classifies the user input against all defined intents (~100-150ms).

**Syntax:** `intent:{intent_id}` or `intent:no_match`

**Requirements:** Node must have `intents` dict defining the intents to match.

See [Intent-Based Transitions](#intent-based-transitions) under Standard Node for complete documentation.

**Note**: Semantic conditions (e.g., `user_satisfied`) have been removed. Use intent-based transitions for LLM-powered routing. See [Intent-Based Transitions](#intent-based-transitions) under Standard Node.

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

#### Proactive Output and Auto-Advance

The `proactive` field on nodes controls whether a node speaks immediately upon entry:

```json
{
  "id": "greeting",
  "proactive": true,
  "system_prompt": "Greet the user and ask for their name.",
  "transitions": [
    {
      "condition": "user_responded",
      "target": "extract_name"
    }
  ]
}
```

**Behavior Matrix:**

| `proactive` | Transition | Behavior |
|-------------|------------|----------|
| `true` | `always` | Speak → Continue immediately (auto-advance) |
| `true` | `user_responded` | Speak → Wait for user (speak-then-listen) |
| `false` | `user_responded` | Silent → Wait → LLM responds (default) |
| `false` | `always` | Silent → Continue immediately (processing node) |

**Auto-Advance Pattern (proactive: true + always):**

```json
{
  "id": "disclaimer",
  "proactive": true,
  "static_text": "This call may be recorded.",
  "transitions": [
    {
      "condition": "always",
      "target": "greeting"
    }
  ]
}
```

**Timing Details (for `proactive: true` + `always`):**
1. Bot finishes speaking (TTS completes)
2. 300ms technical delay to confirm no more audio chunks
3. Automatically transition to target node
4. User input during this time is added to history for next node

**Speak-Then-Listen Pattern (proactive: true + user_responded):**

```json
{
  "id": "greeting",
  "proactive": true,
  "system_prompt": "Greet the user and ask for their name.",
  "transitions": [
    {
      "condition": "user_responded",
      "target": "extract_name"
    }
  ]
}
```

**How it works:**
1. User enters `greeting` node
2. System detects `proactive: true` → triggers proactive LLM generation
3. LLM generates greeting → TTS speaks it
4. After speech completes → waits for `user_responded` transition to fire

**Common Mistake:** Using `always` without `proactive: true`:

```json
// ❌ WRONG: Bot won't speak - transitions immediately without LLM generation
{
  "proactive": false,
  "transitions": [{"condition": "always", "target": "next_node"}]
}

// ✅ CORRECT: Bot speaks first, then transitions after speech completes
{
  "proactive": true,
  "transitions": [{"condition": "always", "target": "next_node"}]
}

// ✅ ALSO CORRECT: Bot speaks first, then waits for user
{
  "proactive": true,
  "transitions": [{"condition": "user_responded", "target": "next_node"}]
}
```

**Summary:**
- `proactive: true` + `always` = "Speak first, then transition immediately"
- `proactive: true` + `user_responded` = "Speak first, then wait for user"
- `proactive: false` + `always` = "Transition immediately without speaking"
- `proactive: false` + `user_responded` = "Wait for user input before doing anything" (default)

#### Variable Extraction Success

```json
{
  "condition": "variables_extracted:first_name,last_name",
  "target": "personalized_node",
  "priority": 5
}
```

#### Intent Condition

```json
{
  "condition": "intent:wants_billing",
  "target": "billing_support",
  "priority": 3
}
```

**Note:** Requires `intents` dict defined on the node. See [Intent-Based Transitions](#intent-based-transitions).

### Transition Priority and Evaluation Order

Transitions are sorted by priority before evaluation. **Lower priority number = evaluated first** (like "1st priority", "2nd priority").

**Behavior:**
- Transitions sorted by `priority` field (ascending order)
- Lower number = higher priority (evaluated first)
- Transitions with **same priority** maintain array order (stable sort)
- **First matching condition triggers immediately** (others skipped)

**Example:**

```json
{
  "proactive": true,
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
      "condition": "max_turns:10",
      "target": "timeout",
      "priority": 2
    },
    {
      "condition": "always",
      "target": "next_node",
      "priority": 10
    }
  ]
}
```

**Evaluation order:** goodbye → bye (both priority 1, array order preserved) → max_turns (priority 2) → always (priority 10, auto-advances after bot speaks due to `proactive: true`)

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

## LLM Configuration (JSON-based)

LLM configuration references a provider entry in `llm_providers.json` which contains both credentials AND model configuration.

> ⚠️ **CRITICAL**: The `workflow.llm` section with `provider_id` **MUST exist** in the agent JSON for LLM responses to work. If this section is missing or `provider_id` is not set, the agent will fail to load.
> ```json
> {
>   "workflow": {
>     "llm": {
>       "provider_id": "azure-gpt-5-2"
>     }
>   }
> }
> ```

### Architecture

**Provider Registry (`config/llm_providers.json`):**
- Contains both credentials AND model configuration
- Each provider entry has: `type`, `api_key`, `model_id`, `model_name`, defaults
- Loaded at startup from file (dev) or AWS Parameter Store (prod)

**Agent JSON (`workflow.llm` section):**
- References a provider via `provider_id`
- Optionally overrides `temperature`, `max_tokens`, `service_tier`
- Simple and direct - no database resolution needed

### Agent JSON Schema

**Simple (use provider defaults):**
```json
{
  "workflow": {
    "llm": {
      "provider_id": "azure-gpt-5-2"
    },
    "nodes": [...]
  }
}
```

**With optional overrides:**
```json
{
  "workflow": {
    "llm": {
      "provider_id": "azure-gpt-5-2",
      "temperature": 0.7,
      "max_tokens": 200
    },
    "nodes": [...]
  }
}
```

### LLM Configuration Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Enable/disable LLM for this agent |
| `provider_id` | string | ✅ **Yes** | - | Provider ID from `llm_providers.json` or Parameter Store |
| `temperature` | float | ❌ No | Provider default | Override response randomness (0.0-2.0) |
| `max_tokens` | integer | ❌ No | Provider default | Override maximum tokens in response |
| `service_tier` | string | ❌ No | Provider default | Override service tier ("auto", "default", "flex") |

### Provider Configuration

Provider entries in `llm_providers.json` contain credentials and model:

```json
{
  "azure-gpt-5-2": {
    "type": "azure",
    "display_name": "Azure GPT-5.2",
    "api_key": "your-key",
    "base_url": "https://your-resource.openai.azure.com",
    "api_version": "2024-12-01-preview",
    "model_id": "gpt-5.2",
    "model_name": "GPT 5.2",
    "temperature": 1.0,
    "max_tokens": 150,
    "service_tier": "auto"
  }
}
```

**See also:** [LLM Providers Guide](./LLM_PROVIDERS.md) for complete setup instructions.

### Per-Node LLM Override

Individual nodes can override parameters using `llm_override`:

```json
{
  "nodes": [
    {
      "id": "simple_response",
      "type": "standard",
      "name": "Quick Response",
      "system_prompt": "Give a brief answer.",
      "llm_override": {
        "temperature": 0.5,
        "max_tokens": 100
      }
    },
    {
      "id": "complex_reasoning",
      "type": "standard",
      "name": "Complex Analysis",
      "system_prompt": "Analyze the situation carefully.",
      "llm_override": {
        "temperature": 0.8,
        "max_tokens": 300
      }
    }
  ]
}
```

### llm_override Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `temperature` | float | ❌ No | Agent default | Override temperature (0.0-2.0) |
| `max_tokens` | integer | ❌ No | Agent default | Override max tokens |
| `service_tier` | string | ❌ No | Agent default | Override service tier ("auto", "default", "flex") |

### Extraction LLM Configuration

Variable extraction and intent classification use a separate LLM configuration via `extraction_llm`:

```json
{
  "workflow": {
    "llm": {
      "provider_id": "azure-gpt-5-2"
    },
    "extraction_llm": {
      "enabled": true,
      "provider_id": "azure-gpt-5-mini"
    }
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `false` | Enable separate extraction LLM |
| `provider_id` | string | ⚠️ When enabled | - | Provider ID with `"extraction"` in `usage_types` |
| `max_tokens` | integer | ❌ No | Provider default | Override max tokens |

**Why use a separate extraction LLM?**
- **Cost efficiency**: Use a cheaper/faster model (e.g., GPT-5-mini) for extraction tasks
- **Model defaults**: Extraction LLM does not pass temperature -- models use their built-in defaults
- **Performance**: Smaller models have lower latency for simple classification tasks

If `extraction_llm` is not configured, the main conversation LLM is used for extraction.

### Service Tier

The `service_tier` parameter in LLM config controls resource allocation with OpenAI:

| Value | Description | Use Case |
|-------|-------------|----------|
| `"auto"` (default) | OpenAI manages resource allocation | Standard usage |
| `"default"` | Standard tier | Baseline performance |
| `"flex"` | Flexible tier | Cost optimization |

**Note**: Service tier applies to your OpenAI account tier. Not available with Azure or custom endpoints.

### Temperature Guidelines

Temperature controls response randomness:

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| `0.0` | Deterministic - always same response | Variable extraction, intent classification |
| `0.5` - `0.7` | Focused - mostly consistent | Medical information, critical data |
| `0.8` - `1.0` (default) | Balanced | Natural conversation, general purpose |
| `1.0` - `1.5` | Creative - varied responses | Personalized greetings, sales calls |
| `1.5` - `2.0` | Very creative - highly unpredictable | Brainstorming (NOT for critical tasks) |

**Note**: Temperature only applies to the conversation LLM. Extraction and analysis LLMs do not pass temperature -- they use the model's built-in defaults.

---

## Voice/TTS Configuration (Database FK + JSON Tuning)

Voice/TTS configuration uses a split approach:
- **Voice selection** is via `voice_config_id` FK in `agent_config_versions` table
- **TTS tuning parameters** are stored in agent JSON (`workflow.tts` section)

> ⚠️ **CRITICAL**: The `workflow.tts` section **MUST exist** in the agent JSON for TTS to function. If this section is entirely missing, TTS will be **disabled** and the bot will not speak. At minimum, include:
> ```json
> {
>   "workflow": {
>     "tts": {
>       "enabled": true
>     }
>   }
> }
> ```

This allows:
- **Referential integrity** - FK prevents referencing non-existent voices
- **Flexible tuning** - Different agents can use same voice with different settings
- **Centralized voice management** - Add new voices without changing agent configs

### Architecture

**Database (`agent_config_versions.voice_config_id` FK):**
- Links agent to a voice from the `voice_configs` catalog
- Set during database seeding or via admin tools
- Provides referential integrity

**Agent JSON (`workflow.tts` section):**
- TTS tuning parameters only (stability, similarity_boost, etc.)
- `voice_name` field is used only during seeding (ignored at runtime)

**System-Level Voice Catalog (`voice_configs` table):**
- Maps friendly `voice_name` to actual ElevenLabs `voice_id`
- Examples: `george` → `JBFqnCBsd6RMkjVDRZzb`, `rachel` → `21m00Tcm4TlvDq8ikWAM`
- ConfigManager loads voice by ID (via FK)

### Agent JSON Schema

```json
{
  "workflow": {
    "tts": {
      "enabled": true,
      "voice_name": "george",
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true,
      "enable_ssml_parsing": false,
      "pronunciation_dictionaries_enabled": true,
      "pronunciation_dictionary_ids": [],
      "aggregate_sentences": true
    },
    "nodes": [...]
  }
}
```

> **Note**: The `voice_name` field in JSON is used only during database seeding to link the agent to the correct voice. At runtime, voice is loaded via `voice_config_id` FK in the database.

### TTS Configuration Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | ❌ No | `true` | Enable/disable TTS for this agent |
| `voice_name` | string | ❌ Seed | - | Voice name for seeding (runtime uses DB FK) |
| `stability` | decimal | ❌ No | `0.5` | Voice stability (0.0-1.0) |
| `similarity_boost` | decimal | ❌ No | `0.75` | Similarity boost (0.0-1.0) |
| `style` | decimal | ❌ No | `0.0` | Style exaggeration (0.0-1.0) |
| `use_speaker_boost` | boolean | ❌ No | `true` | Enable speaker boost |
| `enable_ssml_parsing` | boolean | ❌ No | `false` | Parse SSML tags |
| `pronunciation_dictionaries_enabled` | boolean | ❌ No | `true` | Use pronunciation dictionaries |
| `pronunciation_dictionary_ids` | array | ❌ No | `[]` | Dictionary IDs from ElevenLabs |
| `aggregate_sentences` | boolean | ❌ No | `true` | When `true` (default), splits text at sentence boundaries (periods, !, ?) before sending to TTS - each sentence is a separate TTS request. When `false`, buffers the entire LLM response and sends it as a single TTS request for more consistent voice prosody across multi-sentence utterances like "Thank you for calling. Have a wonderful day!" |

### Database Schema

```sql
-- System-level voice definitions (catalog)
voice_configs:
  - id (UUID): Primary key
  - voice_name (unique): Friendly name (e.g., "george", "rachel")
  - provider: TTS provider (e.g., "elevenlabs")
  - voice_id: Actual provider voice ID (e.g., ElevenLabs voice ID)
  - model: Default TTS model (e.g., "eleven_turbo_v2_5")
  - description: Human-readable description

-- Agent config versions link to voice via FK
agent_config_versions:
  - voice_config_id (FK): Reference to voice_configs.id
```

### Available Voices (Default Seed)

| Voice Name | Provider | Voice ID | Description |
|------------|----------|----------|-------------|
| `george` | elevenlabs | JBFqnCBsd6RMkjVDRZzb | Warm resonance that instantly captivates listener |
| `rachel` | elevenlabs | 21m00Tcm4TlvDq8ikWAM | Matter of fact, personable woman |
| `rajeev` | elevenlabs | bQlVotXwlI4K7o8gDQWq | Rajeev - CEO of Higgs Boson Inc |
| `melissa` | elevenlabs | XJIwaspdTAhv8Z6ijr8x | Melissa - Senior Implementation Manager, Higgs Boson Inc |
| `beth` | elevenlabs | 8N2ng9i2uiUWqstgmWlH | Beth - Gentle and nurturing |
| `pete` | elevenlabs | ChO6kqkVouUn0s7HMunx | Pete - Natural conversations |
| `eric` | elevenlabs | egTToTzW6GojvddLj0zd | Eric - Calm and youthful |

> **Note**: Administrators can add new voices to `voice_configs` table. They become immediately available for use in agent configurations.

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
4. Add to `pronunciation_dictionary_ids` array in agent JSON

### Configuration Management

Voice configs are loaded via ConfigManager:
- Agent's `voice_config_id` FK determines which voice to use
- Voice config loaded by ID from `voice_configs` table
- Redis caching for sub-5ms loads
- Manual cache invalidation via `ConfigManager.invalidate_voice_config_cache(voice_name)`

### Changing Voice for an Agent

To change an agent's voice:
1. Look up the desired voice's ID from `voice_configs` table
2. Update `agent_config_versions.voice_config_id` to the new voice ID
3. Invalidate agent cache: `ConfigManager.invalidate_cache(tenant_id, agent_id)`

### Example Agent with TTS Configuration

```json
{
  "agent": {
    "id": "support_agent",
    "name": "Customer Support Agent"
  },
  "workflow": {
    "initial_node": "greeting",
    "llm": {
      "enabled": true,
      "model_name": "gpt4.1",
      "temperature": 1.0,
      "max_tokens": 150
    },
    "tts": {
      "enabled": true,
      "voice_name": "george",
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true,
      "enable_ssml_parsing": false,
      "pronunciation_dictionaries_enabled": true,
      "pronunciation_dictionary_ids": [],
      "aggregate_sentences": true
    },
    "nodes": [...]
  }
}
```

---

## STT Configuration (Environment-Based)

Speech-to-Text (Deepgram Flux v2) is configured exclusively via environment variables. This is a system-wide setting that cannot be customized per-agent.

### Environment Variables

```bash
# .env file
DEEPGRAM_API_KEY=your_api_key_here

# Deepgram model (default: flux-general-en)
DEEPGRAM_MODEL=flux-general-en

# Audio sample rate in Hz (default: 8000 for Twilio)
AUDIO_SAMPLE_RATE=8000

# Optional: Advanced Flux v2 end-of-turn parameters
# Leave unset to use Deepgram defaults
DEEPGRAM_EAGER_EOT_THRESHOLD=0.8
DEEPGRAM_EOT_THRESHOLD=0.9
DEEPGRAM_EOT_TIMEOUT_MS=1000
```

### Fields

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEEPGRAM_MODEL` | string | `"flux-general-en"` | Deepgram model |
| `AUDIO_SAMPLE_RATE` | integer | `8000` | Audio sample rate (Hz) |
| `DEEPGRAM_EAGER_EOT_THRESHOLD` | float | `null` | Eager end-of-turn threshold |
| `DEEPGRAM_EOT_THRESHOLD` | float | `null` | End-of-turn threshold |
| `DEEPGRAM_EOT_TIMEOUT_MS` | integer | `null` | End-of-turn timeout (ms) |

**Note**: The `stt` section in agent JSON files is no longer supported. STT configuration must be set via environment variables.

---

## RAG Configuration

Retrieval-Augmented Generation (RAG) provides knowledge base integration for agents.

### Database-Based Configuration

> **Important:** RAG configuration is stored in the **database**, NOT in the agent JSON file. This allows:
> - Shared RAG configs across multiple agents
> - Independent versioning of RAG settings
> - Easier RAG config management and updates
> - Node-level overrides remain in the agent JSON

### Database Tables

RAG configuration uses two database tables:

**`rag_configs`** - Base RAG configuration entity (tenant-scoped)
```sql
- id (UUID)
- tenant_id (FK → tenants)
- name (unique per tenant)
- description
- is_active
- created_at, updated_at
```

**`rag_config_versions`** - Versioned RAG configurations
```sql
- rag_config_id (FK → rag_configs)
- version (unique per rag_config)
- search_mode, top_k, relevance_filter
- rrf_k, vector_weight, fts_weight, hnsw_ef_search
- bedrock_model, bedrock_dimensions
- faiss_index_path, faiss_mapping_path, sqlite_db_path
- is_active, created_by, notes
```

### Agent-RAG Linking

The `agent_config_versions` table has two columns for RAG:

| Column | Type | Description |
|--------|------|-------------|
| `rag_enabled` | boolean | Enable/disable RAG for this agent version |
| `rag_config_id` | UUID (FK) | Reference to `rag_configs` table (nullable) |

**How it works:**
1. Create a RAG config in `rag_configs` table
2. Create a version in `rag_config_versions` with settings
3. Link agent to RAG config via `agent_config_versions.rag_config_id`
4. Enable RAG with `agent_config_versions.rag_enabled = true`

### RAG Config Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `search_mode` | string | `"hybrid"` | Search mode: `"vector"`, `"fts"`, `"hybrid"` |
| `top_k` | integer | `5` | Number of chunks to retrieve |
| `relevance_filter` | boolean | `true` | Only query for questions/info requests |
| `rrf_k` | integer | `60` | RRF fusion constant |
| `vector_weight` | decimal | `0.6` | Vector search weight (hybrid mode) |
| `fts_weight` | decimal | `0.4` | FTS weight (hybrid mode) |
| `hnsw_ef_search` | integer | `64` | FAISS HNSW search parameter |
| `bedrock_model` | string | `"amazon.titan-embed-text-v2:0"` | Bedrock embedding model |
| `bedrock_dimensions` | integer | `1024` | Embedding dimensions |
| `faiss_index_path` | string | `"data/faiss/index.faiss"` | FAISS index file |
| `faiss_mapping_path` | string | `"data/faiss/mapping.pkl"` | FAISS metadata file |
| `sqlite_db_path` | string | `"data/metadata/healthcare_rag.db"` | SQLite FTS5 database |

### Node-Level RAG Overrides (Agent JSON)

While global RAG configuration is in the database, **node-level overrides** remain in the agent JSON:

| Parameter | Database Default | Node Override | Description |
|-----------|-----------------|---------------|-------------|
| `enabled` | from database | ✅ Yes | Enable/disable RAG per node |
| `search_mode` | from database | ✅ Yes | Search strategy: vector, fts, hybrid |
| `top_k` | from database | ✅ Yes | Number of chunks retrieved |
| `rrf_k` | from database | ✅ Yes | RRF fusion constant (hybrid mode) |
| `vector_weight` | from database | ✅ Yes | Semantic search weight (hybrid mode) |
| `fts_weight` | from database | ✅ Yes | Keyword search weight (hybrid mode) |
| `relevance_filter` | from database | ❌ No | Database only - query intent detection |
| `faiss_index_path` | from database | ❌ No | Database only - FAISS index location |
| `faiss_mapping_path` | from database | ❌ No | Database only - FAISS mapping location |
| `sqlite_db_path` | from database | ❌ No | Database only - SQLite FTS5 database |
| `hnsw_ef_search` | from database | ❌ No | Database only - FAISS search parameter |
| `bedrock_model` | from database | ❌ No | Database only - Embedding model |
| `bedrock_dimensions` | from database | ❌ No | Database only - Embedding dimensions |

**✅ = Supports node-level override** | **❌ = Database configuration only**

### Search Parameters Explained

#### Search Modes

| Mode | Description | When to Use | Speed |
|------|-------------|-------------|-------|
| `"vector"` | Pure semantic search using embeddings | Conceptual questions, fuzzy matching | Fast |
| `"fts"` | Pure keyword search (SQLite FTS5) | Exact terms, API names, technical jargon | Fastest |
| `"hybrid"` | Combines vector + FTS using RRF | Best accuracy, balanced approach | Moderate |

**Examples:**
```json
// Conceptual queries: "What are the benefits of GLP-1?"
{"search_mode": "vector"}

// Technical queries: "What is the IndexHNSWFlat parameter?"
{"search_mode": "fts"}

// General purpose: combines both approaches
{"search_mode": "hybrid"}
```

#### Hybrid Search Parameters

When `search_mode: "hybrid"`, three parameters control how results are fused:

**`rrf_k` (Reciprocal Rank Fusion Constant)**
- Default: `60`
- Range: `1-200` (typical: `40-100`)
- Higher values = more balanced fusion between vector and FTS results
- Lower values = top-ranked results dominate more strongly

**`vector_weight` (Semantic Search Weight)**
- Default: `0.6` (60%)
- Range: `0.0-1.0`
- Controls influence of semantic/embedding-based search
- Higher = favors conceptual similarity

**`fts_weight` (Keyword Search Weight)**
- Default: `0.4` (40%)
- Range: `0.0-1.0`
- Controls influence of exact keyword matching
- Higher = favors precise term matches

**Best Practices:**
- `vector_weight + fts_weight` should sum to `1.0` for balanced results
- Adjust based on your use case (see patterns below)

#### Weight Configuration Patterns

**Semantic-Focused (Conceptual Questions)**
```json
{
  "vector_weight": 0.7,
  "fts_weight": 0.3,
  "rrf_k": 60
}
```
Use for: Educational content, explanations, "how does X work" questions

**Keyword-Focused (Technical Lookups)**
```json
{
  "vector_weight": 0.3,
  "fts_weight": 0.7,
  "rrf_k": 60
}
```
Use for: API documentation, error codes, configuration parameters

**Balanced (General Purpose)**
```json
{
  "vector_weight": 0.5,
  "fts_weight": 0.5,
  "rrf_k": 60
}
```
Use for: Mixed content types, general Q&A

**Highly Semantic (Research/Education)**
```json
{
  "vector_weight": 0.8,
  "fts_weight": 0.2,
  "rrf_k": 80
}
```
Use for: Medical education, complex topics, nuanced questions

#### Top-K Parameter

**`top_k`** - Number of knowledge chunks retrieved:
- Default: `5`
- Range: `1-50` (typical: `3-10`)
- More chunks = more context but higher latency and LLM costs
- Fewer chunks = faster but may miss relevant information

**Guidelines:**
- `3-5`: Simple questions with focused topics
- `5-10`: Complex questions requiring multiple sources
- `10+`: Comprehensive research or when precision is critical

### Per-Node RAG Override

Nodes can override database RAG settings. When a node specifies RAG config, specified fields **completely override** the database config for those fields:

```json
{
  "workflow": {
    "nodes": [
      {
        "id": "greeting",
        "name": "Greeting",
        "system_prompt": "Welcome the user.",
        "rag": {
          "enabled": false       // ← Disable RAG for greeting
        }
      },
      {
        "id": "faq_node",
        "name": "FAQ Node",
        "system_prompt": "Answer questions using knowledge base.",
        "rag": {
          "enabled": true,          // ← Enables RAG for this node
          "search_mode": "vector",  // ← Uses vector search (not hybrid)
          "top_k": 10,              // ← Returns 10 chunks
          "rrf_k": 80,              // ← Custom RRF constant
          "vector_weight": 0.8,     // ← 80% vector weight
          "fts_weight": 0.2         // ← 20% FTS weight
        }
      }
    ]
  }
}
```

**Override Behavior:**
- Node-level settings take precedence over database configuration
- Only specified fields override (unspecified fields use database defaults)
- If node-level `enabled: false`, RAG disabled for that node only
- Each node can have different RAG behavior
- Hybrid search weights update dynamically when transitioning between nodes

**Field Compatibility:**

Node-level RAG overrides support: `enabled`, `search_mode`, `top_k`, `rrf_k`, `vector_weight`, `fts_weight`

Other RAG fields (file paths, bedrock settings, `relevance_filter`) **cannot** be overridden per-node and always use database configuration.

**Weight Validation:**
- `vector_weight` + `fts_weight` should sum to 1.0 for balanced hybrid search
- Weights only apply when `search_mode` is `"hybrid"`
- Common patterns:
  - Semantic-focused: `vector_weight: 0.7, fts_weight: 0.3`
  - Keyword-focused: `vector_weight: 0.3, fts_weight: 0.7`
  - Balanced: `vector_weight: 0.5, fts_weight: 0.5`

### Complete Multi-Node RAG Example

This example shows a technical support agent with different RAG configurations per node. RAG is enabled in the database, and each node overrides search parameters:

```json
{
  "agent": {
    "id": "tech_support",
    "name": "API Documentation Support"
  },
  "workflow": {
    "initial_node": "greeting",
    "nodes": [
      {
        "id": "greeting",
        "type": "standard",
        "name": "Greeting",
        "system_prompt": "Greet the user and ask what they need help with.",
        "rag": {
          "enabled": false
        },
        "transitions": [
          {"condition": "user_responded", "target": "triage"}
        ]
      },
      {
        "id": "triage",
        "type": "standard",
        "name": "Question Triage",
        "system_prompt": "Understand the user's question and route to appropriate help.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 5,
          "vector_weight": 0.6,
          "fts_weight": 0.4
        },
        "intents": {
          "api_reference": {"description": "User asking about API details, methods, parameters"},
          "conceptual": {"description": "User asking conceptual or how-it-works questions"},
          "error": {"description": "User asking about errors or troubleshooting"}
        },
        "transitions": [
          {"condition": "intent:api_reference", "target": "api_lookup"},
          {"condition": "intent:conceptual", "target": "education"},
          {"condition": "intent:error", "target": "error_troubleshooting"},
          {"condition": "intent:no_match", "target": "education"}
        ]
      },
      {
        "id": "api_lookup",
        "type": "standard",
        "name": "API Reference Lookup",
        "system_prompt": "Provide precise API documentation and parameter details.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 3,
          "vector_weight": 0.3,
          "fts_weight": 0.7,
          "rrf_k": 50
        },
        "transitions": [
          {"condition": "contains:goodbye", "target": "end"}
        ]
      },
      {
        "id": "education",
        "type": "standard",
        "name": "Conceptual Education",
        "system_prompt": "Explain concepts and best practices in detail.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 10,
          "vector_weight": 0.8,
          "fts_weight": 0.2,
          "rrf_k": 80
        },
        "transitions": [
          {"condition": "contains:goodbye", "target": "end"}
        ]
      },
      {
        "id": "error_troubleshooting",
        "type": "standard",
        "name": "Error Code Lookup",
        "system_prompt": "Help diagnose and resolve error codes.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 7,
          "vector_weight": 0.4,
          "fts_weight": 0.6,
          "rrf_k": 60
        },
        "transitions": [
          {"condition": "contains:goodbye", "target": "end"}
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

> **Note:** Global RAG configuration (file paths, bedrock settings, relevance_filter) is stored in the database via `rag_configs` and `rag_config_versions` tables. Voice/TTS and phone configs are also database-backed via `voice_config_id` and related tables. LLM configuration is stored in the agent JSON (`workflow.llm` section).

**Node-by-Node RAG Behavior:**

| Node | RAG Enabled | Search Mode | Top K | Vector:FTS | Purpose |
|------|-------------|-------------|-------|------------|---------|
| `greeting` | ❌ No | - | - | - | No knowledge needed for greeting |
| `triage` | ✅ Yes | hybrid | 5 | 60:40 | Balanced search for routing |
| `api_lookup` | ✅ Yes | hybrid | 3 | 30:70 | Keyword-heavy for exact API names |
| `education` | ✅ Yes | hybrid | 10 | 80:20 | Semantic-heavy for concepts |
| `error_troubleshooting` | ✅ Yes | hybrid | 7 | 40:60 | Balanced with keyword bias |

**How It Works:**
1. Agent has `rag_enabled=true` and `rag_config_id` set in database
2. User enters `greeting` node - Node override disables RAG
3. Transitions to `triage` - RAG uses balanced 60:40 weights
4. Based on topic, routes to specialized node
5. Each specialized node automatically reconfigures RAG weights
6. `api_lookup` uses 30:70 for exact term matching
7. `education` uses 80:20 for conceptual understanding
8. Weights update dynamically on each transition

---

## Phone Number Pool (Database-Backed)

Phone numbers are managed in the database as a pool that can be assigned to agents. This allows:
- **Phone number pools** per tenant
- **Dynamic assignment** - same phone can be reassigned to different agents
- **Centralized management** without modifying agent configs

### Database Schema

Phone number management uses two tables:
- `phone_configs` - Phone number pool (tenant-scoped, contains actual phone numbers)
- `phone_mappings` - Links phone numbers to agents

**`phone_configs` Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Auto | Primary key |
| `tenant_id` | UUID | ✅ Yes | Tenant that owns this phone number |
| `phone_number` | string | ✅ Yes | Phone number in E.164 format (e.g., `+17708304765`) |
| `name` | string | ❌ No | Optional label for this phone number |
| `description` | string | ❌ No | Optional description |
| `is_active` | boolean | ❌ No | Whether this phone number is active (default: true) |

**`phone_mappings` Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone_config_id` | UUID | ✅ Yes | Primary key, FK to `phone_configs` |
| `agent_id` | UUID | ✅ Yes | Agent this phone is mapped to |
| `tenant_id` | UUID | ✅ Yes | Tenant for validation |

### How Phone Mapping Works

1. Phone numbers are added to `phone_configs` table (the pool)
2. `phone_mappings` links a phone number to an agent
3. When a call comes in, system looks up phone number → agent mapping
4. Phone can be reassigned to different agent by updating `phone_mappings`

### Recording Configuration

Recording is now split between agent JSON and environment variables.

**Default Behavior:** Recording is **enabled by default** for compliance purposes. To disable recording for a specific agent, explicitly set `enabled: false`.

**Per-Agent Setting (workflow JSON):**
```json
{
  "workflow": {
    "recording": {
      "enabled": false
    }
  }
}
```

Only `enabled` is configurable per-agent. This determines whether recording starts for calls to this agent. If omitted, recording is enabled.

**System-Wide Settings (.env file):**
```bash
# Recording track: "inbound", "outbound", or "both"
RECORDING_TRACK=both

# Recording channels: "mono" (mixed) or "dual" (separate)
RECORDING_CHANNELS=dual
```

Track and channels are system-wide because they affect Twilio's recording infrastructure configuration.

**Note**: Requires Twilio external S3 storage configuration. See `docs/RECORDING_CONFIG.md` for setup.

### Webhook Configuration

Webhooks deliver call lifecycle events to customer endpoints in **Retell AI-compatible format**. This enables seamless migration for customers familiar with Retell's API.

**Per-Agent Setting (workflow JSON):**
```json
{
  "workflow": {
    "webhook": {
      "enabled": true,
      "url": "https://api.example.com/webhooks/calls",
      "events": ["call_started", "call_ended", "call_analyzed"],
      "timeout_seconds": 10,
      "auth": {
        "type": "bearer",
        "secret": "your-webhook-secret-token"
      },
      "retry": {
        "max_retries": 3,
        "initial_delay_ms": 1000,
        "backoff_multiplier": 2.0
      },
      "include_transcript": true,
      "include_latency_metrics": true
    }
  }
}
```

#### Webhook Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable webhooks for this agent |
| `url` | string | `""` | Webhook endpoint URL (HTTPS recommended) |
| `events` | array | `["call_started", "call_ended", "call_analyzed"]` | Events to deliver |
| `timeout_seconds` | integer | `10` | Request timeout (Retell-compatible default) |
| `auth` | object | `{type: "none"}` | Authentication configuration |
| `retry` | object | See below | Retry configuration |
| `include_transcript` | boolean | `true` | Include transcript in `call_ended` payload |
| `include_latency_metrics` | boolean | `true` | Include latency percentiles in `call_ended` payload |

#### Authentication Options

**No Authentication:**
```json
{ "auth": { "type": "none" } }
```

**Bearer Token:**
```json
{ "auth": { "type": "bearer", "secret": "your-token" } }
```
Sends `Authorization: Bearer your-token` header.

**HMAC-SHA256 Signature:**
```json
{ "auth": { "type": "hmac", "secret": "your-secret-key" } }
```
Sends `X-Webhook-Signature: sha256=<signature>` and `X-Webhook-Timestamp` headers.

#### Retry Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_retries` | integer | `3` | Maximum retry attempts after initial failure |
| `initial_delay_ms` | integer | `1000` | Initial retry delay in milliseconds |
| `max_delay_ms` | integer | `10000` | Maximum retry delay |
| `backoff_multiplier` | float | `2.0` | Exponential backoff multiplier |

#### Events

| Event | Trigger | Key Payload Fields |
|-------|---------|-------------------|
| `call_started` | Call connects | call_id, agent_id, direction, from/to_number, timestamps |
| `call_ended` | Call finalizes | Above + transcript, latency metrics, collected_dynamic_variables, disconnection_reason |
| `call_analyzed` | Post-call analysis completes | call_id + sentiment, summary, success, custom_analysis_data |

**Note**: See `docs/WEBHOOK_GUIDE.md` for complete payload reference and testing instructions.

### Configuration Management

Phone configs are loaded via ConfigManager:
- Redis caching for sub-5ms loads
- `get_agent_for_phone(phone_number)` looks up agent via PhoneConfig → PhoneMapping

### Seeding Phone Numbers

When running `seed_database.py`, phone numbers from `phone_mapping.json` are:
1. Added to `phone_configs` table (phone number pool)
2. Linked to agents via `phone_mappings` table

**Note**: The `auto_hangup` feature has been removed as it was not implemented.

---

## Logging Configuration

⚠️ **NOT SUPPORTED - Use Environment Variable**

**Per-agent logging is not supported.** Logging is controlled globally via the `LOG_LEVEL` environment variable for all agents.

### How to Control Logging

Use the `LOG_LEVEL` environment variable:

```bash
# Set in .env file
LOG_LEVEL=DEBUG

# Or pass directly
LOG_LEVEL=DEBUG uv run uvicorn app.main:app --reload
```

### Logging Levels

| Level | Output | Use Case |
|-------|--------|----------|
| `DEBUG` | Detailed debug info, SQL queries, LLM details, pipeline frames | Development, troubleshooting |
| `INFO` | Key events, transitions, metrics, user/bot messages | Production, normal operation (default) |
| `WARNING` | Problems and warnings only | Production monitoring |
| `ERROR` | Errors only | Silent operation |

**Note**: Do not include `logging` section in agent JSON files - it is not supported and will be ignored if present.

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
  }
}
```

> **Note:** LLM configuration is in the agent JSON (`workflow.llm` section). Voice/TTS and phone configurations are set via the database. See [LLM Configuration](#llm-configuration-json-based), [Voice/TTS Configuration](#voicetts-configuration-database-backed), and [Phone Number Pool](#phone-number-pool-database-backed).

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
        "proactive": true,
        "interruptions_enabled": false,
        "static_text": "This call may be recorded. The survey takes 2 minutes.",
        "transitions": [
          {
            "condition": "always",
            "target": "greeting"
          }
        ]
      },
      {
        "id": "greeting",
        "type": "standard",
        "name": "Greeting",
        "proactive": true,
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
        "proactive": true,
        "interruptions_enabled": false,
        "system_prompt": "Thank {{user_name}} for their time and their {{rating}} rating.",
        "transitions": [
          {
            "condition": "always",
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
  }
}
```

> **Note:** LLM configuration is in the agent JSON (`workflow.llm` section). Voice/TTS and phone configurations are set via the database.

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
        "proactive": true,
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
          "top_k": 8,
          "vector_weight": 0.75,
          "fts_weight": 0.25,
          "rrf_k": 70
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
        "proactive": true,
        "interruptions_enabled": false,
        "system_prompt": "Thank the user and remind them to consult their healthcare provider.",
        "rag": {
          "enabled": false
        },
        "transitions": [
          {
            "condition": "always",
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
  }
}
```

> **Note:** This agent requires:
> - `workflow.llm` section in agent JSON with `enabled: true` and appropriate model selection
> - `rag_enabled=true` and `rag_config_id` set in the database pointing to a RAG config with appropriate paths for medical knowledge base
> - `voice_config_id` set in the database with pronunciation dictionaries enabled for medical terms

**RAG Configuration Notes:**
- **Greeting node**: RAG disabled - no knowledge needed for welcome message
- **Education node**: Uses semantic-focused weights (75% vector / 25% FTS)
  - Higher `top_k: 8` to retrieve more medical information
  - Higher `vector_weight: 0.75` for conceptual medical questions
  - Higher `rrf_k: 70` for balanced fusion of diverse medical sources
- **Closing node**: RAG disabled - standard farewell message
- **Database config**: Contains file paths, bedrock settings, and global relevance_filter

This configuration optimizes for medical education where users ask conceptual questions like:
- "What are the benefits of GLP-1 medications?"
- "How do these medications work?"
- "What are the side effects?"

The semantic-heavy weights ensure the system understands the *meaning* of medical terms rather than just matching keywords.

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

## Configuration Type Reference

This section provides a comprehensive reference for all workflow configuration types. These types are also available in the `workflow_config_types` database table for client UI applications.

### Node Types

| Type | Display Name | Description | Required Fields |
|------|--------------|-------------|-----------------|
| `standard` | Standard Node | Regular conversation node with LLM-generated or static text responses. Must have either `system_prompt` OR `static_text`, not both. | `id`, `name`, + (`system_prompt` OR `static_text`) |
| `retrieve_variable` | Variable Extraction Node | Extracts structured data from conversation history using LLM. Supports batch (`variables` array) or single variable extraction. Transitions evaluated automatically after extraction. | `id`, `name`, `type`, + (`variables` OR `variable_name`+`extraction_prompt`) |
| `end_call` | End Call Node | Terminal node that terminates the call. No transitions allowed. Requires Twilio credentials in environment. | `id`, `name`, `type` |

### Transition Conditions

#### Pattern-Based Conditions (Deterministic, ~0ms)

| Condition | Syntax | Description | Applicable To |
|-----------|--------|-------------|---------------|
| `timeout` | `timeout:{seconds}s` | Triggers after specified seconds of inactivity. Supports decimals. | standard, retrieve_variable |
| `max_turns` | `max_turns:{count}` | Triggers after N user inputs in current node. | standard |
| `contains` | `contains:{keyword}` | Triggers if user input contains keyword (case-insensitive). | standard |
| `user_responded` | `user_responded` | Triggers after any non-empty user input. | standard |
| `always` | `always` | Immediate transition. With `proactive: true`, fires ~300ms after bot stops speaking; without `proactive`, fires immediately. | standard, retrieve_variable |
| `variables_extracted` | `variables_extracted:{var1,var2}` | True if ALL specified variables are present and non-null. | retrieve_variable |
| `extraction_failed` | `extraction_failed:{var1,var2}` | True if ANY specified variable is missing or null. | retrieve_variable |
| `api_success` | `api_success` | API returned 2xx status code. | api_call |
| `api_failed` | `api_failed` | API returned non-2xx, timed out, or error. | api_call |
| `api_status` | `api_status:{code}` | API returned specific status code. | api_call |
| `api_response_contains` | `api_response_contains:{text}` | Response body contains text (case-insensitive). | api_call |

#### Intent-Based Conditions (LLM Batch Classification, ~100-150ms)

| Condition | Syntax | Description | Applicable To |
|-----------|--------|-------------|---------------|
| `intent` | `intent:{intent_id}` | LLM batch classification against node's `intents` dict. Single LLM call for all intents. Use `intent:no_match` for fallback when no intent matches with sufficient confidence. | standard |

**Configuration:** Requires `intents` dict and optional `intent_config` in node. See [Intent-Based Transitions](#intent-based-transitions).

**Note:** Semantic conditions (e.g., `user_satisfied`, `topic_is:X`) have been removed. Use intent-based transitions instead.

### Action Types

| Type | Syntax | Description | Applicable To |
|------|--------|-------------|---------------|
| `log` | `log:{message}` | Logs message with variable substitution (`{{variable}}`). Use `log:variables` to log all extracted variables as JSON. | standard, retrieve_variable, end_call |
| `webhook` | `webhook:{url}` | POSTs JSON payload (action_type, node_id, timestamp, session_id, collected_data) to URL. Async, 10s timeout. | standard, retrieve_variable, end_call |
| `hangup` | `hangup` | Terminates call via Twilio REST API. Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN. | standard, end_call |
| `custom` | `custom:{function_name}` | Executes registered Python function. Receives context: node_id, node_name, collected_data, session_id, timestamp. | standard, retrieve_variable, end_call |

### RAG Search Modes

| Mode | Display Name | Description |
|------|--------------|-------------|
| `vector` | Vector Search | Semantic similarity search using FAISS and Bedrock embeddings. Best for conceptual/meaning-based queries. |
| `fts` | Full-Text Search | Keyword-based search using SQLite FTS5. Best for exact keyword matching, technical terms, proper nouns. |
| `hybrid` | Hybrid Search | Combines vector and FTS results using Reciprocal Rank Fusion (RRF). Configurable weights (default: 60% vector, 40% FTS). |

### Workflow Settings

| Setting | Display Name | Description |
|---------|--------------|-------------|
| `global_intents` | Global Intents | Workflow-wide "always listening" intents that can trigger from any node. Use for topic switching, emergency exits, or cross-cutting concerns. |
| `post_call_analysis` | Post-Call Analysis | Configure post-call AI analysis with optional structured questionnaires (SDOH, surveys, compliance checklists). |

### Database: workflow_config_types Table

Client UI applications can query the `workflow_config_types` table for configuration options:

```sql
SELECT category, value, display_name, description, parameter_schema, examples
FROM workflow_config_types
WHERE is_active = true
ORDER BY category, display_order;
```

**Table Schema:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `category` | ENUM | `node_type`, `transition_condition`, `action_type`, `search_mode`, `workflow_setting` |
| `value` | VARCHAR(100) | Type value (e.g., 'standard', 'timeout', 'log') |
| `display_name` | VARCHAR(255) | Human-readable name for UI |
| `description` | TEXT | Full description |
| `parameter_schema` | JSONB | JSON schema for parameterized types (pattern, parameters) |
| `is_pattern_based` | BOOLEAN | For transitions: True=deterministic, False=LLM-based |
| `applicable_to` | ARRAY | Node types this can be used with |
| `examples` | ARRAY | Usage examples |
| `display_order` | INTEGER | Order for UI display (lower = first) |
| `is_active` | BOOLEAN | Whether available for use |

---

## Additional Resources

- **Workflow Guide**: `docs/WORKFLOW_GUIDE.md` - Quick start and common patterns
- **Workflow Reference**: `docs/WORKFLOW_REFERENCE.md` - Detailed workflow concepts
- **Config Reference**: `docs/CONFIG_REFERENCE.md` - Environment variables
- **Recording Config**: `docs/RECORDING_CONFIG.md` - Call recording setup
- **Example Agent**: `scripts/seed_data/tenant_*/agent_*.json` - Working examples (seeded to database)

---

**Last Updated**: 2026-01-14 (Added Global Intents section for workflow-wide topic switching; Added Post-Call Analysis section with structured questionnaires; Added workflow_setting category to config types)

**Previous Updates:**
- 2025-11-23: Added CRITICAL warnings for TTS/LLM section requirements; documented proactive LLM generation behavior and two-node speak-then-listen pattern; fixed priority documentation
