# Call Storage Guide - PostgreSQL Implementation

**Complete guide to the PostgreSQL-based call data storage system**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [CallStorageService API](#callstorageservice-api)
5. [Integration Guide](#integration-guide)
6. [Querying Call Data](#querying-call-data)
7. [Partition Management](#partition-management)
8. [Migration from DynamoDB](#migration-from-dynamodb)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

---

## Overview

The call storage system uses PostgreSQL with a **normalized relational design** to store comprehensive call data including:

- ✅ Full conversation transcripts (text + structured JSONB)
- ✅ Individual messages with turn tracking
- ✅ Performance metrics (TTFB, latency, tokens, TTS)
- ✅ Workflow transitions and node changes
- ✅ RAG knowledge base retrievals with full chunks
- ✅ Variable extractions with confidence
- ✅ AI analysis (sentiment, topics, keywords)
- ✅ User interruption events

### Key Features

- **Normalized Schema** - 9 specialized tables for efficient queries
- **Monthly Partitioning** - Automatic data distribution for scalability
- **Full-Text Search** - GIN indexes on transcripts and chunks
- **Type Safety** - PostgreSQL enums for metric types
- **1-Year Retention** - Automated cleanup of old partitions
- **Transaction Safety** - All writes in single ACID transaction
- **Zero Latency** - In-memory buffering during calls

---

## Architecture

### Data Flow

```
Call Start
    ↓
WebSocketHandler creates CallStorageService
    ↓
During Call: In-Memory Buffering
    ├─ record_message() → _messages[] buffer
    ├─ record_transition() → _transitions[] buffer
    ├─ record_metric() → _metrics[] buffer
    ├─ record_rag_retrieval() → _rag_retrievals[] buffer
    ├─ record_variable_extraction() → _variable_extractions[] buffer
    └─ record_user_interruption() → _interruptions[] buffer
    ↓
Call End: finalize_and_write()
    ↓
Single PostgreSQL Transaction Writes:
    ├─ calls table (metadata + summary metrics)
    ├─ call_transcripts (full text + JSONB)
    ├─ call_messages (partitioned)
    ├─ call_transitions (partitioned)
    ├─ call_metrics (partitioned)
    ├─ call_rag_retrievals + call_rag_chunks (partitioned)
    ├─ call_extracted_variables
    ├─ call_analysis (if available)
    └─ call_user_interruptions
    ↓
PostgreSQL Commit (ACID)
```

### Components

1. **CallStorageService** (`app/services/call_storage_service.py`)
   - Main service for call data storage
   - In-memory buffering pattern
   - Single transaction write at call end

2. **Database Models** (`app/models/database.py`)
   - SQLAlchemy ORM models
   - Type-safe enums (MetricType, etc.)
   - Relationship definitions

3. **Migration** (`alembic/versions/001_consolidated_postgresql_call_storage.py`)
   - Creates all tables, indexes, partitions
   - Partition management functions

4. **Integration Points**
   - `WebSocketHandler` - Service initialization
   - `AnalyticsObserver` - Metric recording
   - `NodeManager` - Transition/variable recording
   - `RAGProcessor` - RAG retrieval recording
   - `InterruptionHandler` - Interruption recording

---

## Database Schema

### Table Overview

| Table | Purpose | Partitioned | Retention |
|-------|---------|-------------|-----------|
| `calls` | Call metadata + summary metrics (includes direction) | No | 1 year |
| `call_transcripts` | Full conversation text + JSONB | No | 1 year |
| `call_messages` | Individual messages | Monthly | 1 year |
| `call_transitions` | Workflow node changes | Monthly | 1 year |
| `call_metrics` | Performance measurements | Monthly | 1 year |
| `call_rag_retrievals` | RAG queries | Monthly | 1 year |
| `call_rag_chunks` | Retrieved knowledge chunks | No | 1 year |
| `call_extracted_variables` | Variable extractions | No | 1 year |
| `call_analysis` | AI insights | No | 1 year |
| `call_user_interruptions` | Interruption events | No | 1 year |

### Entity Relationships

```
calls (1) ──┬──→ (1) call_transcripts
            ├──→ (*) call_messages
            ├──→ (*) call_transitions
            ├──→ (*) call_metrics
            ├──→ (*) call_rag_retrievals ──→ (*) call_rag_chunks
            ├──→ (*) call_extracted_variables
            ├──→ (0..1) call_analysis
            └──→ (*) call_user_interruptions
```

### Key Columns

#### calls
```sql
call_id UUID PRIMARY KEY                -- Unique call identifier
tenant_id UUID NOT NULL                 -- Tenant/organization
agent_id UUID NOT NULL                  -- Agent configuration used
started_at TIMESTAMPTZ NOT NULL         -- Call start time
ended_at TIMESTAMPTZ                    -- Call end time
status VARCHAR(50)                      -- 'in_progress' | 'ended' | 'error'
duration_seconds INTEGER                -- Total call duration
direction call_direction_enum           -- 'inbound' | 'outbound' (default: 'inbound')

-- Summary metrics (for fast queries without joins)
total_turns INTEGER                     -- Number of conversation turns
total_messages INTEGER                  -- Total message count
total_transitions INTEGER               -- Total node transitions
avg_llm_ttfb_ms NUMERIC(10,2)          -- Average LLM TTFB
total_llm_tokens INTEGER                -- Total tokens used
-- ... 16 more summary metrics
```

#### call_messages (partitioned by timestamp)
```sql
id UUID PRIMARY KEY
call_id UUID NOT NULL                   -- FK to calls
sequence INTEGER NOT NULL               -- Message order (1, 2, 3...)
timestamp TIMESTAMPTZ NOT NULL          -- Message timestamp
role VARCHAR(50) NOT NULL               -- 'user' | 'assistant' | 'system'
content TEXT NOT NULL                   -- Message text
node_id VARCHAR(255)                    -- Current workflow node
turn_number INTEGER                     -- Conversation turn
was_interrupted BOOLEAN                 -- If message was interrupted
```

#### call_metrics (partitioned by timestamp)
```sql
id UUID PRIMARY KEY
call_id UUID NOT NULL                   -- FK to calls
timestamp TIMESTAMPTZ NOT NULL          -- Metric timestamp
metric_type metric_type_enum NOT NULL   -- 'llm_ttfb' | 'user_to_bot_latency' | etc.
value NUMERIC(15,4) NOT NULL            -- Metric value
processor VARCHAR(255)                  -- Source processor name
turn_number INTEGER                     -- Associated turn
node_id VARCHAR(255)                    -- Associated node
```

#### call_rag_retrievals (partitioned by timestamp)
```sql
id UUID PRIMARY KEY
call_id UUID NOT NULL                   -- FK to calls
timestamp TIMESTAMPTZ NOT NULL          -- Query timestamp
query_sequence INTEGER NOT NULL         -- Query order (1, 2, 3...)
query_text TEXT NOT NULL                -- Search query
search_mode search_mode_enum            -- 'vector' | 'fts' | 'hybrid'
chunks_retrieved INTEGER                -- Number of chunks returned
top_k INTEGER                           -- Max chunks requested
processing_time_ms NUMERIC(10,2)        -- Query duration
query_params JSONB                      -- Search parameters
```

#### call_rag_chunks
```sql
id UUID PRIMARY KEY
retrieval_id UUID NOT NULL              -- FK to call_rag_retrievals (CASCADE)
chunk_rank INTEGER NOT NULL             -- Result rank (1, 2, 3...)
chunk_id INTEGER NOT NULL               -- Original chunk ID
content TEXT NOT NULL                   -- Full chunk text
document_id INTEGER                     -- Source document ID
filename VARCHAR(500)                   -- Source filename
s3_key VARCHAR(1000)                    -- S3 object key
chunk_index INTEGER                     -- Chunk position in document
token_count INTEGER                     -- Chunk size in tokens
score NUMERIC(5,4) NOT NULL             -- Relevance score (0-1)
```

#### call_transitions (partitioned by timestamp)
```sql
id UUID PRIMARY KEY
call_id UUID NOT NULL                   -- FK to calls
timestamp TIMESTAMPTZ NOT NULL          -- Transition time
sequence INTEGER NOT NULL               -- Transition order
from_node_id VARCHAR(255)               -- Source node
to_node_id VARCHAR(255) NOT NULL        -- Destination node
reason VARCHAR(255)                     -- Transition reason
condition VARCHAR(500)                  -- Matched condition
turn_number INTEGER                     -- Associated turn
from_node_name VARCHAR(500)             -- Source node display name
to_node_name VARCHAR(500)               -- Destination node display name
```

### Indexes

**Partitioned Tables (BRIN indexes for time-series):**
```sql
-- call_messages
CREATE INDEX idx_messages_timestamp_brin ON call_messages USING BRIN (timestamp);
CREATE INDEX idx_messages_call_sequence ON call_messages (call_id, sequence);
CREATE INDEX idx_messages_role ON call_messages (role);
CREATE INDEX idx_messages_node ON call_messages (node_id);

-- call_metrics
CREATE INDEX idx_metrics_timestamp_brin ON call_metrics USING BRIN (timestamp);
CREATE INDEX idx_metrics_call_type ON call_metrics (call_id, metric_type);
CREATE INDEX idx_metrics_type ON call_metrics (metric_type);

-- call_transitions
CREATE INDEX idx_transitions_timestamp_brin ON call_transitions USING BRIN (timestamp);
CREATE INDEX idx_transitions_call_seq ON call_transitions (call_id, sequence);
CREATE INDEX idx_transitions_nodes ON call_transitions (from_node_id, to_node_id);

-- call_rag_retrievals
CREATE INDEX idx_rag_timestamp_brin ON call_rag_retrievals USING BRIN (timestamp);
CREATE INDEX idx_rag_call_seq ON call_rag_retrievals (call_id, query_sequence);
CREATE INDEX idx_rag_mode ON call_rag_retrievals (search_mode);
```

**Full-Text Search:**
```sql
-- call_transcripts
CREATE INDEX idx_transcript_text_fts ON call_transcripts
    USING GIN (to_tsvector('english', transcript_text));
CREATE INDEX idx_transcript_data_gin ON call_transcripts
    USING GIN (transcript_data);

-- call_rag_chunks
CREATE INDEX idx_chunk_content_fts ON call_rag_chunks
    USING GIN (to_tsvector('english', content));
```

**Other Indexes:**
```sql
-- calls table
CREATE INDEX idx_calls_tenant_agent ON calls (tenant_id, agent_id);
CREATE INDEX idx_calls_started_at ON calls (started_at);
CREATE INDEX idx_calls_status ON calls (status);
CREATE INDEX idx_call_direction ON calls (direction);

-- call_analysis
CREATE INDEX idx_analysis_sentiment ON call_analysis (sentiment);
CREATE INDEX idx_analysis_success ON call_analysis (call_successful);
```

---

## CallStorageService API

### Initialization

```python
from app.services.call_storage_service import CallStorageService
from app.core.database import get_postgres_client
from uuid import UUID, uuid4

# Create service for new call
call_storage = CallStorageService(
    postgres_client=get_postgres_client(),
    call_id=uuid4(),                        # New UUID for call
    tenant_id=UUID("..."),                  # Tenant UUID
    agent_id=UUID("..."),                   # Agent UUID
    agent_version="1.0.0",                  # Optional version
    agent_name="My Agent",
    from_number="+1234567890",
    to_number="+0987654321",
    twilio_call_sid="CA...",                # Optional Twilio SID
    twilio_stream_sid="MZ...",              # Optional stream SID
    recording_enabled=True,
    direction="inbound",                    # 'inbound' (default) or 'outbound'
)

# Set initial node (not a constructor parameter)
call_storage.initial_node = "greeting"
```

### Recording Methods

#### 1. Record Message
```python
call_storage.record_message(
    role="user",                    # 'user' | 'assistant' | 'system'
    content="Hello, how are you?",
    node_id="greeting",             # Optional current node
    turn_number=1,                  # Optional turn number
    was_interrupted=False,          # Optional interruption flag
)
```

#### 2. Record Transition
```python
call_storage.record_transition(
    from_node_id="greeting",        # Optional source node
    to_node_id="main_menu",
    reason="workflow_transition",
    condition="always",             # Optional matched condition
    turn_number=1,                  # Optional turn number
    from_node_name="Greeting",      # Optional display names
    to_node_name="Main Menu",
)
```

#### 3. Record Metric
```python
from app.models.database import MetricType

call_storage.record_metric(
    metric_type=MetricType.LLM_TTFB,    # Enum value or string
    value=0.234,                         # Float value
    processor="OpenAILLMService",        # Optional processor name
    turn_number=1,                       # Optional turn number
)

# Available metric types:
# - STT_DELAY
# - USER_TO_BOT_LATENCY
# - TRANSCRIPT_LLM_GAP
# - RAG_PROCESSING_TIME
# - VARIABLE_EXTRACTION_TIME
# - LLM_TTFB
# - LLM_PROCESSING_TIME
# - LLM_TO_TTS_GAP
# - TOTAL_PIPELINE_TIME
# - LLM_PROMPT_TOKENS
# - LLM_COMPLETION_TOKENS
# - TTS_CHARACTERS
```

#### 4. Record RAG Retrieval
```python
call_storage.record_rag_retrieval(
    query="What is GLP-1?",
    query_params={
        "search_mode": "hybrid",
        "top_k": 5,
        "rrf_k": 60,
    },
    chunks=[
        {
            "chunk_id": 123,
            "content": "GLP-1 is a hormone...",
            "document_id": 45,
            "filename": "medical_guide.pdf",
            "s3_key": "docs/medical_guide.pdf",
            "chunk_index": 12,
            "token_count": 150,
            "score": 0.945,
        },
        # ... more chunks
    ],
    processing_time_ms=245.3,
    node_id="info_lookup",          # Optional current node
    turn_number=2,                  # Optional turn number
)
```

#### 5. Record Variable Extraction
```python
call_storage.record_variable_extraction(
    variables_requested=["first_name", "last_name", "topic"],
    variables_extracted={
        "first_name": "John",
        "last_name": "Smith",
        "topic": "diabetes",
    },
    success=True,                   # True if all variables extracted
    processing_time_ms=680.5,
    node_id="extract_info",         # Optional current node
    turn_number=1,                  # Optional turn number
)
```

#### 6. Record User Interruption
```python
call_storage.record_user_interruption(
    interrupted_at_turn=3,
    node_id="explanation",          # Optional current node
)
```

### Update Methods

#### Update Recording Info
```python
call_storage.update_recording_info(
    recording_sid="RE...",
    recording_url="https://api.twilio.com/..."
)
```

#### Update Status
```python
call_storage.update_status(
    status="ended",                 # 'in_progress' | 'ended' | 'error'
    error_message=None,             # Optional error message
)
```

#### Set Final Node
```python
call_storage.final_node = "goodbye"
```

### Finalize and Write

```python
# Write all buffered data to PostgreSQL
success = await call_storage.finalize_and_write(
    status="ended",                 # Final status
    error_message=None,             # Optional error message
)

if success:
    print("✅ Call data written to PostgreSQL")
else:
    print("❌ Failed to write call data")
    # Data lost - check logs for errors
```

**⚠️ Important:**
- Must call `finalize_and_write()` at end of every call
- All buffered data written in single transaction
- If write fails, all call data is lost (check error logs)

---

## Integration Guide

### WebSocketHandler Integration

```python
from app.services.call_storage_service import CallStorageService
from app.core.database import get_postgres_client
from uuid import UUID

# 1. Create service at call start
call_storage_service = CallStorageService(
    postgres_client=get_postgres_client(),
    call_id=call_id,
    tenant_id=UUID(agent_config.agent.tenant_id),
    agent_id=UUID(agent_config.agent.id),
    agent_name=agent_config.agent.name,
    from_number=from_number,
    to_number=to_number,
    twilio_call_sid=call_sid,
    twilio_stream_sid=stream_sid,
    recording_enabled=agent_config.workflow.recording.enabled,
)

# 2. Set initial node
if agent_config.workflow:
    call_storage_service.initial_node = agent_config.workflow.initial_node

# 3. Pass to observers and processors
analytics_observer = AnalyticsObserver(
    call_storage_service=call_storage_service,
)

node_manager = NodeManager(
    workflow=agent_config.workflow,
    # ... other params
    call_storage_service=call_storage_service,
)

rag_processor.call_storage_service = call_storage_service

# 4. Finalize at call end (in finally block)
try:
    # ... run pipeline
    pass
finally:
    # Get final node from NodeManager
    summary = node_manager.get_session_summary()
    call_storage_service.final_node = summary["current_node"]

    # Write all data
    success = await call_storage_service.finalize_and_write(
        status="ended",
        error_message=None,
    )

    if success:
        logger.info(f"✅ Call data written | call_id={call_id}")
    else:
        logger.error(f"❌ Failed to write call data | call_id={call_id}")
```

### AnalyticsObserver Integration

```python
class AnalyticsObserver(BaseObserver):
    def __init__(self, call_storage_service):
        self.call_history = call_storage_service
        # ...

    async def on_push_frame(self, data: FramePushed):
        frame = data.frame

        # Record metrics
        if isinstance(frame, MetricsFrame):
            for metric_data in frame.data:
                if isinstance(metric_data, TTFBMetricsData):
                    self.call_history.record_metric(
                        metric_type=MetricType.LLM_TTFB,
                        value=metric_data.value,
                        processor=processor_name,
                        turn_number=self._turn_number,
                    )

        # Record messages
        if isinstance(frame, BotStoppedSpeakingFrame):
            if self._accumulated_text:
                full_text = "".join(self._accumulated_text)
                self.call_history.record_message(
                    role="assistant",
                    content=full_text,
                    node_id=self._current_node_id,
                    turn_number=self._turn_number,
                    was_interrupted=False,
                )
```

### NodeManager Integration

```python
class NodeManager(FrameProcessor):
    def __init__(self, workflow, call_storage_service, ...):
        self.call_storage_service = call_storage_service
        # ...

    async def _handle_user_input(self, user_input: str):
        # Record user message
        if self.call_storage_service:
            self.call_storage_service.record_message(
                role="user",
                content=user_input,
                node_id=self.current_node.id,
                turn_number=self.turn_count,
                was_interrupted=False,
            )

    async def _transition_to_node(self, target_node_id: str):
        # Record transition
        if self.call_storage_service:
            self.call_storage_service.record_transition(
                from_node_id=old_node_id,
                to_node_id=target_node_id,
                reason="workflow_transition",
                condition=None,
                turn_number=self.turn_count,
                from_node_name=from_node_name,
                to_node_name=to_node_name,
            )

    async def _extract_variable(self, node: NodeConfig):
        # ... extraction logic

        # Record extraction
        if self.call_storage_service:
            self.call_storage_service.record_variable_extraction(
                variables_requested=variables_requested,
                variables_extracted=variables_extracted,
                success=all_success,
                processing_time_ms=extraction_time_ms,
                node_id=node_id,
                turn_number=self.turn_count,
            )
```

### RAGProcessor Integration

```python
class RAGProcessor(FrameProcessor):
    def __init__(self, rag_service, ...):
        self.call_storage_service = None  # Set externally
        # ...

    async def process_frame(self, frame, direction):
        # ... RAG retrieval logic
        chunks = self.rag_service.search(frame.text)

        # Record retrieval
        if self.call_storage_service:
            comprehensive_chunks = [
                {
                    "chunk_id": chunk.id,
                    "content": chunk.content,
                    "document_id": chunk.document_id,
                    "filename": chunk.filename,
                    "s3_key": chunk.s3_key,
                    "chunk_index": chunk.chunk_index,
                    "token_count": chunk.token_count,
                    "score": chunk.score,
                }
                for chunk in chunks
            ]

            self.call_storage_service.record_rag_retrieval(
                query=frame.text,
                query_params={"search_mode": self.rag_service.search_mode, ...},
                chunks=comprehensive_chunks,
                processing_time_ms=processing_time_ms,
                node_id=self._current_node_id,
                turn_number=self._turn_number,
            )
```

---

## Querying Call Data

### Basic Queries

#### Get All Calls for Tenant
```python
from app.models.database import Call
from app.core.database import get_postgres_client
from uuid import UUID

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(Call)
        .where(Call.tenant_id == tenant_id)
        .order_by(Call.started_at.desc())
        .limit(100)
    )
    calls = result.scalars().all()
```

#### Get Outbound Calls Only
```python
async with get_postgres_client().session() as session:
    result = await session.execute(
        select(Call)
        .where(
            Call.tenant_id == tenant_id,
            Call.direction == "outbound",
        )
        .order_by(Call.started_at.desc())
        .limit(100)
    )
    outbound_calls = result.scalars().all()
```

#### Get Call with All Related Data
```python
from sqlalchemy.orm import selectinload

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(Call)
        .where(Call.call_id == call_id)
        .options(
            selectinload(Call.transcript),
            selectinload(Call.messages),
            selectinload(Call.transitions),
            selectinload(Call.metrics),
            selectinload(Call.rag_retrievals).selectinload(CallRAGRetrieval.chunks),
            selectinload(Call.extracted_variables),
            selectinload(Call.analysis),
            selectinload(Call.interruptions),
        )
    )
    call = result.scalar_one_or_none()

    if call:
        print(f"Messages: {len(call.messages)}")
        print(f"Transitions: {len(call.transitions)}")
        print(f"RAG queries: {len(call.rag_retrievals)}")
```

#### Get Full Transcript
```python
from app.models.database import CallTranscript

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(CallTranscript)
        .where(CallTranscript.call_id == call_id)
    )
    transcript = result.scalar_one_or_none()

    if transcript:
        print(transcript.transcript_text)      # Plain text
        print(transcript.transcript_data)      # JSONB with structure
```

### Advanced Queries

#### Search Transcripts (Full-Text)
```python
from sqlalchemy import func

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(CallTranscript)
        .where(
            func.to_tsvector('english', CallTranscript.transcript_text)
            .op('@@')(func.plainto_tsquery('english', 'diabetes medication'))
        )
        .limit(50)
    )
    matching_transcripts = result.scalars().all()
```

#### Get Performance Metrics for Call
```python
from app.models.database import CallMetric, MetricType

async with get_postgres_client().session() as session:
    # Get average TTFB
    result = await session.execute(
        select(func.avg(CallMetric.value))
        .where(
            CallMetric.call_id == call_id,
            CallMetric.metric_type == MetricType.LLM_TTFB,
        )
    )
    avg_ttfb = result.scalar()

    # Get all metrics grouped by type
    result = await session.execute(
        select(
            CallMetric.metric_type,
            func.avg(CallMetric.value).label('avg'),
            func.min(CallMetric.value).label('min'),
            func.max(CallMetric.value).label('max'),
            func.count(CallMetric.id).label('count'),
        )
        .where(CallMetric.call_id == call_id)
        .group_by(CallMetric.metric_type)
    )
    metrics_summary = result.all()
```

#### Get Conversation Flow
```python
from app.models.database import CallTransition

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(CallTransition)
        .where(CallTransition.call_id == call_id)
        .order_by(CallTransition.sequence)
    )
    transitions = result.scalars().all()

    # Build flow diagram
    for t in transitions:
        print(f"{t.sequence}. {t.from_node_name or t.from_node_id} → "
              f"{t.to_node_name or t.to_node_id} ({t.reason})")
```

#### Get RAG Retrievals with Chunks
```python
from app.models.database import CallRAGRetrieval, CallRAGChunk

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(CallRAGRetrieval)
        .where(CallRAGRetrieval.call_id == call_id)
        .options(selectinload(CallRAGRetrieval.chunks))
        .order_by(CallRAGRetrieval.query_sequence)
    )
    retrievals = result.scalars().all()

    for retrieval in retrievals:
        print(f"\nQuery #{retrieval.query_sequence}: {retrieval.query_text}")
        print(f"Mode: {retrieval.search_mode}, Chunks: {retrieval.chunks_retrieved}")
        for chunk in retrieval.chunks:
            print(f"  [{chunk.chunk_rank}] Score: {chunk.score:.3f} - "
                  f"{chunk.filename} (chunk {chunk.chunk_index})")
            print(f"      {chunk.content[:100]}...")
```

### Analytics Queries

#### Agent Performance Dashboard
```python
from sqlalchemy import func, and_
from datetime import datetime, timedelta

async with get_postgres_client().session() as session:
    # Last 30 days
    since = datetime.utcnow() - timedelta(days=30)

    result = await session.execute(
        select(
            Call.agent_id,
            func.count(Call.call_id).label('total_calls'),
            func.avg(Call.duration_seconds).label('avg_duration'),
            func.avg(Call.total_turns).label('avg_turns'),
            func.avg(Call.avg_llm_ttfb_ms).label('avg_ttfb'),
            func.sum(Call.total_llm_tokens).label('total_tokens'),
        )
        .where(Call.started_at >= since)
        .group_by(Call.agent_id)
    )
    stats = result.all()
```

#### Search Calls by Keywords
```python
from app.models.database import CallAnalysis

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(Call)
        .join(CallAnalysis)
        .where(CallAnalysis.keywords_detected.contains(['diabetes', 'insurance']))
        .options(selectinload(Call.analysis))
    )
    matching_calls = result.scalars().all()
```

#### Successful Calls Rate
```python
from app.models.database import CallAnalysis

async with get_postgres_client().session() as session:
    result = await session.execute(
        select(
            func.count(CallAnalysis.id).label('total'),
            func.sum(
                func.cast(CallAnalysis.call_successful, Integer)
            ).label('successful'),
        )
        .where(CallAnalysis.call_id.in_(
            select(Call.call_id).where(Call.started_at >= since)
        ))
    )
    stats = result.one()
    success_rate = (stats.successful / stats.total) * 100 if stats.total > 0 else 0
```

---

## Partition Management

### Overview

Four tables use **monthly partitioning** for scalability:
- `call_messages`
- `call_transitions`
- `call_metrics`
- `call_rag_retrievals`

Each partition contains one month of data (e.g., `call_messages_2025_01` for January 2025).

**✅ Partitions Pre-Created:** The migration automatically creates **120 monthly partitions (10 years from 2025-2035)**. No cron jobs or manual management needed until 2035!

- **Total partitions created:** 480 (4 tables × 120 months)
- **Coverage:** January 2025 through December 2034
- **Operational overhead:** Zero for the next decade

### Extending Partitions (After 2034)

```bash
# Access PostgreSQL
docker exec -it orchestrator-postgres psql -U orchestrator -d orchestrator

# Create additional monthly partitions (only needed after 2034)
SELECT create_monthly_partitions();

-- Output:
-- Created partition: call_messages_2035_01
-- Created partition: call_transitions_2035_01
-- Created partition: call_metrics_2035_01
-- Created partition: call_rag_retrievals_2035_01
```

### List Partitions

```sql
-- List all partitions
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'call_%_20%'
ORDER BY tablename;

-- Check partition sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'call_%_20%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Cleanup Old Partitions

```sql
-- Delete partitions older than 1 year
SELECT cleanup_old_partitions();

-- Output:
-- Dropped partition: call_messages_2023_01
-- Dropped partition: call_transitions_2023_01
-- Dropped partition: call_metrics_2023_01
-- Dropped partition: call_rag_retrievals_2023_01
```

### Automated Partition Management

**No automation needed!** Partitions for 10 years (2025-2035) are created automatically during migration.

#### Optional: Automated Cleanup (After 2026)

If you want to automatically clean up partitions older than 1 year, you can set up pg_cron:

```sql
-- Install extension (requires superuser)
CREATE EXTENSION pg_cron;

-- Schedule quarterly cleanup (Jan 1, Apr 1, Jul 1, Oct 1)
-- This deletes partitions older than 1 year
SELECT cron.schedule(
    'cleanup-old-partitions',
    '0 0 1 1,4,7,10 *',
    $$SELECT drop_old_partitions()$$
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

**Note:** Cleanup is optional. If you want to retain data longer than 1 year, don't schedule cleanup and partitions will remain indefinitely.

### Monitoring Partition Health

```sql
-- Check for missing partitions (next 3 months)
WITH months AS (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE),
    date_trunc('month', CURRENT_DATE + interval '3 months'),
    interval '1 month'
  )::date AS month
)
SELECT
    to_char(month, 'YYYY_MM') AS expected_partition,
    EXISTS(
        SELECT 1 FROM pg_tables
        WHERE tablename = 'call_messages_' || to_char(month, 'YYYY_MM')
    ) AS messages_exists,
    EXISTS(
        SELECT 1 FROM pg_tables
        WHERE tablename = 'call_transitions_' || to_char(month, 'YYYY_MM')
    ) AS transitions_exists,
    EXISTS(
        SELECT 1 FROM pg_tables
        WHERE tablename = 'call_metrics_' || to_char(month, 'YYYY_MM')
    ) AS metrics_exists,
    EXISTS(
        SELECT 1 FROM pg_tables
        WHERE tablename = 'call_rag_retrievals_' || to_char(month, 'YYYY_MM')
    ) AS rag_exists
FROM months
ORDER BY month;
```

---

## Migration from DynamoDB

### What Changed

| Aspect | DynamoDB (Old) | PostgreSQL (New) |
|--------|---------------|------------------|
| **Storage** | Single-table design | Normalized 9-table design |
| **Service** | `CallHistoryService` | `CallStorageService` |
| **Timeline** | JSON array in JSONB | Separate tables with timestamps |
| **Chunks** | Truncated to 1KB | Full content stored |
| **Fallback** | PostgreSQL JSONB | None (enhanced error logging) |
| **TTL** | 90 days | 1 year (partition cleanup) |
| **Partitioning** | No | Monthly for high-volume tables |
| **Dependencies** | boto3, DynamoDB | PostgreSQL only |

### API Compatibility

The `CallStorageService` API is **mostly compatible** with `CallHistoryService`:

```python
# OLD (DynamoDB)
call_history_service.record_message(role="user", content="...")
await call_history_service.finalize_and_write(status="ended")

# NEW (PostgreSQL) - Same API!
call_storage_service.record_message(role="user", content="...")
await call_storage_service.finalize_and_write(status="ended")
```

**Key Differences:**
1. **Initialization:** Uses `postgres_client` instead of `dynamodb_client`
2. **No async writes:** All writes happen in `finalize_and_write()` (was async in DynamoDB)
3. **No fallback:** If PostgreSQL write fails, data is lost (enhanced error logging instead)

### Migration Steps

No data migration needed (old DynamoDB data remains accessible separately).

1. ✅ **Database Setup**
   ```bash
   # Run migrations
   uv run alembic upgrade head

   # Create initial partitions
   docker exec -it orchestrator-postgres psql -U orchestrator -d orchestrator
   SELECT create_monthly_partitions();
   ```

2. ✅ **Code Already Updated**
   - All integration points updated to use `CallStorageService`
   - DynamoDB imports removed
   - `MetricType` enum moved to `app/models/database.py`

3. ✅ **Configuration**
   - DynamoDB services removed from `docker-compose.yml`
   - DynamoDB config removed from `.env.example`

4. ⚠️ **Set Up Partition Management**
   - Install pg_cron or configure external scheduler
   - Schedule monthly partition creation
   - Schedule quarterly cleanup

---

## Troubleshooting

### No Data Written to Database

**Symptoms:** Call completes but no data in tables

**Causes:**
1. `finalize_and_write()` not called
2. Transaction rolled back due to error
3. Partition doesn't exist for current month

**Solutions:**
```python
# Check if finalize_and_write was called
# Look for this log in WebSocketHandler:
"✅ Call data written to PostgreSQL | call_id=..."

# If missing, check finally block in websocket_handler.py
# Ensure this is present:
finally:
    success = await call_storage_service.finalize_and_write(...)

# Check for partition errors
# Look for error like: "no partition of relation ... found for row"
# Solution: Create missing partition
SELECT create_monthly_partitions();
```

### Write Failures

**Symptoms:** `finalize_and_write()` returns `False`

**Debug Steps:**
```python
# 1. Check error logs (should have full stack trace)
LOG_LEVEL=DEBUG uv run uvicorn app.main:app

# 2. Check PostgreSQL logs
docker logs orchestrator-postgres

# 3. Test database connection
async with get_postgres_client().session() as session:
    result = await session.execute(text("SELECT 1"))
    print(result.scalar())  # Should print: 1

# 4. Check transaction limits
# Ensure your call data doesn't exceed PostgreSQL limits:
# - Max JSONB size: ~1GB (but practically ~100MB)
# - Max text size: ~1GB
# - Max transaction size: ~1GB
```

### Foreign Key Violations

**Symptoms:** Error like `violates foreign key constraint`

**Causes:**
1. Trying to insert RAG chunk before retrieval
2. Call record doesn't exist

**Solutions:**
```python
# Ensure call record exists before finalize_and_write
# CallStorageService assumes call was created by CallService

# Check call exists:
async with get_postgres_client().session() as session:
    result = await session.execute(
        select(Call).where(Call.call_id == call_id)
    )
    call = result.scalar_one_or_none()
    if not call:
        print("❌ Call record missing!")
```

### Partition Missing Errors

**Symptoms:** Error like `no partition of relation "call_messages" found for row`

**Solution:**
```bash
# Create missing partitions immediately
docker exec -it orchestrator-postgres psql -U orchestrator -d orchestrator
SELECT create_monthly_partitions();

# Verify partitions exist
SELECT tablename FROM pg_tables WHERE tablename LIKE 'call_messages_%';
```

### Slow Queries

**Symptoms:** Queries taking >1 second

**Optimization:**
```sql
-- 1. Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM call_messages WHERE call_id = '...';

-- Should see: "Index Scan using idx_messages_call_sequence"
-- If see "Seq Scan", index not used

-- 2. Update statistics
ANALYZE call_messages;
ANALYZE call_metrics;
ANALYZE call_transitions;
ANALYZE call_rag_retrievals;

-- 3. Check partition pruning
EXPLAIN ANALYZE
SELECT * FROM call_messages
WHERE timestamp >= '2025-01-01' AND timestamp < '2025-02-01';

-- Should see: "Partitions selected: call_messages_2025_01"
-- If scanning all partitions, check WHERE clause includes timestamp

-- 4. Add missing indexes if needed
CREATE INDEX idx_custom ON call_messages (your_column);
```

---

## Performance Optimization

### Query Optimization Tips

1. **Always filter by timestamp on partitioned tables**
   ```sql
   -- GOOD (uses partition pruning)
   SELECT * FROM call_messages
   WHERE call_id = '...'
     AND timestamp >= '2025-01-01'
     AND timestamp < '2025-02-01';

   -- BAD (scans all partitions)
   SELECT * FROM call_messages WHERE call_id = '...';
   ```

2. **Use summary metrics from calls table**
   ```sql
   -- GOOD (no joins)
   SELECT avg_llm_ttfb_ms, total_llm_tokens
   FROM calls
   WHERE started_at >= '2025-01-01';

   -- BAD (requires join + aggregation)
   SELECT AVG(value) FROM call_metrics
   WHERE metric_type = 'llm_ttfb'
     AND call_id IN (SELECT call_id FROM calls WHERE ...);
   ```

3. **Limit result sets**
   ```sql
   -- Always use LIMIT for large result sets
   SELECT * FROM call_messages
   WHERE call_id = '...'
   ORDER BY sequence
   LIMIT 1000;
   ```

4. **Use selectinload for relationships**
   ```python
   # Prevents N+1 queries
   result = await session.execute(
       select(Call)
       .options(
           selectinload(Call.messages),
           selectinload(Call.transitions),
       )
       .limit(100)
   )
   ```

### Index Maintenance

```sql
-- Rebuild indexes if fragmented (after bulk deletes)
REINDEX TABLE call_messages;
REINDEX TABLE call_metrics;

-- Update statistics after large data changes
ANALYZE call_messages;
ANALYZE call_transitions;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Drop unused indexes
-- (Check idx_scan = 0 for long time)
DROP INDEX idx_unused;
```

### Connection Pooling

```python
# Already configured in PostgresClient
# Default: pool_size=10, max_overflow=20

# Adjust in .env if needed:
POSTGRES_POOL_SIZE=20        # Normal connections
POSTGRES_MAX_OVERFLOW=30     # Burst capacity
```

### Monitoring Queries

```sql
-- Active queries
SELECT
    pid,
    now() - query_start AS duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Slow queries (requires pg_stat_statements extension)
SELECT
    mean_exec_time,
    calls,
    query
FROM pg_stat_statements
WHERE query LIKE '%call_%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bytes DESC;
```

---

## Best Practices

### 1. Always Call finalize_and_write()

```python
# ✅ GOOD
try:
    # ... run pipeline
    pass
finally:
    # Always in finally block
    await call_storage_service.finalize_and_write(status="ended")

# ❌ BAD
# ... run pipeline
await call_storage_service.finalize_and_write(status="ended")
# If exception occurs before this, data is lost!
```

### 2. Set Appropriate Status

```python
# ✅ GOOD
try:
    # ... run pipeline
    status = "ended"
    error_msg = None
except Exception as e:
    status = "error"
    error_msg = str(e)
    raise
finally:
    await call_storage_service.finalize_and_write(
        status=status,
        error_message=error_msg,
    )

# ❌ BAD - Always uses "ended" even on error
finally:
    await call_storage_service.finalize_and_write(status="ended")
```

### 3. Use Enums for Type Safety

```python
from app.models.database import MetricType

# ✅ GOOD
call_storage.record_metric(
    metric_type=MetricType.LLM_TTFB,  # Type-safe enum
    value=0.234,
)

# ❌ BAD - String typos not caught
call_storage.record_metric(
    metric_type="llm_ttfb",  # Could have typo
    value=0.234,
)
```

### 4. Include Full RAG Chunks

```python
# ✅ GOOD - Store full chunk content
chunks = [
    {
        "chunk_id": chunk.id,
        "content": chunk.content,  # Full text
        "filename": chunk.filename,
        "score": chunk.score,
    }
    for chunk in rag_results
]

# ❌ BAD - Truncated chunks lose valuable data
chunks = [
    {
        "chunk_id": chunk.id,
        "content": chunk.content[:1000],  # Truncated!
        "score": chunk.score,
    }
    for chunk in rag_results
]
```

### 5. Monitor Partition Creation

```bash
# Set up alerts for missing partitions
# Check monthly that next 2 months exist

# Create monitoring script
cat > /usr/local/bin/check-partitions.sh <<'EOF'
#!/bin/bash
NEXT_MONTH=$(date -d "+1 month" +%Y_%m)
PARTITION_EXISTS=$(docker exec orchestrator-postgres psql -U orchestrator -d orchestrator -tAc "SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'call_messages_${NEXT_MONTH}')")

if [ "$PARTITION_EXISTS" = "f" ]; then
    echo "❌ Missing partition for next month: $NEXT_MONTH"
    exit 1
else
    echo "✅ Partition exists: $NEXT_MONTH"
fi
EOF

chmod +x /usr/local/bin/check-partitions.sh

# Add to cron for weekly checks
0 0 * * 0 /usr/local/bin/check-partitions.sh
```

---

## Summary

### Quick Reference

**Service Initialization:**
```python
call_storage = CallStorageService(
    postgres_client=get_postgres_client(),
    call_id=uuid4(),
    tenant_id=UUID("..."),
    agent_id=UUID("..."),
    # ... other params
)
```

**Recording Data:**
```python
call_storage.record_message(role="user", content="...")
call_storage.record_transition(from_node_id="...", to_node_id="...")
call_storage.record_metric(metric_type=MetricType.LLM_TTFB, value=0.234)
call_storage.record_rag_retrieval(query="...", chunks=[...])
call_storage.record_variable_extraction(variables_requested=[...], ...)
call_storage.record_user_interruption(interrupted_at_turn=3)
```

**Finalization:**
```python
success = await call_storage.finalize_and_write(status="ended")
```

**Partition Management:**
```sql
SELECT create_monthly_partitions();  -- Create next month
SELECT cleanup_old_partitions();     -- Delete >1 year old
```

### Key Tables

- `calls` - Call metadata + 21 summary metrics
- `call_transcripts` - Full text + JSONB structure
- `call_messages` - Individual messages (partitioned)
- `call_metrics` - Performance measurements (partitioned)
- `call_transitions` - Node changes (partitioned)
- `call_rag_retrievals` + `call_rag_chunks` - RAG data (partitioned)
- `call_extracted_variables` - Variable extractions
- `call_analysis` - AI insights
- `call_user_interruptions` - Interruption events

### Resources

- **Migration File:** `alembic/versions/001_consolidated_postgresql_call_storage.py`
- **Service Code:** `app/services/call_storage_service.py`
- **Models:** `app/models/database.py`
- **Integration Example:** `app/core/websocket_handler.py`
- **Main Documentation:** `CLAUDE.md` (Database Migrations section)

---

**Last Updated:** 2025-01-14
**Version:** 1.0
**Migration Status:** ✅ Complete
