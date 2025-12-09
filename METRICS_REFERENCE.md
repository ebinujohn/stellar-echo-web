# Metrics Reference Guide

Comprehensive reference for all latency, performance, and cost metrics tracked by the orchestrator.

**Last Updated:** 2025-11-25

---

## Table of Contents

1. [Overview](#overview)
2. [Metrics Categories](#metrics-categories)
3. [Database Schema](#database-schema)
4. [Metrics Sources](#metrics-sources)
5. [Detailed Metrics Reference](#detailed-metrics-reference)
6. [Usage Guidelines](#usage-guidelines)

---

## Overview

The orchestrator tracks two types of metrics:

1. **LatencyTracker Metrics** - Manual wall-clock timing from application code
2. **Pipecat Metrics** - Automatic metrics from Pipecat framework observers

All metrics are stored in the `call_metrics_summary` table with both:
- **JSONB `metrics_data`** - Complete time-series data with individual values
- **Denormalized columns** - Fast SQL queries with avg/min/max pre-calculated

---

## Metrics Categories

### Speech-to-Text (STT) Metrics

| Metric | Source | Unit | Database Column | Description |
|--------|--------|------|-----------------|-------------|
| **STT Delay** | LatencyTracker | milliseconds | `avg_stt_delay_ms` | User stopped speaking → transcript received |
| **STT TTFB** | Pipecat | milliseconds | `avg_stt_ttfb_ms` | ⚠️ **Always empty** for Deepgram Flux (see below) |
| **STT Processing** | Pipecat | milliseconds | `avg_stt_processing_ms` | Total Deepgram processing time |

### Text-to-Speech (TTS) Metrics

| Metric | Source | Unit | Database Column | Description |
|--------|--------|------|-----------------|-------------|
| **TTS TTFB** | Pipecat | milliseconds | `avg_tts_ttfb_ms` | ⚠️ **Always empty** for ElevenLabs (see below) |

### LLM Metrics

| Metric | Source | Unit | Database Column | Description |
|--------|--------|------|-----------------|-------------|
| **LLM Processing** | LatencyTracker | milliseconds | `avg_llm_processing_ms` | LLM start → response complete (wall-clock) |
| **LLM TTFB** | Pipecat | milliseconds | `avg_llm_ttfb_ms` | OpenAI API call → first token |
| **LLM Tokens** | Pipecat | count | `total_llm_tokens` | Prompt + completion tokens |

### Pipeline Metrics

| Metric | Source | Unit | Database Column | Description |
|--------|--------|------|-----------------|-------------|
| **User→Bot Latency** | LatencyTracker | milliseconds | `avg_user_to_bot_latency_ms` | User stopped speaking → bot started speaking |
| **Transcript→LLM Gap** | LatencyTracker | milliseconds | `avg_transcript_llm_gap_ms` | Framework overhead between transcript and LLM |
| **LLM→TTS Gap** | LatencyTracker | milliseconds | `avg_llm_to_tts_gap_ms` | Framework overhead between LLM and TTS |
| **Pipeline Total** | LatencyTracker | milliseconds | `avg_pipeline_total_ms` | User stopped → TTS audio ready |

### Application Metrics

| Metric | Source | Unit | Database Column | Description |
|--------|--------|------|-----------------|-------------|
| **RAG Processing** | Application | milliseconds | `avg_rag_processing_ms` | Knowledge base query time |
| **Variable Extraction** | Application | milliseconds | `avg_variable_extraction_ms` | LLM-based variable extraction time |
| **TTS Characters** | Pipecat | count | `total_tts_characters` | Total characters sent to TTS |

### Post-Call Metrics

| Metric | Source | Unit | Database Table | Description |
|--------|--------|------|----------------|-------------|
| **Analysis Processing Time** | CallAnalysisService | milliseconds | `call_analysis.processing_time_ms` | AI analysis duration |

---

## Database Schema

### Primary Table: `call_metrics_summary`

**Relationship:** 1:1 with `calls` table via `call_id` (foreign key)

**Storage Strategy:**
1. **Complete time-series:** `metrics_data` (JSONB) - stores all individual values
2. **Denormalized columns:** `avg_*_ms`, `min_*_ms`, `max_*_ms` - fast SQL queries

**Example JSONB Structure:**
```json
{
  "stt_processing_time": {
    "avg": 156.5,
    "min": 120.0,
    "max": 203.0,
    "num": 15,
    "values": [156.5, 120.0, 203.0, ...]
  },
  "tts_ttfb": {
    "avg": 342.3,
    "min": 280.0,
    "max": 410.0,
    "num": 12,
    "values": [342.3, 280.0, 410.0, ...]
  }
}
```

### Secondary Table: `call_analysis`

**Relationship:** 1:1 with `calls` table via `call_id` (foreign key)

Stores post-call AI analysis results and processing time.

---

## Metrics Sources

### 1. LatencyTracker (`app/core/latency_tracker.py`)

**Purpose:** Manual wall-clock timing from application timestamps

**Tracked Metrics:**
- STT Delay (user_stopped → transcript)
- User→Bot Latency (user_stopped → bot_started)
- Transcript→LLM Gap
- LLM Processing (llm_start → llm_done)
- LLM→TTS Gap
- Pipeline Total

**Export Method:** `export_session_metrics()`

**Log Method:** `log_session_summary()`

### 2. AnalyticsObserver (`app/core/analytics_observer.py`)

**Purpose:** Capture Pipecat's built-in MetricsFrame events

**Tracked Metrics:**
- STT TTFB (via `TTFBMetricsData` from Deepgram)
- STT Processing (via `ProcessingMetricsData` from Deepgram)
- LLM TTFB (via `TTFBMetricsData` from OpenAI)
- LLM Processing (via `ProcessingMetricsData` from OpenAI)
- LLM Tokens (via `LLMUsageMetricsData`)
- TTS TTFB (via `TTFBMetricsData` from ElevenLabs)
- TTS Characters (via `TTSUsageMetricsData`)

**Processing Logic:**
- Routes metrics by processor class name (`"STT"`, `"Deepgram"`, `"TTS"`, `"ElevenLabs"`)
- Converts Pipecat's seconds to milliseconds
- **Filters out zero/near-zero values** (< 1ms) to exclude initialization frames
- Stores in `CallStorageService._metric_values`

**⚠️ Important: Streaming Granularity**

Pipecat emits metrics **continuously during streaming**, not just per-turn:
- **LLM Processing:** One metric per token generated (~50-100 samples per response)
- **STT Processing:** One metric per audio chunk processed (~5-10 samples per utterance)
- **TTS TTFB:** One metric per audio chunk generated (~3-5 samples per utterance)

This results in **high sample counts** in the Pipecat summary (e.g., 215 samples for 3 turns), which is **correct behavior**. The avg/min/max values give you insights into streaming performance, not per-turn averages.

### 3. CallStorageService (`app/services/call_storage_service.py`)

**Purpose:** Aggregate and write metrics to PostgreSQL

**Storage Methods:**
- `_build_summary_metrics()` - Aggregates all metrics
- `finalize_and_write()` - Writes to database
- `log_pipecat_metrics_summary()` - Logs Pipecat metrics

### 4. CallAnalysisService (`app/services/call_analysis_service.py`)

**Purpose:** Post-call AI analysis

**Tracked Metrics:**
- Analysis processing time (transcript fetch → result storage)

---

## Detailed Metrics Reference

### STT Metrics

#### STT Delay (LatencyTracker)
- **Column:** `avg_stt_delay_ms`, `min_stt_delay_ms`, `max_stt_delay_ms`
- **Unit:** Milliseconds
- **Formula:** `UserStoppedSpeakingFrame` timestamp → `TranscriptionFrame` timestamp
- **Expected Value:** Usually **0-10ms** for Deepgram Flux (near-instant due to VAD+transcript bundling)
- **Use Case:** End-to-end user perspective timing
- **⚠️ Note:** Shows 0ms for Deepgram Flux - use STT Processing instead

#### STT TTFB (Pipecat) ⚠️ **Always Empty for Deepgram Flux**
- **Column:** `avg_stt_ttfb_ms`, `min_stt_ttfb_ms`, `max_stt_ttfb_ms`
- **Unit:** Milliseconds
- **Formula:** Deepgram API call start → first response received
- **Expected Value:** **Always empty** for Deepgram Flux, 50-200ms for standard Deepgram
- **Use Case:** API latency monitoring (not applicable for streaming STT)

**Why STT TTFB is disabled for Deepgram Flux:**

From Pipecat's `DeepgramFluxSTTService` source code:
```python
async def start_metrics(self):
    # TTFB metrics are currently disabled for Deepgram Flux.
    # Deepgram Flux delivers both the "user started speaking" event
    # and the first transcript simultaneously, making this timing
    # measurement meaningless in this context.
    # await self.start_ttfb_metrics()  <-- COMMENTED OUT
    await self.start_processing_metrics()
```

**Technical explanation:** TTFB measures time from request → first response. For streaming STT like Deepgram Flux, audio streams continuously and transcripts arrive in real-time. The "user started speaking" detection and first transcript arrive simultaneously, resulting in TTFB ≈ 0ms, which isn't meaningful.

**Recommendation:** Use **STT Processing** metric instead for Deepgram Flux performance monitoring.

#### STT Processing (Pipecat) ⭐ **Recommended for Deepgram Flux**
- **Column:** `avg_stt_processing_ms`, `min_stt_processing_ms`, `max_stt_processing_ms`
- **Unit:** Milliseconds
- **Formula:** Total Deepgram processing time (internal Pipecat measurement)
- **Expected Value:** 100-300ms
- **Use Case:** Actual STT service performance
- **✅ Best metric for Deepgram Flux users**

### TTS Metrics

#### TTS TTFB (Pipecat) ⚠️ **Always Empty for ElevenLabs**
- **Column:** `avg_tts_ttfb_ms`, `min_tts_ttfb_ms`, `max_tts_ttfb_ms`
- **Unit:** Milliseconds
- **Formula:** ElevenLabs API call → first audio chunk received
- **Expected Value:** **Always empty** for ElevenLabs WebSocket TTS
- **Use Case:** TTS API latency monitoring (not applicable for WebSocket streaming)

**Why TTS TTFB is not emitted by ElevenLabs:**

ElevenLabs TTS uses a **persistent WebSocket connection** for streaming audio. Unlike request/response APIs where TTFB measures time from request → first byte:

1. **Connection is persistent** - No per-request "start" time
2. **Audio streams continuously** - Chunks arrive as they're generated
3. **No clear timing boundary** - Can't measure "request sent → first chunk received"

Pipecat's `ElevenLabsTTSService` has `can_generate_metrics() -> True`, but **does not call** `start_ttfb_metrics()` / `stop_ttfb_metrics()` in its implementation because the WebSocket streaming model doesn't have a meaningful TTFB concept.

**What metrics ARE available for TTS:**
- **TTS Characters** (`total_tts_characters`) - Character count for cost tracking
- **LLM→TTS Gap** (LatencyTracker) - Time from LLM complete → TTS audio ready

#### TTS Characters (Pipecat)
- **Column:** `total_tts_characters`
- **Unit:** Character count
- **Formula:** Sum of all characters sent to TTS service
- **Use Case:** Cost tracking and usage analysis

### LLM Metrics

#### LLM Processing (LatencyTracker)
- **Column:** `avg_llm_processing_ms`, `min_llm_processing_ms`, `max_llm_processing_ms`
- **Unit:** Milliseconds
- **Formula:** `mark_llm_started()` → `mark_llm_completed()` (wall-clock)
- **Expected Value:** 400-2000ms depending on model and response length
- **Use Case:** End-to-end LLM latency from application perspective
- **Note:** Overwrites Pipecat's LLM processing metric

#### LLM TTFB (Pipecat)
- **Column:** `avg_llm_ttfb_ms`, `min_llm_ttfb_ms`, `max_llm_ttfb_ms`
- **Unit:** Milliseconds
- **Formula:** OpenAI API call → first token received
- **Expected Value:** 200-800ms
- **Use Case:** LLM API responsiveness

#### LLM Tokens (Pipecat)
- **Column:** `total_llm_tokens`
- **Unit:** Token count
- **Formula:** Sum of prompt tokens + completion tokens
- **Use Case:** Cost tracking and usage analysis

### Pipeline Metrics

#### User→Bot Latency (LatencyTracker)
- **Column:** `avg_user_to_bot_latency_ms`, `min_user_to_bot_latency_ms`, `max_user_to_bot_latency_ms`
- **Unit:** Milliseconds
- **Formula:** `UserStoppedSpeakingFrame` → `BotStartedSpeakingFrame`
- **Expected Value:** 500-2500ms
- **Use Case:** **Primary UX metric** - How long user waits for bot response
- **✅ Most important metric for user experience**

#### Transcript→LLM Gap (LatencyTracker)
- **Column:** `avg_transcript_llm_gap_ms`, `min_transcript_llm_gap_ms`, `max_transcript_llm_gap_ms`
- **Unit:** Milliseconds
- **Formula:** Transcript received → LLM start (excludes variable extraction time)
- **Expected Value:** 1-50ms
- **Use Case:** Framework overhead analysis

#### LLM→TTS Gap (LatencyTracker)
- **Column:** `avg_llm_to_tts_gap_ms`, `min_llm_to_tts_gap_ms`, `max_llm_to_tts_gap_ms`
- **Unit:** Milliseconds
- **Formula:** LLM complete → TTS audio ready
- **Expected Value:** 100-300ms
- **Use Case:** Framework overhead analysis

#### Pipeline Total (LatencyTracker)
- **Column:** `avg_pipeline_total_ms`, `min_pipeline_total_ms`, `max_pipeline_total_ms`
- **Unit:** Milliseconds
- **Formula:** User stopped speaking → TTS audio ready
- **Expected Value:** 500-3000ms
- **Use Case:** Total system latency
- **Note:** Should approximately equal User→Bot Latency

### Application Metrics

#### RAG Processing (Application)
- **Column:** `avg_rag_processing_ms`, `min_rag_processing_ms`, `max_rag_processing_ms`
- **Unit:** Milliseconds
- **Formula:** RAG query start → retrieval complete
- **Expected Value:** 300-800ms
- **Use Case:** Knowledge base performance monitoring
- **Tracking:** Manual via `mark_rag_started()` / `mark_rag_completed()`

#### Variable Extraction (Application)
- **Column:** `avg_variable_extraction_ms`, `min_variable_extraction_ms`, `max_variable_extraction_ms`
- **Unit:** Milliseconds
- **Formula:** Extraction LLM call start → complete
- **Expected Value:** 500-2000ms
- **Use Case:** Variable extraction performance
- **Tracking:** Manual via `mark_extraction_started()` / `mark_extraction_completed()`

### Post-Call Metrics

#### Analysis Processing Time (CallAnalysisService)
- **Table:** `call_analysis`
- **Column:** `processing_time_ms`
- **Unit:** Milliseconds
- **Formula:** Transcript fetch → analysis result stored
- **Expected Value:** 1000-5000ms
- **Use Case:** Post-call analysis performance
- **Note:** Runs asynchronously, doesn't affect call latency

---

## Usage Guidelines

### For Performance Monitoring

**Primary Metrics to Watch:**
1. **User→Bot Latency** (`avg_user_to_bot_latency_ms`) - Most important UX metric
2. **STT Processing** (`avg_stt_processing_ms`) - STT performance (especially for Deepgram Flux)
3. **LLM Processing** (`avg_llm_processing_ms`) - LLM latency
4. **LLM TTFB** (`avg_llm_ttfb_ms`) - LLM API responsiveness (first token time)

> **Note:** STT TTFB and TTS TTFB are not available with Deepgram Flux + ElevenLabs (see detailed explanations above).

### For Cost Tracking

**Primary Metrics:**
1. **LLM Tokens** (`total_llm_tokens`) - OpenAI costs
2. **TTS Characters** (`total_tts_characters`) - ElevenLabs costs

### For Debugging Latency Issues

**Investigation Path:**
1. Check **User→Bot Latency** - Is it high?
2. Break down by component:
   - **STT Processing** - Is STT slow?
   - **LLM Processing** - Is LLM slow?
   - **LLM TTFB** - Is LLM API slow to respond?
3. Check gaps:
   - **Transcript→LLM Gap** - Framework overhead?
   - **LLM→TTS Gap** - Framework overhead? (also reflects TTS latency)
4. Check additional processing:
   - **RAG Processing** - Is knowledge retrieval slow?
   - **Variable Extraction** - Is extraction adding latency?

### SQL Query Examples

#### Get Average Metrics for Last 100 Calls
```sql
SELECT
  AVG(avg_user_to_bot_latency_ms) as avg_response_time,
  AVG(avg_stt_processing_ms) as avg_stt_time,
  AVG(avg_llm_processing_ms) as avg_llm_time,
  AVG(avg_tts_ttfb_ms) as avg_tts_time,
  SUM(total_llm_tokens) as total_tokens,
  SUM(total_tts_characters) as total_characters
FROM call_metrics_summary cms
JOIN calls c ON c.call_id = cms.call_id
WHERE c.status = 'ended'
ORDER BY c.started_at DESC
LIMIT 100;
```

#### Find Slow Calls (>2s response time)
```sql
SELECT
  c.call_id,
  c.started_at,
  cms.avg_user_to_bot_latency_ms,
  cms.avg_stt_processing_ms,
  cms.avg_llm_processing_ms,
  cms.avg_tts_ttfb_ms
FROM calls c
JOIN call_metrics_summary cms ON c.call_id = cms.call_id
WHERE cms.avg_user_to_bot_latency_ms > 2000
ORDER BY c.started_at DESC;
```

#### Cost Analysis by Agent
```sql
SELECT
  a.name as agent_name,
  COUNT(c.call_id) as total_calls,
  SUM(cms.total_llm_tokens) as total_tokens,
  SUM(cms.total_tts_characters) as total_characters,
  AVG(cms.avg_user_to_bot_latency_ms) as avg_response_time
FROM calls c
JOIN call_metrics_summary cms ON c.call_id = cms.call_id
JOIN agents a ON c.agent_id = a.id
WHERE c.status = 'ended'
  AND c.started_at >= NOW() - INTERVAL '7 days'
GROUP BY a.name
ORDER BY total_tokens DESC;
```

---

## Interpreting Metrics

### Understanding Sample Counts

**LatencyTracker metrics** have samples ≈ number of turns:
```
Variable Extractions: avg=1399ms | queries=3  ← 3 turns, 3 samples
```

**Pipecat metrics** have samples >> number of turns (streaming granularity):
```
LLM Processing: avg=611ms | samples=215  ← 3 turns, but 215 token-level samples
STT Processing: avg=803ms | samples=14   ← 3 turns, but 14 chunk-level samples
TTS TTFB: avg=334ms | samples=10         ← 3 turns, but 10 chunk-level samples
```

**Why the difference?**
- **LatencyTracker:** Manual timing at turn boundaries (one sample per turn)
- **Pipecat:** Automatic timing during streaming (many samples per turn)

**What do the Pipecat avg/min/max values represent?**
- **Average:** Mean latency across all chunks/tokens (streaming performance)
- **Min:** Fastest chunk/token processed (best-case streaming speed)
- **Max:** Slowest chunk/token processed (worst-case streaming speed)

**Example Interpretation:**
```
LLM Processing: avg=611ms | min=0ms | max=3462ms | samples=215
```
- 215 samples across 3 turns ≈ 72 tokens per turn
- Average time per token: 611ms (but this includes streaming overhead)
- Some tokens were instant (min=0ms after filtering kicks in)
- Slowest token took 3.4 seconds (likely first token TTFB)

**⚠️ Use LatencyTracker metrics for per-turn analysis:**
- `User→Bot Response` = actual user-perceived latency per turn
- `LLM Processing` = actual end-to-end LLM time per turn

**Use Pipecat metrics for streaming performance analysis:**
- Per-token generation speed
- Streaming consistency (min vs max spread)
- Service-level performance (excluding framework overhead)

---

## Session Summary Output

### LatencyTracker Summary (Console Logs)
```
============================================================
Session Summary | <session_id> | Turns: 3
============================================================
STT Delay:              avg=0ms | min=0ms | max=0ms
User→Bot Response:      avg=1474ms | min=726ms | max=2222ms
Transcript→LLM Gap:     avg=3ms | min=3ms | max=3ms
RAG Processing:         avg=450ms | min=320ms | max=580ms | queries=5
Variable Extractions:   avg=1399ms | min=1399ms | max=1399ms | queries=3
LLM Processing:         avg=582ms | min=483ms | max=682ms
LLM→TTS Gap:            avg=189ms | min=137ms | max=241ms
TTS TTFB:               avg=342ms | min=280ms | max=410ms
Pipeline Total:         avg=1474ms | min=726ms | max=2222ms
Interruptions:          1 (33.3% of turns)
============================================================
```

### Pipecat Metrics Summary (Console Logs)
```
============================================================
Pipecat Metrics Summary | call_id=<uuid>
============================================================
STT TTFB:               No data
STT Processing:         avg=156ms | min=120ms | max=203ms | samples=15
LLM TTFB:               avg=245ms | min=180ms | max=320ms | samples=12
LLM Processing:         avg=580ms | min=483ms | max=682ms | samples=12
TTS TTFB:               No data
============================================================
Note: These metrics are automatically captured by Pipecat.
STT TTFB and TTS TTFB show 'No data' - this is expected
(see "Why STT/TTS TTFB are empty" sections above).
============================================================
```

### Why Some Metrics Show "No data"

| Metric | Status | Reason |
|--------|--------|--------|
| **STT TTFB** | Always empty | Deepgram Flux delivers speech detection + transcript simultaneously |
| **TTS TTFB** | Always empty | ElevenLabs WebSocket streaming has no request/response boundary |
| **LLM TTFB** | ✅ Works | OpenAI has clear request → first token timing |
| **STT Processing** | ✅ Works | Deepgram emits processing time metrics |
| **LLM Processing** | ✅ Works | OpenAI emits processing time metrics |

This is a **Pipecat framework limitation**, not a bug in our implementation. Streaming services (Deepgram Flux, ElevenLabs WebSocket) don't have the request/response timing boundaries that TTFB requires.

---

## Changelog

### 2025-11-25 (Latest)
- **Documented:** Why STT TTFB is always empty for Deepgram Flux (Pipecat disables it by design)
- **Documented:** Why TTS TTFB is always empty for ElevenLabs (WebSocket streaming has no TTFB concept)
- **Added:** "Why Some Metrics Show 'No data'" summary table
- **Updated:** Usage guidelines to remove TTS TTFB from primary metrics
- **Added:** STTMuteFilter integration for intelligent speech muting (see PIPELINE_STRUCTURE.md)

### 2025-11-20
- **Fixed:** Added filtering for zero/near-zero metrics (< 1ms) in AnalyticsObserver
- **Documented:** Streaming granularity behavior (high sample counts are correct)
- **Added:** "Interpreting Metrics" section explaining sample count differences
- **Clarified:** LatencyTracker (per-turn) vs Pipecat (per-chunk/token) metrics

### 2025-11-20 (Initial)
- Added STT TTFB and STT Processing metrics (6 new columns)
- Added TTS TTFB metrics (3 new columns)
- Enhanced AnalyticsObserver to differentiate STT/LLM/TTS metrics
- Added `log_pipecat_metrics_summary()` for console output
- Total: 9 new database columns

### Prior
- Initial metrics implementation with LatencyTracker
- RAG and Variable Extraction metrics
- Post-call AI analysis
