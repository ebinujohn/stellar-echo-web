# Pipeline Structure

Complete technical documentation of the voice conversation pipeline from call initiation to termination.

---

## 📞 **COMPLETE PIPELINE FLOW**

```
═══════════════════════════════════════════════════════════════════════════════
                          PHASE 1: CALL INITIATION
═══════════════════════════════════════════════════════════════════════════════

┌─────────────┐         ┌──────────────┐         ┌──────────────────┐
│   Caller    │ ──────→ │    Twilio    │ ──────→ │  POST /twiml     │
│   Dials     │         │   Network    │         │  (main.py:53)    │
└─────────────┘         └──────────────┘         └──────────────────┘
                                                           │
                                                           ↓
                                                  ┌──────────────────┐
                                                  │  Generate TwiML  │
                                                  │  with WebSocket  │
                                                  │  URL + Phone #s  │
                                                  └──────────────────┘
                                                           │
                                                           ↓
═══════════════════════════════════════════════════════════════════════════════
                      PHASE 2: WEBSOCKET HANDSHAKE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│  WebSocket Connection (websocket_handler.py:149)                            │
│  1. Accept WebSocket connection                                             │
│  2. Receive Twilio handshake (2 messages)                                   │
│  3. Extract: stream_sid, call_sid, To phone number                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
═══════════════════════════════════════════════════════════════════════════════
                      PHASE 3: AGENT CONFIGURATION
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│  ConfigManager (config_manager.py)                                          │
│  1. Look up phone → agent mapping (phone_configs + phone_mappings tables)   │
│  2. Load agent config from PostgreSQL (agent_config_versions table)         │
│  3. Parse: workflow, LLM, TTS, RAG configs                                  │
│  4. Validate: Ensure workflow exists (REQUIRED)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
═══════════════════════════════════════════════════════════════════════════════
                    PHASE 4: PIPELINE COMPONENT CREATION
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│  Component Assembly (websocket_handler.py:203-445)                          │
│                                                                              │
│  A. Transport Layer (218-235)                                               │
│     ├─ TwilioFrameSerializer (auto-hangup if credentials present)          │
│     └─ FastAPIWebsocketTransport (8kHz audio, bidirectional)               │
│                                                                              │
│  B. STT Filtering (652-677)                                                 │
│     └─ STTMuteFilter (intelligent speech muting)                           │
│        ├─ MUTE_UNTIL_FIRST_BOT_COMPLETE: Blocks STT during greeting        │
│        └─ CUSTOM: Per-node interruption control via callback               │
│                                                                              │
│  C. Speech-to-Text (523-532)                                                │
│     └─ DeepgramFluxSTTService (v2, configurable EOT thresholds)            │
│                                                                              │
│  D. Frame Processors (254-263)                                              │
│     ├─ TranscriptionHandler (before LLM - captures user speech)            │
│     └─ LLMOutputObserver (after LLM - tracks response latency)             │
│                                                                              │
│  E. LLM Service (265-308)                                                   │
│     ├─ Azure/OpenAI LLM (gpt-5-mini or custom)                             │
│     └─ OpenAILLMContext (conversation context manager)                     │
│                                                                              │
│  F. Text-to-Speech (310-357)                                                │
│     └─ ExtendedElevenLabsTTSService (SSML + pronunciation dicts)           │
│                                                                              │
│  G. RAG System (359-386) [OPTIONAL]                                         │
│     ├─ RAGKnowledgeBase (FAISS + SQLite + Bedrock)                         │
│     └─ RAGProcessor (query detection + context injection)                  │
│                                                                              │
│  H. Workflow Orchestration (388-423) [REQUIRED]                             │
│     ├─ TransitionEvaluator (pattern + intent conditions)                   │
│     ├─ ActionExecutor (webhooks, logging, hangup)                          │
│     └─ NodeManager (workflow state machine)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  Pipeline Construction (679-693)                                            │
│                                                                              │
│  [Input] → [STTMuteFilter] → [Deepgram STT] → [TranscriptionHandler] →     │
│  [InterruptionHandler] → [NodeManager] → [RAGProcessor*] → [Context] →     │
│  [LLM] → [LLMOutputObserver] → [TTS] → [Output] → [Context Assistant]      │
│                                                                              │
│  * RAG is optional and per-node configurable                               │
│  * STTMuteFilter blocks audio during bot greeting and per-node config      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
═══════════════════════════════════════════════════════════════════════════════
                      PHASE 5: RUNTIME PROCESSING LOOP
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│  NodeManager Initialization (node_manager.py:124)                           │
│  ├─ Sets initial workflow node                                              │
│  ├─ Builds system prompt (global + node-specific)                           │
│  ├─ Pushes LLMMessagesUpdateFrame                                           │
│  ├─ Configures RAG for initial node                                         │
│  └─ Executes on_entry actions                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                        ╔═══════════╧══════════╗
                        ║   CONVERSATION LOOP   ║
                        ╚═══════════╤══════════╝
                                    │
                                    ↓

┌──────────────────────────────────────────────────────────────────────────────┐
│                         USER SPEECH → TRANSCRIPT                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. AUDIO INPUT (Twilio → Transport)                                         │
│     └─ Mulaw 8kHz audio stream from Twilio                                   │
│                                                                               │
│  2. SPEECH-TO-TEXT (Deepgram Flux v2)                      [⏱️ ~0-1ms]      │
│     ├─ UserStartedSpeakingFrame → TranscriptionHandler                      │
│     ├─ InterimTranscriptionFrame (partial results)                           │
│     ├─ UserStoppedSpeakingFrame → Mark timestamp                            │
│     └─ TranscriptionFrame → Final transcript                                 │
│        └─ LatencyTracker.mark_user_stopped()                                 │
│        └─ LatencyTracker.mark_transcript_received()                          │
│                                                                               │
│  3. TRANSCRIPTION HANDLER (transcription_handler.py:72)                      │
│     ├─ Log user input: "👤 User: {text}"                                    │
│     └─ Push TranscriptionFrame downstream                                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW ORCHESTRATION                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  4. NODE MANAGER (node_manager.py:175)                     [⏱️ ~500ms GAP]  │
│     ├─ Receive TranscriptionFrame                                            │
│     ├─ Update conversation history                                           │
│     ├─ Increment turn count                                                  │
│     ├─ Collect data (if configured)                                          │
│     │  └─ Extract: full_input, topic_name, llm_extract                       │
│     │                                                                          │
│     ├─ TRANSITION EVALUATION (transition_evaluator.py:43)                    │
│     │  ├─ Pattern-based (fast):                                              │
│     │  │  ├─ timeout:Xs                                                       │
│     │  │  ├─ max_turns:N                                                      │
│     │  │  ├─ contains:keyword                                                 │
│     │  │  └─ user_responded                                                   │
│     │  │                                                                       │
│     │  └─ Intent-based (LLM ~100-150ms):                                     │
│     │     ├─ intent:{intent_id}                                               │
│     │     ├─ intent:no_match (fallback)                                       │
│     │     └─ Single batch LLM call for all intents                           │
│     │        └─ Uses gpt-4o-mini with descriptions + examples                │
│     │                                                                          │
│     └─ IF TRANSITION TRIGGERED:                                              │
│        ├─ Execute on_exit actions (current node)                             │
│        ├─ Update state & history                                             │
│        ├─ Switch to new node                                                 │
│        ├─ Build new system prompt (global + new node)                        │
│        ├─ Apply history windowing                                            │
│        ├─ Push LLMMessagesUpdateFrame (context switch)                       │
│        ├─ Configure RAG for new node (enable/disable)                        │
│        ├─ Execute on_entry actions (new node)                                │
│        └─ Check for end_call or proactive auto-transitions                   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE RETRIEVAL (OPTIONAL)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  5. RAG PROCESSOR (rag_processor.py:64)                     [⏱️ ~50-200ms]  │
│     ├─ Check if RAG enabled for current node                                 │
│     ├─ Smart query detection (skip greetings/casual chat)                    │
│     │  └─ Checks: what/how/why/when/where/tell/explain/can you               │
│     │                                                                          │
│     ├─ IF KNOWLEDGE-SEEKING QUERY:                                           │
│     │  ├─ LatencyTracker.mark_rag_started()                                  │
│     │  ├─ RAGService.search() (rag_service.py)                               │
│     │  │  ├─ Generate query embedding (AWS Bedrock Titan)                    │
│     │  │  ├─ Vector search (FAISS HNSW index)                                │
│     │  │  ├─ Full-text search (SQLite FTS5)                                  │
│     │  │  └─ Hybrid fusion (RRF algorithm)                                   │
│     │  │                                                                       │
│     │  ├─ LatencyTracker.mark_rag_completed(chunk_count)                     │
│     │  ├─ Format context from chunks                                         │
│     │  ├─ Push LLMMessagesUpdateFrame (ephemeral system message)             │
│     │  └─ Log: "🧠 RAG: {N} chunks | {M} sources"                            │
│     │                                                                          │
│     └─ Push TranscriptionFrame downstream                                     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                           LLM GENERATION                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  6. CONTEXT AGGREGATOR (Pipecat built-in)                                    │
│     ├─ Aggregate context messages:                                           │
│     │  ├─ System prompt (global + node-specific)                             │
│     │  ├─ Conversation history (windowed if configured)                      │
│     │  ├─ RAG context (if retrieved)                                         │
│     │  └─ Current user input                                                 │
│     │                                                                          │
│     └─ Push to LLM service                                                   │
│                                                                               │
│  7. LLM SERVICE (OpenAI/Azure)                               [⏱️ ~400-800ms] │
│     ├─ LLMFullResponseStartFrame → LLMOutputObserver                         │
│     │  └─ LatencyTracker.mark_llm_started()                                  │
│     │                                                                          │
│     ├─ Stream response chunks (LLMTextFrame)                                 │
│     │  └─ LLMOutputObserver collects chunks                                  │
│     │                                                                          │
│     └─ LLMFullResponseEndFrame                                               │
│        ├─ LatencyTracker.mark_llm_completed(response)                        │
│        ├─ Log: "🤖 Assistant: {response}"                                    │
│        └─ Update conversation history (context_aggregator.assistant())       │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                         TEXT-TO-SPEECH SYNTHESIS                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  8. TTS SERVICE (ElevenLabs)                                 [⏱️ ~200-400ms] │
│     ├─ Receive TextFrame/LLMTextFrame                                        │
│     ├─ Parse SSML tags (if enabled):                                         │
│     │  ├─ <break time="500ms"/>                                              │
│     │  ├─ <prosody rate="slow">                                              │
│     │  └─ <emphasis level="strong">                                          │
│     │                                                                          │
│     ├─ Apply pronunciation dictionaries (if configured):                     │
│     │  └─ Send dictionary locators in WebSocket initial context              │
│     │     └─ elevenlabs_extended.py:65-101                                   │
│     │                                                                          │
│     ├─ WebSocket to ElevenLabs API                                           │
│     │  └─ Stream audio chunks                                                │
│     │                                                                          │
│     └─ BotStartedSpeakingFrame → LLMOutputObserver                           │
│        ├─ LatencyTracker.mark_tts_started()                                  │
│        └─ Log turn summary with full latency breakdown                       │
│                                                                               │
│  9. AUDIO OUTPUT (Transport)                                                 │
│     └─ Stream mulaw 8kHz audio to Twilio                                     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                        ╔═══════════╧═══════════╗
                        ║  LOOP BACK TO STEP 1  ║
                        ║   (Next user turn)     ║
                        ╚════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
                         PHASE 6: CALL TERMINATION
═══════════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────────────────┐
│  Termination Triggers                                                         │
│                                                                               │
│  A. CLIENT DISCONNECT (websocket_handler.py:458)                             │
│     ├─ User hangs up → on_client_disconnected event                          │
│     ├─ task.cancel() → Stop pipeline immediately                             │
│     └─ TwilioFrameSerializer auto-hangs up call (if credentials present)     │
│                                                                               │
│  B. END_CALL NODE (node_manager.py:284)                                      │
│     ├─ Workflow reaches node with type="end"                                 │
│     ├─ Deliver closing message (if any)                                      │
│     ├─ Execute hangup action immediately                                     │
│     │  └─ action_executor.py:138                                             │
│     │     └─ Calls TwilioFrameSerializer._hang_up_call()                     │
│     │        └─ Twilio REST API: POST /Calls/{CallSid}.json (Status=completed)│
│     └─ 3-second pause, then disconnect                                       │
│                                                                               │
│  C. MANUAL HANGUP ACTION (action_executor.py:138)                            │
│     └─ Node on_entry/on_exit action triggers hangup                          │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Session Summary Logging (websocket_handler.py:476)                          │
│                                                                               │
│  1. LATENCY SUMMARY (latency_tracker.py:331)                                 │
│     ├─ STT Delay: avg/min/max                                                │
│     ├─ Transcript→LLM Gap: avg/min/max (pipeline overhead)                   │
│     ├─ RAG Processing: avg/min/max (if used)                                 │
│     ├─ LLM Processing: avg/min/max                                           │
│     ├─ LLM→TTS Gap: avg/min/max (pipeline + TTS latency)                     │
│     └─ Pipeline Total: avg/min/max                                           │
│                                                                               │
│  2. WORKFLOW SUMMARY (node_manager.py:509)                                   │
│     ├─ Final node                                                            │
│     ├─ Total transitions                                                     │
│     ├─ Transition history                                                    │
│     ├─ Collected data                                                        │
│     └─ Conversation turn count                                               │
│                                                                               │
│  3. SESSION CLEANUP                                                          │
│     ├─ Close WebSocket connection                                            │
│     ├─ Log session duration                                                  │
│     └─ Release resources                                                     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

                            🎬 SESSION COMPLETE
```

