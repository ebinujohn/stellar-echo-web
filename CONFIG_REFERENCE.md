# Configuration Reference

Complete reference for all agent configuration parameters in JSON format.

## Table of Contents

- [Agent Metadata](#agent-metadata)
- [Workflow Configuration](#workflow-configuration)
- [Node Configuration](#node-configuration)
- [Transition Configuration](#transition-configuration)
- [STT Configuration (Environment-Based)](#stt-configuration)
- [LLM Configuration](#llm-configuration)
- [TTS Configuration](#tts-configuration)
- [RAG Configuration](#rag-configuration)
- [Recording Configuration](#recording-configuration)
- [Interruption Settings](#interruption-settings)
- [Phone Number Pool (Database-Backed)](#phone-number-pool-database-backed)

---

## Agent Metadata

Top-level agent identification and metadata.

**Location**: `agent` section

| Parameter     | Type   | Required | Default   | Description                                                        |
| ------------- | ------ | -------- | --------- | ------------------------------------------------------------------ |
| `id`          | string | ✓        | -         | Unique identifier for the agent (alphanumeric, underscore, hyphen) |
| `name`        | string | ✓        | -         | Human-readable name for the agent                                  |
| `description` | string | ✗        | `""`      | Description of the agent's purpose                                 |
| `version`     | string | ✗        | `"1.0.0"` | Semantic version number                                            |
| `tenant_id`   | string | ✗        | `""`      | Tenant identifier (auto-populated from file path)                  |

**Example:**

```json
{
  "agent": {
    "id": "workflow_simple",
    "name": "Simple Workflow Demo",
    "description": "Basic example showing workflow concepts",
    "version": "1.0.0"
  }
}
```

---

## Workflow Configuration

Core workflow orchestration settings.

**Location**: `workflow` section

| Parameter               | Type    | Required | Default   | Description                                                                  |
| ----------------------- | ------- | -------- | --------- | ---------------------------------------------------------------------------- |
| `initial_node`          | string  | ✓        | -         | ID of the starting node                                                      |
| `nodes`                 | array   | ✓        | -         | Array of node configurations (see [Node Configuration](#node-configuration)) |
| `global_prompt`         | string  | ✗        | `""`      | System prompt applied to all nodes (appended to node-specific prompts)       |
| `history_window`        | integer | ✗        | `0`       | Number of conversation turns to preserve. `0` = unlimited                    |
| `max_transitions`       | integer | ✗        | `50`      | Maximum node transitions per session (prevents infinite loops)               |
| `interruption_settings` | object  | ✗        | See below | Global interruption handling settings                                        |
| `recording`             | object  | ✗        | See below | Call recording configuration                                                 |

**Example:**

```json
{
  "workflow": {
    "initial_node": "greeting",
    "global_prompt": "You are a helpful assistant named Ivan.\nAlways be polite and concise.",
    "history_window": 20,
    "max_transitions": 50,
    "nodes": [...]
  }
}
```

---

## Node Configuration

Individual conversation stage configuration.

**Location**: `workflow.nodes[]` array

| Parameter               | Type    | Required | Default      | Description                                                                           |
| ----------------------- | ------- | -------- | ------------ | ------------------------------------------------------------------------------------- |
| `id`                    | string  | ✓        | -            | Unique node identifier                                                                |
| `name`                  | string  | ✓        | -            | Human-readable node name                                                              |
| `system_prompt`         | string  | ✗        | `""`         | Node-specific system prompt (combined with global_prompt)                             |
| `type`                  | string  | ✗        | `"standard"` | Node type: `"standard"`, `"retrieve_variable"`, `"static_text"`, `"end_call"`         |
| `transitions`           | array   | ✗        | `[]`         | Array of transition rules (see [Transition Configuration](#transition-configuration)) |
| `rag`                   | object  | ✗        | `null`       | Node-specific RAG settings (overrides global RAG config)                              |
| `actions`               | object  | ✗        | `{}`         | Actions to execute (`on_entry`, `on_exit`)                                            |
| `interruptions_enabled` | boolean | ✗        | `null`       | Override global interruption setting for this node. `null` = use global               |
| `static_text`           | string  | ✗        | `null`       | Pre-defined text to speak (bypasses LLM, zero latency). Only for `type="static_text"` |
| `variable_name`         | string  | ✗        | `null`       | Variable to extract (legacy single-variable mode). For `type="retrieve_variable"`     |
| `extraction_prompt`     | string  | ✗        | `null`       | Prompt for variable extraction. For `type="retrieve_variable"`                        |
| `default_value`         | string  | ✗        | `null`       | Default value if extraction fails. For `type="retrieve_variable"`                     |
| `variables`             | array   | ✗        | `[]`         | Batch variable extraction (see [Variable Extraction](#variable-extraction))           |

**Node Types:**

- `standard` - Regular conversation node with LLM
- `retrieve_variable` - Extract user data (single or batch mode)
- `static_text` - Speak pre-defined text without LLM (zero latency)
- `end_call` - Terminate the call

**Example:**

```json
{
  "id": "greeting",
  "name": "Welcome Message",
  "type": "static_text",
  "proactive": true,
  "static_text": "Welcome to our service! How can I help you today?",
  "transitions": [
    {
      "condition": "always",
      "target": "conversation"
    }
  ]
}
```

### Variable Extraction

For `type="retrieve_variable"` nodes, extract user-provided data.

**Batch Mode (Recommended):**

```json
{
  "id": "collect_info",
  "type": "retrieve_variable",
  "variables": [
    {
      "variable_name": "first_name",
      "extraction_prompt": "Extract the user's first name",
      "default_value": "Guest"
    },
    {
      "variable_name": "topic",
      "extraction_prompt": "What topic does the user want to discuss?",
      "default_value": "general inquiry"
    }
  ]
}
```

**Single Variable Mode (Legacy):**

```json
{
  "id": "collect_name",
  "type": "retrieve_variable",
  "variable_name": "first_name",
  "extraction_prompt": "Extract the user's first name",
  "default_value": "Guest"
}
```

**Using Extracted Variables:**
Reference in prompts with `{{variable_name}}`:

```json
{
  "system_prompt": "Greet the user by name: {{first_name}}"
}
```

---

## Transition Configuration

Rules for moving between nodes.

**Location**: `workflow.nodes[].transitions[]` array

| Parameter   | Type    | Required | Default | Description                                                 |
| ----------- | ------- | -------- | ------- | ----------------------------------------------------------- |
| `condition` | string  | ✓        | -       | Transition trigger (see conditions below)                   |
| `target`    | string  | ✓        | -       | Target node ID to transition to                             |
| `priority`  | integer | ✗        | `0`     | Priority for conflict resolution (higher = evaluated first) |

**Condition Types:**

### Pattern-Based Conditions

- `"always"` - Always transition (with `proactive: true` = auto-advance after speaking)
- `"user_responded"` - Transition after user provides input
- `"timeout:Xs"` - Transition after X seconds (e.g., `"timeout:10s"`)
- `"max_turns:N"` - Transition after N conversation turns (e.g., `"max_turns:5"`)
- `"contains:keyword"` - User message contains keyword (case-insensitive, e.g., `"contains:help"`)

### Intent-Based Conditions

LLM-evaluated conditions using intent classification (~100-150ms for all intents):

- `"intent:{intent_id}"` - Matches specific intent defined in node's `intents` dict
- `"intent:no_match"` - Fallback when no intent matches with sufficient confidence

**Note:** Semantic conditions (e.g., `user_satisfied`) have been removed. Use intent-based transitions for LLM-powered routing.

**Example:**

```json
{
  "intents": {
    "urgent": {"description": "User has an urgent emergency"},
    "done": {"description": "User is done and wants to finish"}
  },
  "transitions": [
    {
      "condition": "contains:emergency",
      "target": "urgent_support",
      "priority": 10
    },
    {
      "condition": "intent:urgent",
      "target": "urgent_support",
      "priority": 5
    },
    {
      "condition": "max_turns:5",
      "target": "followup",
      "priority": 3
    },
    {
      "condition": "intent:done",
      "target": "end_call",
      "priority": 2
    },
    {
      "condition": "always",
      "target": "continue_conversation",
      "priority": 0
    }
  ]
}
```

---

## STT Configuration

Speech-to-Text settings (Deepgram Flux v2) are configured via **environment variables only**. This is a system-wide setting that cannot be customized per-agent.

**Location**: `.env` file (NOT agent JSON)

| Environment Variable           | Type    | Default             | Description                                     |
| ------------------------------ | ------- | ------------------- | ----------------------------------------------- |
| `DEEPGRAM_MODEL`               | string  | `"flux-general-en"` | Deepgram model name                             |
| `AUDIO_SAMPLE_RATE`            | integer | `8000`              | Audio sample rate in Hz (Twilio: 8000)          |
| `DEEPGRAM_EAGER_EOT_THRESHOLD` | float   | `null`              | Early end-of-turn detection threshold (0.0-1.0) |
| `DEEPGRAM_EOT_THRESHOLD`       | float   | `null`              | End-of-turn detection threshold (0.0-1.0)       |
| `DEEPGRAM_EOT_TIMEOUT_MS`      | integer | `null`              | End-of-turn timeout in milliseconds             |

**Example (.env):**

```bash
DEEPGRAM_API_KEY=your_api_key_here
DEEPGRAM_MODEL=flux-general-en
AUDIO_SAMPLE_RATE=8000
DEEPGRAM_EOT_THRESHOLD=0.3
```

> **Note**: The `stt` section in agent JSON files is no longer supported.

---

## LLM Configuration

Large Language Model settings (OpenAI/Azure).

**Location**: `llm` section

| Parameter      | Type    | Required | Default                   | Description                                            |
| -------------- | ------- | -------- | ------------------------- | ------------------------------------------------------ |
| `enabled`      | boolean | ✗        | `true`                    | Enable LLM processing                                  |
| `model`        | string  | ✗        | `"gpt-5-mini-2025-08-07"` | Model identifier (Azure: deployment name)              |
| `service_tier` | string  | ✗        | `"auto"`                  | Service tier: `"auto"`, `"default"`                    |
| `temperature`  | float   | ✗        | `1.0`                     | Sampling temperature (0.0-2.0). Higher = more creative |
| `max_tokens`   | integer | ✗        | `150`                     | Maximum completion tokens                              |
| `base_url`     | string  | ✗        | `""`                      | Custom API endpoint (Azure: cognitive services URL)    |
| `api_version`  | string  | ✗        | `""`                      | API version (Azure only)                               |

**Note:** API keys are set via environment variables (`OPENAI_API_KEY`), not in config files.

**Example (Azure):**

```json
{
  "llm": {
    "model": "gpt-4-deployment-name",
    "temperature": 0.8,
    "max_tokens": 200,
    "base_url": "https://your-resource.cognitiveservices.azure.com",
    "api_version": "2024-12-01-preview"
  }
}
```

**Example (OpenAI):**

```json
{
  "llm": {
    "model": "gpt-4.1",
    "temperature": 0.9,
    "max_tokens": 150
  }
}
```

---

## TTS Configuration

Text-to-Speech settings (ElevenLabs).

**Location**: `tts` section

| Parameter                            | Type    | Required | Default               | Description                                             |
| ------------------------------------ | ------- | -------- | --------------------- | ------------------------------------------------------- |
| `enabled`                            | boolean | ✗        | `true`                | Enable TTS processing                                   |
| `voice_id`                           | string  | ✓        | -                     | ElevenLabs voice ID (get from dashboard)                |
| `model`                              | string  | ✗        | `"eleven_turbo_v2_5"` | ElevenLabs TTS model                                    |
| `stability`                          | float   | ✗        | `0.5`                 | Voice stability (0.0-1.0). Higher = more consistent     |
| `similarity_boost`                   | float   | ✗        | `0.75`                | Voice similarity (0.0-1.0). Higher = closer to original |
| `style`                              | float   | ✗        | `0.0`                 | Style exaggeration (0.0-1.0)                            |
| `use_speaker_boost`                  | boolean | ✗        | `true`                | Enhance voice clarity                                   |
| `enable_ssml_parsing`                | boolean | ✗        | `false`               | Enable SSML tag parsing (`<break>`, `<prosody>`, etc.)  |
| `pronunciation_dictionaries_enabled` | boolean | ✗        | `true`                | Enable pronunciation dictionaries                       |
| `pronunciation_dictionary_ids`       | array   | ✗        | `[]`                  | Array of dictionary IDs from ElevenLabs dashboard       |

**Example:**

```json
{
  "tts": {
    "voice_id": "your_voice_id_here",
    "model": "eleven_turbo_v2_5",
    "stability": 0.6,
    "similarity_boost": 0.8,
    "enable_ssml_parsing": true,
    "pronunciation_dictionaries_enabled": true,
    "pronunciation_dictionary_ids": [
      "dict_medical_terms_abc123",
      "dict_product_names_xyz789"
    ]
  }
}
```

---

## RAG Configuration

Retrieval-Augmented Generation settings (FAISS + SQLite + Bedrock).

**Location**: `rag` section

| Parameter            | Type    | Required | Default                             | Description                                                  |
| -------------------- | ------- | -------- | ----------------------------------- | ------------------------------------------------------------ |
| `enabled`            | boolean | ✗        | `false`                             | Enable RAG knowledge base                                    |
| `search_mode`        | string  | ✗        | `"hybrid"`                          | Search strategy: `"vector"`, `"fts"`, `"hybrid"`             |
| `top_k`              | integer | ✗        | `5`                                 | Number of results to retrieve                                |
| `relevance_filter`   | boolean | ✗        | `true`                              | Only query for questions/info requests                       |
| `faiss_index_path`   | string  | ✗        | `"data/faiss/index.faiss"`          | Path to FAISS vector index                                   |
| `faiss_mapping_path` | string  | ✗        | `"data/faiss/mapping.pkl"`          | Path to FAISS mapping file                                   |
| `sqlite_db_path`     | string  | ✗        | `"data/metadata/healthcare_rag.db"` | Path to SQLite FTS database                                  |
| `rrf_k`              | integer | ✗        | `60`                                | Reciprocal Rank Fusion parameter (hybrid mode)               |
| `vector_weight`      | float   | ✗        | `0.6`                               | Vector search weight (hybrid mode, 0.0-1.0)                  |
| `fts_weight`         | float   | ✗        | `0.4`                               | FTS search weight (hybrid mode, 0.0-1.0)                     |
| `hnsw_ef_search`     | integer | ✗        | `64`                                | FAISS HNSW search parameter (higher = more accurate, slower) |
| `bedrock_model`      | string  | ✗        | `"amazon.titan-embed-text-v2:0"`    | AWS Bedrock embedding model                                  |
| `bedrock_dimensions` | integer | ✗        | `1024`                              | Embedding vector dimensions                                  |

**Search Modes:**

- `vector` - Semantic similarity search (fastest, best for conceptual queries)
- `fts` - Full-text keyword search (best for exact terms)
- `hybrid` - RRF fusion of both (best accuracy, slightly slower)

**Example:**

```json
{
  "rag": {
    "enabled": true,
    "search_mode": "hybrid",
    "top_k": 5,
    "relevance_filter": true,
    "vector_weight": 0.6,
    "fts_weight": 0.4,
    "bedrock_model": "amazon.titan-embed-text-v2:0"
  }
}
```

### Node-Specific RAG Override

Override global RAG settings for specific nodes:

```json
{
  "id": "product_inquiry",
  "name": "Product Questions",
  "rag": {
    "enabled": true,
    "search_mode": "vector",
    "top_k": 3
  }
}
```

---

## Recording Configuration

Call recording settings (Twilio + S3). Recording configuration is split between per-agent settings and system-wide environment variables.

### Per-Agent Setting

**Location**: `workflow.recording` section in agent JSON

| Parameter | Type    | Required | Default | Description           |
| --------- | ------- | -------- | ------- | --------------------- |
| `enabled` | boolean | ✗        | `false` | Enable call recording |

**Example (agent JSON):**

```json
{
  "workflow": {
    "recording": {
      "enabled": true
    }
  }
}
```

### System-Wide Settings

**Location**: `.env` file

| Environment Variable | Type   | Default  | Description                                                |
| -------------------- | ------ | -------- | ---------------------------------------------------------- |
| `RECORDING_TRACK`    | string | `"both"` | What to record: `"inbound"`, `"outbound"`, `"both"`        |
| `RECORDING_CHANNELS` | string | `"dual"` | Channel mode: `"mono"` (mixed), `"dual"` (separate tracks) |

**Example (.env):**

```bash
RECORDING_TRACK=both
RECORDING_CHANNELS=dual
RECORDING_WEBHOOK_BASE_URL=https://your-domain.com
```

**Requirements:**

- Twilio External S3 Storage configured (see `RECORDING_CONFIG.md`)
- Environment variable: `RECORDING_WEBHOOK_BASE_URL`

> **Note**: `track` and `channels` are system-wide because they affect Twilio's recording infrastructure configuration.

---

## Interruption Settings

User interruption handling configuration.

**Location**: `workflow.interruption_settings` section

| Parameter       | Type    | Required | Default      | Description                                         |
| --------------- | ------- | -------- | ------------ | --------------------------------------------------- |
| `enabled`       | boolean | ✗        | `true`       | Enable global interruption handling                 |
| `delay_ms`      | integer | ✗        | `300`        | Delay before processing interruption (milliseconds) |
| `resume_prompt` | string  | ✗        | `"Go ahead"` | Prompt to continue after interruption               |

**Per-Node Override:**
Set `interruptions_enabled: false` in node config to disable for specific nodes.

**Example:**

```json
{
  "workflow": {
    "interruption_settings": {
      "enabled": true,
      "delay_ms": 300,
      "resume_prompt": "Go ahead, I'm listening"
    }
  }
}
```

---

## Phone Number Pool (Database-Backed)

Phone numbers are managed in the database as a pool that can be assigned to agents.

### Database Tables

- **`phone_configs`**: Phone number pool (tenant-scoped)
  - `phone_number`: E.164 format (e.g., `+17708304765`)
  - `tenant_id`: Tenant that owns this number
  - `name`: Optional label

- **`phone_mappings`**: Links phone numbers to agents
  - `phone_config_id`: References `phone_configs.id`
  - `agent_id`: Agent this phone is mapped to

### Seeding from JSON

Phone mappings can be seeded from `scripts/seed_data/phone_mapping.json`:

```json
{
  "mappings": {
    "+1234567890": "tenant_id:agent_id",
    "+0987654321": "tenant_id:another_agent"
  }
}
```

When `seed_database.py` runs:
1. Phone numbers are added to `phone_configs` table
2. Mappings are created in `phone_mappings` table

**Example:**

```json
{
  "mappings": {
    "+17708304765": "tenant_12345:workflow_simple",
    "+18005551234": "tenant_99999:support_agent"
  }
}
```

When a call arrives at `+17708304765`, the system looks up `phone_configs` → `phone_mappings` → agent.

---

## Additional Settings

### Logging

⚠️ **NOT SUPPORTED - Use Environment Variable**

**Per-agent logging is not supported.** Logging is controlled globally via the `LOG_LEVEL` environment variable for all agents.

Set `LOG_LEVEL` in your `.env` file or environment:

```bash
# In .env
LOG_LEVEL=DEBUG

# Or when running
LOG_LEVEL=DEBUG uv run uvicorn app.main:app --reload
```

**Levels:**
- `DEBUG` - Detailed debug info, SQL queries, LLM details, pipeline frames
- `INFO` - Key events, transitions, metrics (default)
- `WARNING` - Warnings and errors only
- `ERROR` - Errors only

**Note:** Do not include `logging` section in agent JSON files - it is not supported.

---

## Complete Example

Full agent configuration with all sections:

```json
{
  "agent": {
    "id": "workflow_simple",
    "name": "Simple Workflow Demo",
    "description": "Complete configuration example",
    "version": "1.0.0"
  },
  "workflow": {
    "initial_node": "greeting",
    "global_prompt": "You are a helpful assistant named Ivan.\nAlways be polite and concise.",
    "history_window": 20,
    "max_transitions": 50,
    "interruption_settings": {
      "enabled": true,
      "delay_ms": 300,
      "resume_prompt": "Go ahead"
    },
    "recording": {
      "enabled": true,
      "track": "both",
      "channels": "dual"
    },
    "nodes": [
      {
        "id": "greeting",
        "name": "Welcome",
        "type": "static_text",
        "proactive": true,
        "static_text": "Welcome! How can I help you?",
        "transitions": [
          {
            "condition": "always",
            "target": "conversation"
          }
        ]
      },
      {
        "id": "conversation",
        "name": "Main Conversation",
        "system_prompt": "Help the user with their inquiry.",
        "transitions": [
          {
            "condition": "user_wants_to_end",
            "target": "end_call"
          }
        ]
      },
      {
        "id": "end_call",
        "name": "End Call",
        "type": "end_call"
      }
    ]
  },
  "stt": {
    "model": "flux-general-en",
    "sample_rate": 8000
  },
  "llm": {
    "model": "gpt-4.1",
    "temperature": 0.8,
    "max_tokens": 150
  },
  "tts": {
    "voice_id": "your_voice_id",
    "model": "eleven_turbo_v2_5",
    "stability": 0.5,
    "enable_ssml_parsing": true,
    "pronunciation_dictionaries_enabled": true,
    "pronunciation_dictionary_ids": ["dict_abc123"]
  },
  "rag": {
    "enabled": false
  },
  "auto_hangup": {
    "enabled": true
  }
}
```

---

## Environment Variables

Configuration files should NOT contain API keys or secrets. Use environment variables:

| Variable                     | Required      | Description                              |
| ---------------------------- | ------------- | ---------------------------------------- |
| `OPENAI_API_KEY`             | ✓             | OpenAI/Azure API key                     |
| `OPENAI_BASE_URL`            | Azure only    | Azure cognitive services URL             |
| `OPENAI_API_VERSION`         | Azure only    | Azure API version                        |
| `ELEVENLABS_API_KEY`         | ✓             | ElevenLabs API key                       |
| `DEEPGRAM_API_KEY`           | ✓             | Deepgram API key                         |
| `TWILIO_ACCOUNT_SID`         | For hangup/recording | Twilio account SID                  |
| `TWILIO_AUTH_TOKEN`          | For hangup/recording | Twilio auth token                   |
| `AWS_REGION`                 | For RAG       | AWS region for Bedrock                   |
| `RECORDING_WEBHOOK_BASE_URL` | For recording | Public webhook URL for database updates  |
| `EXTRACTION_LLM_API_KEY`     | Optional      | Separate API key for variable extraction |
| `LOG_LEVEL`                  | Optional      | Logging level: `DEBUG`, `INFO` (default), `WARNING`, `ERROR` |

See `.env.example` for complete list and examples.

---

## Validation

The system validates configurations on load:

- **Required fields**: Missing required parameters cause startup errors
- **Node references**: Invalid node IDs in transitions are caught
- **Workflow integrity**: Unreachable nodes trigger warnings
- **Type checking**: Invalid parameter types are rejected

**Testing Configuration:**

```bash
# Start server and check logs for validation errors
uv run uvicorn app.main:app --reload
```

---

## Migration from YAML

If migrating from YAML configs:

1. Multi-line strings use `\n` escape sequences
2. Comments are removed (refer to this documentation)
3. Use provided migration script: `scripts/migrate_yaml_to_json.py`

---

**See Also:**

- [WORKFLOW_GUIDE.md](WORKFLOW_GUIDE.md) - Workflow patterns and examples
- [WORKFLOW_REFERENCE.md](WORKFLOW_REFERENCE.md) - Complete API reference
- [RECORDING_CONFIG.md](../RECORDING_CONFIG.md) - Recording setup guide
- [.env.example](../.env.example) - Environment variable reference
