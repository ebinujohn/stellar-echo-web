# Database Schema Reference

Complete reference for the PostgreSQL database schema, including all tables and column definitions.

## Table of Contents
- [Call Direction Enum](#call-direction-enum)
- [RAG Configuration Tables](#rag-configuration-tables)
  - [rag_configs](#rag_configs)
  - [rag_config_versions](#rag_config_versions)
- [Voice Configuration Tables](#voice-configuration-tables)
  - [voice_configs](#voice_configs)
  - [voice_config_versions](#voice_config_versions)
- [Phone Configuration Tables](#phone-configuration-tables)
  - [phone_configs](#phone_configs)
  - [phone_config_versions](#phone_config_versions)
- [Text Conversation Tables](#text-conversation-tables)
  - [text_conversations](#text_conversations)
  - [text_conversation_messages](#text_conversation_messages)
  - [text_conversation_transitions](#text_conversation_transitions)
  - [text_conversation_variables](#text_conversation_variables)
- [Agent Configuration Updates](#agent-configuration-updates)
- [call_metrics_summary](#call_metrics_summary)
- [Understanding Metrics Categories](#understanding-metrics-categories)
- [Query Examples](#query-examples)

---

## Call Direction Enum

The `calls` table includes a `direction` field to distinguish between inbound and outbound calls.

```sql
CREATE TYPE call_direction_enum AS ENUM ('inbound', 'outbound');
```

| Value | Description |
|-------|-------------|
| `inbound` | Calls received from external parties (default) |
| `outbound` | Calls initiated programmatically via the Outbound Call API |

**Usage in `calls` table:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `direction` | call_direction_enum | No | 'inbound' | Call direction |

**Index:**
- `idx_call_direction` on `direction` - Enables efficient filtering by call direction

**Query Example:**
```sql
-- Get all outbound calls for a tenant
SELECT * FROM calls
WHERE tenant_id = 'your-tenant-uuid'
  AND direction = 'outbound'
ORDER BY started_at DESC;

-- Count calls by direction
SELECT direction, COUNT(*) as call_count
FROM calls
WHERE tenant_id = 'your-tenant-uuid'
GROUP BY direction;
```

---

## RAG Configuration Tables

RAG (Retrieval-Augmented Generation) configuration is stored separately from agent configurations, allowing:
- Shared RAG configs across multiple agents
- Independent versioning of RAG settings
- Easier RAG config management and updates

### rag_configs

Base entity for RAG configurations. Tenant-scoped with unique names per tenant.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `tenant_id` | UUID | No | - | Foreign key to tenants (CASCADE DELETE) |
| `name` | VARCHAR(255) | No | - | RAG config name (unique per tenant) |
| `description` | TEXT | Yes | NULL | Optional description |
| `is_active` | BOOLEAN | No | true | Whether config is active |
| `created_at` | TIMESTAMP(TZ) | No | now() | Creation timestamp |
| `updated_at` | TIMESTAMP(TZ) | No | now() | Last update timestamp |

**Indexes:**
- `idx_rag_config_tenant` on `tenant_id`
- `idx_rag_config_active` on `is_active`

**Constraints:**
- `uq_rag_config_tenant_name` UNIQUE on `(tenant_id, name)`

---

### rag_config_versions

Versioned RAG configurations with full audit trail. Contains all RAG parameters.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `rag_config_id` | UUID | No | - | Foreign key to rag_configs (CASCADE DELETE) |
| `tenant_id` | UUID | No | - | Foreign key to tenants (CASCADE DELETE) |
| `version` | INTEGER | No | - | Version number (unique per rag_config) |
| `search_mode` | VARCHAR(20) | No | 'hybrid' | Search mode: vector, fts, hybrid |
| `top_k` | INTEGER | No | 5 | Number of chunks to retrieve |
| `relevance_filter` | BOOLEAN | No | true | Enable smart query detection |
| `rrf_k` | INTEGER | No | 60 | RRF fusion constant |
| `vector_weight` | NUMERIC(3,2) | No | 0.6 | Vector search weight (hybrid mode) |
| `fts_weight` | NUMERIC(3,2) | No | 0.4 | FTS search weight (hybrid mode) |
| `hnsw_ef_search` | INTEGER | No | 64 | FAISS HNSW ef_search parameter |
| `bedrock_model` | VARCHAR(255) | No | 'amazon.titan-embed-text-v2:0' | Bedrock embedding model ID |
| `bedrock_dimensions` | INTEGER | No | 1024 | Embedding dimensions |
| `faiss_index_path` | VARCHAR(500) | No | 'data/faiss/index.faiss' | Path to FAISS index file |
| `faiss_mapping_path` | VARCHAR(500) | No | 'data/faiss/mapping.pkl' | Path to FAISS mapping file |
| `sqlite_db_path` | VARCHAR(500) | No | 'data/metadata/healthcare_rag.db' | Path to SQLite FTS database |
| `is_active` | BOOLEAN | No | true | Whether this version is active |
| `created_by` | VARCHAR(255) | Yes | NULL | User who created this version |
| `created_at` | TIMESTAMP(TZ) | No | now() | Creation timestamp |
| `notes` | TEXT | Yes | NULL | Optional version notes |

**Indexes:**
- `idx_rag_config_version_rag_config` on `rag_config_id`
- `idx_rag_config_version_tenant` on `tenant_id`
- `idx_rag_config_version_active` on `(rag_config_id, is_active)`

**Constraints:**
- `uq_rag_config_version_unique` UNIQUE on `(rag_config_id, version)`

---

## Voice Configuration Tables

Voice/TTS configuration is stored separately from agent configurations, allowing:
- Shared voice configs across multiple agents
- Independent versioning of voice/TTS settings
- Easier voice config management and updates

### voice_configs

Base entity for voice configurations. Tenant-scoped with unique names per tenant.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `tenant_id` | UUID | No | - | Foreign key to tenants (CASCADE DELETE) |
| `name` | VARCHAR(255) | No | - | Voice config name (unique per tenant) |
| `description` | TEXT | Yes | NULL | Optional description |
| `is_active` | BOOLEAN | No | true | Whether config is active |
| `created_at` | TIMESTAMP(TZ) | No | now() | Creation timestamp |
| `updated_at` | TIMESTAMP(TZ) | No | now() | Last update timestamp |

**Indexes:**
- `idx_voice_config_tenant` on `tenant_id`
- `idx_voice_config_active` on `is_active`

**Constraints:**
- `uq_voice_config_tenant_name` UNIQUE on `(tenant_id, name)`

---

### voice_config_versions

Versioned voice/TTS configurations with full audit trail. Contains all ElevenLabs TTS parameters.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `voice_config_id` | UUID | No | - | Foreign key to voice_configs (CASCADE DELETE) |
| `tenant_id` | UUID | No | - | Foreign key to tenants (CASCADE DELETE) |
| `version` | INTEGER | No | - | Version number (unique per voice_config) |
| `voice_id` | VARCHAR(255) | No | - | ElevenLabs voice ID |
| `model` | VARCHAR(100) | No | 'eleven_turbo_v2_5' | TTS model |
| `stability` | NUMERIC(3,2) | No | 0.5 | Voice stability (0.0-1.0) |
| `similarity_boost` | NUMERIC(3,2) | No | 0.75 | Similarity boost (0.0-1.0) |
| `style` | NUMERIC(3,2) | No | 0.0 | Style exaggeration (0.0-1.0) |
| `use_speaker_boost` | BOOLEAN | No | true | Enable speaker boost |
| `enable_ssml_parsing` | BOOLEAN | No | false | Parse SSML tags in text |
| `pronunciation_dictionaries_enabled` | BOOLEAN | No | true | Use pronunciation dictionaries |
| `pronunciation_dictionary_ids` | VARCHAR(255)[] | Yes | NULL | Array of ElevenLabs dictionary IDs |
| `is_active` | BOOLEAN | No | true | Whether this version is active |
| `created_by` | VARCHAR(255) | Yes | NULL | User who created this version |
| `created_at` | TIMESTAMP(TZ) | No | now() | Creation timestamp |
| `notes` | TEXT | Yes | NULL | Optional version notes |

**Indexes:**
- `idx_voice_config_version_voice_config` on `voice_config_id`
- `idx_voice_config_version_tenant` on `tenant_id`
- `idx_voice_config_version_active` on `(voice_config_id, is_active)`

**Constraints:**
- `uq_voice_config_version_unique` UNIQUE on `(voice_config_id, version)`

---

## Phone Configuration Tables

Phone/call configuration is stored separately from agent configurations, allowing:
- Shared phone configs across multiple agents
- Independent versioning of recording and call behavior settings
- Easier phone config management and updates

### phone_configs

Base entity for phone configurations. Tenant-scoped with unique names per tenant.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `tenant_id` | UUID | No | - | Foreign key to tenants (CASCADE DELETE) |
| `name` | VARCHAR(255) | No | - | Phone config name (unique per tenant) |
| `description` | TEXT | Yes | NULL | Optional description |
| `is_active` | BOOLEAN | No | true | Whether config is active |
| `created_at` | TIMESTAMP(TZ) | No | now() | Creation timestamp |
| `updated_at` | TIMESTAMP(TZ) | No | now() | Last update timestamp |

**Indexes:**
- `idx_phone_config_tenant` on `tenant_id`
- `idx_phone_config_active` on `is_active`

**Constraints:**
- `uq_phone_config_tenant_name` UNIQUE on `(tenant_id, name)`

---

### phone_config_versions

Versioned phone/call configurations with full audit trail. Contains recording and auto-hangup parameters.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `phone_config_id` | UUID | No | - | Foreign key to phone_configs (CASCADE DELETE) |
| `tenant_id` | UUID | No | - | Foreign key to tenants (CASCADE DELETE) |
| `version` | INTEGER | No | - | Version number (unique per phone_config) |
| `recording_enabled` | BOOLEAN | No | false | Enable call recording via Twilio |
| `recording_track` | VARCHAR(20) | No | 'both' | Recording track: inbound, outbound, both |
| `recording_channels` | VARCHAR(10) | No | 'dual' | Recording channels: mono, dual |
| `auto_hangup_enabled` | BOOLEAN | No | true | Auto-terminate call on end_call node |
| `is_active` | BOOLEAN | No | true | Whether this version is active |
| `created_by` | VARCHAR(255) | Yes | NULL | User who created this version |
| `created_at` | TIMESTAMP(TZ) | No | now() | Creation timestamp |
| `notes` | TEXT | Yes | NULL | Optional version notes |

**Indexes:**
- `idx_phone_config_version_phone_config` on `phone_config_id`
- `idx_phone_config_version_tenant` on `tenant_id`
- `idx_phone_config_version_active` on `(phone_config_id, is_active)`

**Constraints:**
- `uq_phone_config_version_unique` UNIQUE on `(phone_config_id, version)`

---

## Text Conversation Tables

Text conversation tables store data from text chat sessions (REST API, no voice). These tables mirror the voice call tables structure but are specifically for text-based interactions.

**Features:**
- Monthly partitioning (2025-2035, 120 partitions pre-created)
- Multi-tenant isolation
- Full conversation history with transitions and variables
- Optimized for time-range queries

### text_conversations

Base entity for text chat sessions. One row per conversation session.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `tenant_id` | UUID | No | - | Foreign key to tenants (CASCADE DELETE) |
| `agent_config_id` | UUID | Yes | NULL | Foreign key to agent_configs (SET NULL on delete) |
| `agent_name` | VARCHAR(255) | Yes | NULL | Agent name (denormalized for queries) |
| `agent_version_id` | UUID | Yes | NULL | Specific agent version used |
| `session_id` | VARCHAR(255) | No | - | Unique session identifier from TextChatHandler |
| `channel` | VARCHAR(50) | No | 'web' | Channel type: web, api, etc. |
| `metadata` | JSONB | Yes | NULL | Optional client-provided metadata |
| `status` | VARCHAR(20) | No | 'active' | Session status: active, completed, abandoned, error |
| `initial_node_id` | VARCHAR(100) | Yes | NULL | Starting workflow node |
| `final_node_id` | VARCHAR(100) | Yes | NULL | Ending workflow node |
| `total_turns` | INTEGER | No | 0 | Total conversation turns |
| `total_messages` | INTEGER | No | 0 | Total messages exchanged |
| `total_transitions` | INTEGER | No | 0 | Total node transitions |
| `started_at` | TIMESTAMP(TZ) | No | now() | Conversation start time |
| `ended_at` | TIMESTAMP(TZ) | Yes | NULL | Conversation end time |
| `created_at` | TIMESTAMP(TZ) | No | now() | Record creation time |

**Indexes:**
- `idx_text_conv_tenant` on `tenant_id`
- `idx_text_conv_session` on `session_id`
- `idx_text_conv_agent` on `agent_config_id`
- `idx_text_conv_status` on `status`
- `idx_text_conv_started` on `started_at`

---

### text_conversation_messages

Individual messages in a text conversation. **Monthly partitioned** on `created_at`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `conversation_id` | UUID | No | - | Foreign key to text_conversations (CASCADE DELETE) |
| `role` | VARCHAR(20) | No | - | Message role: user, assistant, system |
| `content` | TEXT | No | - | Message content |
| `node_id` | VARCHAR(100) | Yes | NULL | Node ID when message was sent |
| `sequence_number` | INTEGER | No | - | Message order within conversation |
| `latency_ms` | INTEGER | Yes | NULL | Response latency for assistant messages |
| `created_at` | TIMESTAMP(TZ) | No | now() | Message timestamp (partition key) |

**Indexes:**
- `idx_text_msg_conv` on `conversation_id`
- `idx_text_msg_created` on `created_at`

**Partitioning:** Monthly on `created_at` (2025-2035)

---

### text_conversation_transitions

Workflow node transitions during text conversations. **Monthly partitioned** on `created_at`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `conversation_id` | UUID | No | - | Foreign key to text_conversations (CASCADE DELETE) |
| `from_node_id` | VARCHAR(100) | No | - | Source node ID |
| `to_node_id` | VARCHAR(100) | No | - | Destination node ID |
| `trigger` | VARCHAR(100) | Yes | NULL | What triggered the transition |
| `sequence_number` | INTEGER | No | - | Transition order within conversation |
| `created_at` | TIMESTAMP(TZ) | No | now() | Transition timestamp (partition key) |

**Indexes:**
- `idx_text_trans_conv` on `conversation_id`
- `idx_text_trans_created` on `created_at`

**Partitioning:** Monthly on `created_at` (2025-2035)

---

### text_conversation_variables

Variables extracted during text conversations. **Monthly partitioned** on `created_at`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `conversation_id` | UUID | No | - | Foreign key to text_conversations (CASCADE DELETE) |
| `variable_name` | VARCHAR(100) | No | - | Variable name (e.g., first_name) |
| `variable_value` | TEXT | Yes | NULL | Extracted value |
| `extraction_method` | VARCHAR(50) | No | 'llm' | How variable was extracted |
| `confidence` | NUMERIC(3,2) | Yes | NULL | Extraction confidence (0.0-1.0) |
| `node_id` | VARCHAR(100) | Yes | NULL | Node where extraction occurred |
| `created_at` | TIMESTAMP(TZ) | No | now() | Extraction timestamp (partition key) |

**Indexes:**
- `idx_text_var_conv` on `conversation_id`
- `idx_text_var_name` on `variable_name`
- `idx_text_var_created` on `created_at`

**Partitioning:** Monthly on `created_at` (2025-2035)

---

## Agent Configuration Updates

The `agent_config_versions` table has been updated with RAG, Voice, and Phone configuration columns:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `rag_enabled` | BOOLEAN | No | false | Enable/disable RAG for this agent version |
| `rag_config_id` | UUID | Yes | NULL | Foreign key to rag_configs (SET NULL on delete) |
| `voice_config_id` | UUID | Yes | NULL | Foreign key to voice_configs (SET NULL on delete) |
| `phone_config_id` | UUID | Yes | NULL | Foreign key to phone_configs (SET NULL on delete) |

**Indexes:**
- `idx_config_version_rag_config` on `rag_config_id`
- `idx_config_version_voice_config` on `voice_config_id`
- `idx_config_version_phone_config` on `phone_config_id`

**RAG Usage:**
1. Create a RAG config in `rag_configs` table
2. Create a version in `rag_config_versions` with settings
3. Link agent to RAG config: `agent_config_versions.rag_config_id = rag_config.id`
4. Enable RAG: `agent_config_versions.rag_enabled = true`

**Voice Usage:**
1. Create a voice config in `voice_configs` table
2. Create a version in `voice_config_versions` with ElevenLabs settings
3. Link agent to voice config: `agent_config_versions.voice_config_id = voice_config.id`
4. TTS is enabled automatically when `voice_config_id` is set

**Phone Usage:**
1. Create a phone config in `phone_configs` table
2. Create a version in `phone_config_versions` with recording and auto-hangup settings
3. Link agent to phone config: `agent_config_versions.phone_config_id = phone_config.id`
4. Recording and auto-hangup settings loaded automatically when `phone_config_id` is set

**On Config Deletion:**
- `rag_config_id`, `voice_config_id`, `phone_config_id` are set to NULL (not cascaded)
- Agent config version remains intact
- Respective features will use defaults at runtime (no config to load)

---

## call_metrics_summary

Session-level metrics aggregated from call data. One row per call with both denormalized columns (for fast queries) and complete JSONB data.

### Primary Keys & References

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated unique identifier for the metrics record |
| `call_id` | UUID | Foreign key to `calls.call_id` (CASCADE DELETE). Links metrics to the call. |

### Complete Metrics Data (JSONB)

| Column | Type | Description |
|--------|------|-------------|
| `metrics_data` | JSONB | Complete metrics with individual values for detailed analysis. Structure: `{metric_name: {avg, min, max, num, values: [...]}}`. Contains all metrics including denormalized columns plus LLM TTFB from Pipecat. |

**Example JSONB structure:**
```json
{
  "stt_delay": {"avg": 0.22, "min": 0.15, "max": 0.28, "num": 2, "values": [0.28, 0.15]},
  "llm_processing": {"avg": 592.68, "min": 559.19, "max": 626.18, "num": 2, "values": [626.18, 559.19]},
  "llm_ttfb": {"avg": 0.17, "min": 0.0, "max": 0.72, "num": 76, "values": [0.0, 0.0, ...]},
  "variable_extraction_time": {"avg": 515.03, "min": 515.03, "max": 515.03, "num": 1, "values": [515.03]},
  "llm_prompt_tokens": {"total": 2688, "num": 18, "values": [120, 120, ...]},
  ...
}
```

---

## Understanding Metrics Categories

The metrics are organized into several categories based on the conversation pipeline:

### 1. Speech-to-Text (STT) Metrics
**What it measures:** Time from when the user stops speaking to when the transcript is received.

| Column | Type | Description |
|--------|------|-------------|
| `avg_stt_delay_ms` | Decimal(10,2) | Average STT delay in milliseconds across all turns |
| `min_stt_delay_ms` | Decimal(10,2) | Minimum STT delay (fastest transcription) |
| `max_stt_delay_ms` | Decimal(10,2) | Maximum STT delay (slowest transcription) |

**Typical values:** 0-500ms (sub-second is excellent)
**High values indicate:** Slow speech recognition or network issues

---

### 2. User→Bot Response Metrics
**What it measures:** End-to-end latency from when user stops speaking to when bot starts speaking. This is the **primary UX metric** - what the user actually experiences.

| Column | Type | Description |
|--------|------|-------------|
| `avg_user_to_bot_latency_ms` | Decimal(10,2) | Average user-to-bot response time in milliseconds |
| `min_user_to_bot_latency_ms` | Decimal(10,2) | Fastest response time |
| `max_user_to_bot_latency_ms` | Decimal(10,2) | Slowest response time |

**Typical values:** 500-2000ms (under 1s is excellent, under 2s is good)
**Calculation:** STT + Transcript→LLM Gap + RAG (if enabled) + Variable Extraction (if used) + LLM Processing + LLM→TTS Gap
**High values indicate:** Overall system slowness - check individual pipeline stages to identify bottleneck

---

### 3. Transcript→LLM Gap Metrics
**What it measures:** Framework overhead between receiving transcript and starting LLM call. **Excludes** variable extraction time (which is a separate LLM call).

| Column | Type | Description |
|--------|------|-------------|
| `avg_transcript_llm_gap_ms` | Decimal(10,2) | Average gap time in milliseconds |
| `min_transcript_llm_gap_ms` | Decimal(10,2) | Minimum gap time |
| `max_transcript_llm_gap_ms` | Decimal(10,2) | Maximum gap time |

**Typical values:** 1-10ms (framework overhead is minimal)
**High values indicate:** System resource contention or slow middleware processing

---

### 4. LLM Processing Metrics
**What it measures:** Wall-clock time from LLM request start to LLM response complete. This is the **total LLM call duration** including network, queueing, and generation time.

| Column | Type | Description |
|--------|------|-------------|
| `avg_llm_processing_ms` | Decimal(10,2) | Average LLM processing time in milliseconds |
| `min_llm_processing_ms` | Decimal(10,2) | Fastest LLM response |
| `max_llm_processing_ms` | Decimal(10,2) | Slowest LLM response |

**Typical values:** 200-1500ms depending on model and response length
**High values indicate:**
- Slow LLM model (consider faster model like gpt-4.1-mini)
- Large context window
- Long output generation
- API rate limiting or queueing

**Note:** This is tracked by `LatencyTracker` (wall-clock) and differs from Pipecat's internal `llm_ttfb` metric.

---

### 5. LLM→TTS Gap Metrics
**What it measures:** Framework overhead between LLM response complete and TTS audio generation start.

| Column | Type | Description |
|--------|------|-------------|
| `avg_llm_to_tts_gap_ms` | Decimal(10,2) | Average gap time in milliseconds |
| `min_llm_to_tts_gap_ms` | Decimal(10,2) | Minimum gap time |
| `max_llm_to_tts_gap_ms` | Decimal(10,2) | Maximum gap time |

**Typical values:** 50-300ms (includes text processing and TTS initialization)
**High values indicate:** Slow text-to-speech initialization or processing

---

### 6. Pipeline Total Metrics
**What it measures:** Total time from user stops speaking to bot starts speaking (same as User→Bot Response).

| Column | Type | Description |
|--------|------|-------------|
| `avg_pipeline_total_ms` | Decimal(10,2) | Average total pipeline time in milliseconds |
| `min_pipeline_total_ms` | Decimal(10,2) | Fastest complete pipeline |
| `max_pipeline_total_ms` | Decimal(10,2) | Slowest complete pipeline |

**Typical values:** 500-2000ms (matches User→Bot Response)
**Use case:** Redundant with User→Bot Response, kept for compatibility

---

### 7. RAG Processing Metrics
**What it measures:** Time spent searching the knowledge base (FAISS + SQLite) for relevant context. **Only present when RAG is enabled and triggered.**

| Column | Type | Description |
|--------|------|-------------|
| `avg_rag_processing_ms` | Decimal(10,2) | Average RAG query time in milliseconds |
| `min_rag_processing_ms` | Decimal(10,2) | Fastest RAG query |
| `max_rag_processing_ms` | Decimal(10,2) | Slowest RAG query |

**Typical values:** 50-500ms depending on vector store size and search mode
**NULL when:** RAG is disabled or not triggered (smart query detection)
**High values indicate:**
- Large knowledge base (consider indexing optimization)
- Hybrid search mode (slower but more accurate than vector-only)
- Slow disk I/O

**Stored in JSONB as:** `rag_processing_time`

---

### 8. Variable Extraction Metrics
**What it measures:** Time spent calling an external LLM to extract structured data from conversation (e.g., first name, last name, topic). **Only present when variable extraction is used.**

| Column | Type | Description |
|--------|------|-------------|
| `avg_variable_extraction_ms` | Decimal(10,2) | Average extraction time in milliseconds |
| `min_variable_extraction_ms` | Decimal(10,2) | Fastest extraction |
| `max_variable_extraction_ms` | Decimal(10,2) | Slowest extraction |

**Typical values:** 300-800ms per extraction call (separate LLM API call)
**NULL when:** No variables configured for extraction in workflow
**High values indicate:**
- Slow extraction LLM model
- Complex extraction prompts
- Network latency to extraction LLM API

**Important:** This is a **separate LLM call** from the main conversation LLM, so it adds directly to latency. Consider batch extraction to minimize calls.

**Stored in JSONB as:** `variable_extraction_time`

---

### 9. LLM TTFB Metrics (Pipecat)
**What it measures:** Time-to-first-byte reported by Pipecat framework - the time from LLM request to first token streamed back. **Different from LLM Processing metrics.**

| Column | Type | Description |
|--------|------|-------------|
| `avg_llm_ttfb_ms` | Decimal(10,2) | Average TTFB in milliseconds |
| `min_llm_ttfb_ms` | Decimal(10,2) | Minimum TTFB |
| `max_llm_ttfb_ms` | Decimal(10,2) | Maximum TTFB |

**Typical values:** 0-1000ms (highly variable depending on streaming)
**NULL when:** LLM doesn't support streaming or Pipecat doesn't track it
**Use case:** Debugging LLM streaming performance vs total processing time

**Stored in JSONB as:** `llm_ttfb`

**Difference from LLM Processing:**
- **LLM TTFB:** Time to first token (streaming start)
- **LLM Processing:** Total time to complete response (streaming end)

---

### 10. Token & Character Totals

| Column | Type | Description |
|--------|------|-------------|
| `total_llm_tokens` | Integer | Sum of prompt + completion tokens across all LLM calls in the session |
| `total_tts_characters` | Integer | Total characters sent to text-to-speech service (for billing/cost tracking) |

**Use case:** Cost analysis and usage tracking

**Stored in JSONB as:**
- `llm_prompt_tokens` (with individual values per call)
- `llm_completion_tokens` (with individual values per call)
- `tts_characters` (with individual values per chunk)

---

### 11. Metadata

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | Timestamp (TZ) | When the metrics record was created (end of call) |
| `updated_at` | Timestamp (TZ) | Last update timestamp (usually NULL for insert-only records) |

---

## Query Examples

### 1. Find calls with high user-to-bot latency (poor UX)
```sql
SELECT
  call_id,
  avg_user_to_bot_latency_ms,
  max_user_to_bot_latency_ms,
  avg_llm_processing_ms,
  avg_rag_processing_ms
FROM call_metrics_summary
WHERE avg_user_to_bot_latency_ms > 2000  -- Over 2 seconds
ORDER BY avg_user_to_bot_latency_ms DESC
LIMIT 20;
```

### 2. Identify bottlenecks by comparing pipeline stages
```sql
SELECT
  call_id,
  avg_stt_delay_ms AS stt,
  avg_transcript_llm_gap_ms AS t2l_gap,
  avg_rag_processing_ms AS rag,
  avg_variable_extraction_ms AS extraction,
  avg_llm_processing_ms AS llm,
  avg_llm_to_tts_gap_ms AS l2tts_gap,
  avg_user_to_bot_latency_ms AS total
FROM call_metrics_summary
WHERE avg_user_to_bot_latency_ms > 1500
ORDER BY avg_user_to_bot_latency_ms DESC;
```

### 3. Analyze RAG performance impact
```sql
SELECT
  COUNT(*) as calls_with_rag,
  AVG(avg_rag_processing_ms) as avg_rag_time,
  AVG(avg_user_to_bot_latency_ms) as avg_total_latency
FROM call_metrics_summary
WHERE avg_rag_processing_ms IS NOT NULL;
```

### 4. Track token usage and costs over time
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  SUM(total_llm_tokens) as total_tokens,
  SUM(total_tts_characters) as total_tts_chars,
  AVG(total_llm_tokens) as avg_tokens_per_call
FROM call_metrics_summary
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 5. Compare LLM TTFB vs total processing time
```sql
SELECT
  call_id,
  avg_llm_ttfb_ms,
  avg_llm_processing_ms,
  (avg_llm_processing_ms - avg_llm_ttfb_ms) as streaming_duration
FROM call_metrics_summary
WHERE avg_llm_ttfb_ms IS NOT NULL
ORDER BY streaming_duration DESC
LIMIT 20;
```

### 6. Query individual values from JSONB for histogram analysis
```sql
SELECT
  call_id,
  jsonb_array_elements_text(metrics_data->'llm_processing'->'values')::numeric as llm_time_ms
FROM call_metrics_summary
WHERE call_id = 'your-call-id-here';
```

### 7. Find calls where variable extraction was slow
```sql
SELECT
  call_id,
  avg_variable_extraction_ms,
  avg_user_to_bot_latency_ms,
  (avg_variable_extraction_ms / avg_user_to_bot_latency_ms * 100) as extraction_pct_of_latency
FROM call_metrics_summary
WHERE avg_variable_extraction_ms IS NOT NULL
  AND avg_variable_extraction_ms > 500  -- Over 500ms
ORDER BY avg_variable_extraction_ms DESC;
```

---

## Performance Optimization Tips

### Based on Metrics Analysis:

1. **High User→Bot Latency (> 2s)**
   - Check individual pipeline stages to identify bottleneck
   - Consider faster LLM model (e.g., gpt-4.1-mini vs gpt-4.1)
   - Optimize RAG queries or disable if not needed
   - Batch variable extraction instead of per-turn

2. **High LLM Processing (> 1500ms)**
   - Switch to faster model
   - Reduce context window (lower `history_window` in workflow)
   - Use streaming to start TTS earlier (check TTFB vs processing gap)

3. **High RAG Processing (> 500ms)**
   - Optimize vector store indexing
   - Use vector-only search instead of hybrid
   - Reduce chunk count (`top_k` parameter)

4. **High Variable Extraction (> 800ms)**
   - Batch multiple variables in single extraction call
   - Use faster extraction model
   - Extract only essential variables

5. **High Token Usage**
   - Reduce `history_window` in workflow config
   - Minimize system prompts
   - Use shorter agent descriptions

---

## Schema Design Rationale

### Why Both Denormalized Columns AND JSONB?

**Denormalized Columns (avg/min/max):**
- Fast SQL queries with WHERE clauses and aggregations
- Efficient indexing for time-series analytics
- Simple queries for dashboards and alerts

**JSONB (metrics_data):**
- Complete audit trail with individual values
- Flexibility for new metrics without schema changes
- Detailed analysis (histograms, percentiles)
- Preserves all data for recalculation if needed

**Trade-off:** Storage duplication (denormalized + JSONB) vs query performance and flexibility.

---

## Related Documentation

- **[CALL_STORAGE_GUIDE.md](CALL_STORAGE_GUIDE.md)** - How call data flows through the system
- **[PIPELINE_STRUCTURE.md](PIPELINE_STRUCTURE.md)** - Understanding the conversation pipeline
- **[WORKFLOW_GUIDE.md](WORKFLOW_GUIDE.md)** - Configuring workflows and variable extraction