---

## 🔍 **DETAILED STAGE EXPLANATIONS**

### **PHASE 1: Call Initiation**
- **app/main.py:53** - `/twiml` webhook receives Twilio's POST request with phone numbers
- Generates TwiML XML response with WebSocket URL and phone number parameters
- Twilio establishes bidirectional media stream over WebSocket

### **PHASE 2: WebSocket Handshake**
- **websocket_handler.py:149** - Accepts connection, extracts stream_sid, call_sid, phone numbers
- Creates unique session_id for tracking
- Prepares for agent configuration lookup

### **PHASE 3: Agent Configuration**
- **config_manager.py** - Database-backed configuration loader
  - Maps phone number → agent via `phone_configs` + `phone_mappings` tables
  - Loads agent config from `agent_config_versions` table
  - Validates workflow exists (REQUIRED - no traditional mode)
  - Redis caching with manual invalidation for hot reload

### **PHASE 4: Pipeline Component Creation**
Assembles the Pipecat pipeline with 11 distinct components:

1. **Transport** - Bidirectional WebSocket with Twilio serialization
2. **STTMuteFilter** - Intelligent STT muting (NEW in v0.0.94)
   - `MUTE_UNTIL_FIRST_BOT_COMPLETE`: Blocks STT during initial greeting
   - `CUSTOM`: Per-node interruption control via callback
3. **STT** - Deepgram Flux v2 (sub-millisecond latency)
4. **TranscriptionHandler** - User speech event tracking (before LLM)
5. **InterruptionHandler** - MinWordsInterruptionStrategy filtering
6. **NodeManager** - Workflow state machine orchestrator
7. **RAGProcessor** - Knowledge retrieval (optional, per-node)
8. **ContextAggregator** - Message assembly for LLM
9. **LLM** - OpenAI/Azure GPT-5-mini or custom
10. **LLMOutputObserver** - Response tracking (after LLM)
11. **TTS** - ElevenLabs with SSML + pronunciation dictionaries

### **PHASE 5: Runtime Processing Loop**
**The core conversation pipeline with 9 distinct stages:**

#### **Stage 1-3: User Input → Transcript** (~0-1ms)
- Deepgram Flux v2 processes audio in real-time
- Emits: `UserStartedSpeakingFrame` → `InterimTranscriptionFrame` → `UserStoppedSpeakingFrame` → `TranscriptionFrame`
- **latency_tracker.py** captures precise timestamps

#### **Stage 4: Workflow Orchestration** (~500ms - **Main Bottleneck**)
**node_manager.py** - The brain of the system:
- Updates conversation history
- Collects structured data (`full_input`, `topic_name`, `llm_extract`)
- **Evaluates transitions** via hybrid approach:
  - **Pattern-based** (<1ms): timeout, max_turns, contains, user_responded
  - **Intent** (~100-150ms): Uses gpt-4o-mini for batch intent classification
- **If transition triggered**:
  - Executes `on_exit` actions (webhooks, logging)
  - Switches node context (new system prompt)
  - Applies history windowing
  - Configures per-node RAG (enable/disable dynamically)
  - Executes `on_entry` actions
  - Checks for special nodes (`end_call`, proactive auto-transitions)

#### **Stage 5: Knowledge Retrieval** (~50-200ms, optional)
**rag_processor.py** + **rag_service.py**:
- Smart query detection (skips greetings/casual chat)
- **Hybrid search** (fastest to slowest):
  1. FAISS HNSW vector search
  2. SQLite FTS5 full-text search
  3. RRF (Reciprocal Rank Fusion) for result merging
- Injects ephemeral system message with retrieved context

#### **Stage 6-7: LLM Generation** (~400-800ms)
- **ContextAggregator** builds final message array:
  - System prompt (global + node-specific)
  - Windowed conversation history
  - RAG context (if retrieved)
  - Current user input
- **OpenAI/Azure LLM** streams response chunks
- **LLMOutputObserver** tracks timing and logs response

#### **Stage 8-9: TTS Synthesis & Audio Output** (~200-400ms)
**elevenlabs_extended.py**:
- Parses SSML tags for pauses, prosody, emphasis
- Applies pronunciation dictionaries via WebSocket initial context
- Streams audio chunks to Twilio in mulaw 8kHz format
- **Latency tracking** measures LLM→TTS gap (pipeline overhead + TTS API)

### **PHASE 6: Call Termination**
Three termination paths:
1. **Client disconnect** → `task.cancel()` → Auto-hangup via Twilio REST API
2. **end_call node** → Immediate hangup action → Twilio API call
3. **Manual hangup action** → Triggered by workflow on_entry/on_exit

**Session summaries** log:
- Per-turn latency breakdown (STT, gaps, RAG, LLM, TTS)
- Aggregated statistics (avg/min/max)
- Workflow state (transitions, collected data)

---

## ⚡ **LATENCY BREAKDOWN** (Typical Values)

```
STT Delay:             0-1ms    (Deepgram Flux v2 is near-instant)
Transcript→LLM Gap:    ~500ms   🔴 MAIN BOTTLENECK
  ├─ Pipeline overhead: ~100ms
  ├─ NodeManager processing: ~400ms
  │  ├─ Transition evaluation: ~10-200ms (intent conditions)
  │  ├─ Context assembly: ~50ms
  │  └─ Frame propagation: ~40ms
RAG Processing:        ~50-200ms (if enabled)
LLM Processing:        ~400-800ms
LLM→TTS Gap:           ~200-400ms
  ├─ Pipeline overhead: ~100ms
  └─ TTS API latency: ~100-300ms
──────────────────────────────────
Pipeline Total:        ~1200-1900ms (1.2-1.9s end-to-end)
```

**Key Insight**: The **Transcript→LLM Gap** (~500ms) is the dominant latency source, primarily from:
- Pipecat frame processing overhead
- NodeManager transition evaluation (especially intent conditions using LLM)
- Context assembly and prompt building

---

## 🎯 **PURPOSE OF EACH COMPONENT**

| Component | Purpose | Key Files |
|-----------|---------|-----------|
| **Transport** | Bidirectional WebSocket audio streaming (Twilio ↔ Pipeline) | `websocket_handler.py:218` |
| **STTMuteFilter** | Intelligent STT muting during bot speech & per-node interruption control | `websocket_handler.py:652` |
| **Deepgram STT** | Real-time speech recognition with configurable EOT thresholds | `websocket_handler.py:523` |
| **TranscriptionHandler** | Captures user speech events & timestamps (before LLM) | `websocket_handler.py:61` |
| **InterruptionHandler** | MinWordsInterruptionStrategy filtering for false positives | `websocket_handler.py:635` |
| **NodeManager** | Workflow orchestration: transitions, context switching, data collection | `node_manager.py:55` |
| **TransitionEvaluator** | Hybrid pattern + LLM-based condition evaluation | `transition_evaluator.py:17` |
| **ActionExecutor** | Executes actions: log, webhook, hangup, custom | `action_executor.py:18` |
| **RAGProcessor** | Smart query detection + knowledge retrieval | `rag_processor.py:18` |
| **RAGKnowledgeBase** | Hybrid search (FAISS + SQLite FTS5 + RRF fusion) | `rag_service.py` |
| **ContextAggregator** | Assembles messages for LLM (system + history + RAG + user) | Pipecat built-in |
| **LLM Service** | GPT-5-mini (Azure/OpenAI) for conversation generation | `websocket_handler.py:265` |
| **LLMOutputObserver** | Tracks LLM response timing & logs output (after LLM) | `websocket_handler.py:95` |
| **ExtendedElevenLabsTTS** | SSML parsing + pronunciation dictionaries | `elevenlabs_extended.py:9` |
| **LatencyTracker** | High-precision turn-by-turn and session latency metrics | `latency_tracker.py:8` |
| **AnalyticsObserver** | Captures Pipecat MetricsFrames & writes to PostgreSQL | `analytics_observer.py:44` |
| **TurnTrackingObserver** | Native Pipecat turn tracking with duration & interruption status | Pipecat built-in |

---

## 📊 **FRAME FLOW DIAGRAM**

```
User speaks → Audio packets → Twilio → WebSocket
                                           │
                                           ↓
                                    Transport.input()
                                           │
                                           ↓ AudioRawFrame
                                    STTMuteFilter
                         (blocks audio during bot speech or
                          when node.interruptions_enabled=false)
                                           │
                                           ↓ AudioRawFrame (if not muted)
                                    Deepgram STT
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ↓                      ↓                      ↓
          UserStartedSpeakingFrame  InterimTranscriptionFrame  UserStoppedSpeakingFrame
                    │                                              │
                    └──────────────────────┬──────────────────────┘
                                           ↓
                                    TranscriptionFrame
                                           │
                                           ↓
                                  TranscriptionHandler
                              (logs, marks timestamps)
                                           │
                                           ↓
                                  InterruptionHandler
                         (MinWordsInterruptionStrategy filtering)
                                           │
                                           ↓
                                     NodeManager
                         (evaluate transitions, switch context)
                                           │
                                           ↓
                                    RAGProcessor [optional]
                              (inject knowledge context)
                                           │
                                           ↓
                                  ContextAggregator.user()
                              (build message array)
                                           │
                                           ↓
                                      LLM Service
                    ┌──────────────────────┼──────────────────────┐
                    ↓                      ↓                      ↓
          LLMFullResponseStartFrame    LLMTextFrame    LLMFullResponseEndFrame
                    │                      │                      │
                    └──────────────────────┼──────────────────────┘
                                           ↓
                                    LLMOutputObserver
                              (collect response, log)
                                           │
                                           ↓ TextFrame
                                      TTS Service
                                           │
                                           ↓ TTSAudioRawFrame
                                   Transport.output()
                                           │
                                           ↓
                                       WebSocket
                                           │
                                           ↓
                                  Twilio → User hears
```

---

## 🔄 **STATE TRANSITIONS**

### **NodeManager State Machine**
```
Initial State:
  current_node_id: workflow.initial_node
  turn_count: 0
  transition_count: 0
  conversation_history: []
  collected_data: {}

On User Input:
  1. Add to conversation_history
  2. Increment turn_count
  3. Collect data (if configured)
  4. Evaluate transitions (first match wins)
  5. If matched:
     a. Execute on_exit actions
     b. Increment transition_count
     c. Reset turn_count
     d. Update current_node_id
     e. Switch LLM context (new prompt + windowed history)
     f. Configure RAG for new node
     g. Execute on_entry actions
     h. Check for special nodes (end_call, proactive auto-transitions)

Special Nodes:
  - type: "end" → Immediate hangup after delivering closing message
  - proactive: true + always → Auto-transition after ~4s (LLM + TTS + audio)

Safety Limits:
  - Max transitions: workflow.max_transitions (default: 50)
  - History window: workflow.history_window messages (0 = unlimited)
```

---

## 🚀 **OPTIMIZATION OPPORTUNITIES**

Based on latency analysis, potential optimizations:

1. **Transcript→LLM Gap (~500ms bottleneck)**
   - Cache compiled system prompts
   - Optimize frame processing (reduce await chains)
   - Parallelize transition evaluation with frame forwarding
   - Use faster Azure region or OpenAI standard endpoint

2. **NodeManager Transition Evaluation**
   - Pattern-based conditions first (fast path)
   - Intent classification cached per user input per node
   - Consider reducing intent count per node

3. **RAG Processing**
   - Pre-warm FAISS index on startup
   - Cache embeddings for common queries
   - Use vector caching layer

4. **TTS Generation**
   - Use ElevenLabs streaming mode (not WebSocket batching)
   - Pre-generate common phrases (greetings, closings)
   - Optimize SSML parsing

5. **Pipeline Overhead**
   - Reduce frame copies (use zero-copy where possible)
   - Optimize async task scheduling
   - Profile frame processor chain for bottlenecks

---

## 📝 **KEY DESIGN DECISIONS**

1. **Workflow-Only Mode**: Removed traditional agent configuration for simplicity
2. **Per-Node RAG**: RAG can be enabled/disabled dynamically per conversation stage
3. **Hybrid Transition Evaluation**: Pattern-based (fast) + LLM-based (flexible)
4. **Precise Latency Tracking**: Frame arrival timestamps capture true pipeline overhead
5. **Hot Reload**: Agent configs cached with mtime-based invalidation
6. **Multi-Tenant**: Phone mapping enables isolated tenant/agent configurations
7. **Auto-Hangup**: Twilio REST API integration for graceful call termination
8. **Session Isolation**: Unique session_id per call for debugging and analytics
9. **STTMuteFilter Integration** (v0.0.94): Intelligent STT muting reduces false transcripts
   - Mutes during initial bot greeting (prevents echo/noise)
   - Per-node interruption control via custom callback
   - Reduces Deepgram API costs by blocking audio when appropriate
10. **Native Pipecat Observers**: Using built-in MetricsLogObserver, UserBotLatencyLogObserver, TurnTrackingObserver for automatic metrics collection

This architecture enables **multi-tenant**, **workflow-driven**, **context-aware** voice conversations with **sub-2-second** end-to-end latency and **comprehensive observability**.
