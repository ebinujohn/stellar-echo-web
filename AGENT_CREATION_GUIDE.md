# Complete Agent Creation Guide for Non-Technical Users

**A step-by-step guide to creating AI phone agents without coding knowledge**

---

## Table of Contents

1. [What is an Agent?](#what-is-an-agent)
2. [Understanding the Basics](#understanding-the-basics)
3. [The Building Blocks](#the-building-blocks)
4. [Node Types Explained](#node-types-explained)
5. [Transitions: How Conversations Flow](#transitions-how-conversations-flow)
6. [Global Intents: Topic Switching](#global-intents-topic-switching)
7. [Actions: Making Things Happen](#actions-making-things-happen)
8. [Variables: Capturing Information](#variables-capturing-information)
9. [Knowledge Base (RAG)](#knowledge-base-rag)
10. [Interruption Handling](#interruption-handling)
11. [Voice and Speech Settings](#voice-and-speech-settings)
12. [Post-Call Analysis](#post-call-analysis)
13. [Complete Workflow Examples](#complete-workflow-examples)
14. [Reading the Logs](#reading-the-logs)
15. [Common Patterns and Recipes](#common-patterns-and-recipes)
16. [Troubleshooting Guide](#troubleshooting-guide)

---

## What is an Agent?

An **agent** is an automated phone assistant that can:
- Answer incoming calls
- Have natural conversations with callers
- Collect information from callers
- Provide information from a knowledge base
- Route conversations based on what callers say
- Transfer calls or hang up automatically

Think of an agent as a smart receptionist that follows a conversation script you design, but can adapt based on what the caller says.

---

## Understanding the Basics

### How It Works

When someone calls your phone number:
1. The system connects to the call
2. Your agent starts speaking (greeting)
3. The caller responds
4. The agent listens, understands, and responds appropriately
5. This continues until the conversation reaches an end point

### Key Concepts

| Term | Simple Explanation |
|------|-------------------|
| **Workflow** | The complete conversation flow you design |
| **Node** | A single stage in the conversation (like "greeting" or "collect name") |
| **Transition** | A rule that moves the conversation from one stage to another |
| **Variable** | A piece of information captured from the caller (like their name) |
| **RAG** | Knowledge base that the agent can search to answer questions |
| **TTS** | Text-to-Speech - the voice the agent uses to speak |

---

## The Building Blocks

Every agent configuration has these main sections:

```
Agent Configuration
├── Agent Info (id, name, description)
└── Workflow
    ├── Global Settings (history, max transitions)
    ├── LLM Settings (the AI brain)
    ├── TTS Settings (the voice)
    ├── Interruption Settings
    └── Nodes (conversation stages)
        ├── Node 1 (greeting)
        ├── Node 2 (collect info)
        ├── Node 3 (main conversation)
        └── Node 4 (goodbye)
```

### The Workflow Structure

```json
{
  "workflow": {
    "initial_node": "greeting",    // Where to start
    "global_prompt": "...",        // Rules for ALL stages
    "history_window": 20,          // How much to remember
    "max_transitions": 50,         // Safety limit
    "nodes": [...]                 // The conversation stages
  }
}
```

**Key Settings Explained:**

| Setting | What It Does | Recommended Value |
|---------|--------------|-------------------|
| `initial_node` | Which node the call starts at | Your greeting node ID |
| `global_prompt` | Instructions that apply everywhere | Identity, safety rules |
| `history_window` | Messages to remember (0 = all) | 20 for most cases |
| `max_transitions` | Maximum stage changes allowed | 50 (prevents loops) |

---

## Node Types Explained

### 1. Standard Node (Most Common)

A regular conversation stage where the agent speaks and listens.

**When to Use:**
- Greetings and welcomes
- Main conversations
- Question and answer stages
- Closing messages

**Two Ways to Create Messages:**

#### Option A: AI-Generated (Dynamic)
The AI creates responses based on your instructions:

```json
{
  "id": "greeting",
  "type": "standard",
  "name": "Welcome Greeting",
  "system_prompt": "Greet the caller warmly. Introduce yourself as Alex. Ask how you can help them today.",
  "transitions": [...]
}
```

**Characteristics:**
- Messages vary each time (natural)
- Takes ~1-2 seconds to generate
- Can adapt to context
- Use for conversational stages

#### Option B: Static Text (Fixed)
The exact same message every time:

```json
{
  "id": "disclaimer",
  "type": "standard",
  "name": "Legal Disclaimer",
  "static_text": "This call may be recorded for quality and training purposes.",
  "transitions": [...]
}
```

**Characteristics:**
- Exact same message every time
- Near-instant delivery (~200ms)
- Perfect for legal disclaimers
- Use for compliance messages

**Important Rule:** Use EITHER `system_prompt` OR `static_text`, never both.

### 2. Variable Extraction Node

Captures specific information from the conversation.

**When to Use:**
- Collecting names
- Getting phone numbers
- Capturing topics of interest
- Recording survey responses

**Example: Single Variable**
```json
{
  "id": "get_name",
  "type": "retrieve_variable",
  "name": "Get Caller Name",
  "variable_name": "caller_name",
  "extraction_prompt": "Extract the caller's full name from the conversation.",
  "default_value": "Customer",
  "transitions": [
    {
      "condition": "always",
      "target": "next_node"
    }
  ]
}
```

**Example: Multiple Variables at Once**
```json
{
  "id": "extract_info",
  "type": "retrieve_variable",
  "name": "Extract User Info",
  "variables": [
    {
      "variable_name": "first_name",
      "extraction_prompt": "Extract the caller's first name.",
      "default_value": null
    },
    {
      "variable_name": "last_name",
      "extraction_prompt": "Extract the caller's last name.",
      "default_value": null
    },
    {
      "variable_name": "topic",
      "extraction_prompt": "What topic is the caller interested in?",
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
      "target": "ask_again"
    }
  ]
}
```

**How It Works:**
1. The system analyzes the entire conversation so far
2. An AI extracts the requested information
3. If found, stores in `{{variable_name}}`
4. If not found, uses `default_value` (or null)
5. Immediately transitions to the next node

**Key Point:** Variable extraction nodes do NOT wait for caller input - they process what's already been said and immediately transition.

### 3. End Call Node

Terminates the phone call.

**When to Use:**
- At the end of every workflow (required!)
- After goodbye messages

```json
{
  "id": "end_call",
  "type": "end_call",
  "name": "Terminate Call"
}
```

**Important Rules:**
- Every workflow MUST have at least one end_call node
- End call nodes have NO transitions (the call is ending)
- End call nodes do NOT speak - use a standard node before it for goodbyes

---

## Transitions: How Conversations Flow

Transitions are rules that move the conversation from one node to another.

### Transition Structure

```json
{
  "condition": "what triggers this",
  "target": "where to go",
  "priority": 1
}
```

### Understanding Priority

**Lower number = Higher priority = Checked first**

Think of it like "1st priority, 2nd priority, 3rd priority":
- Priority 1 is checked before Priority 2
- Priority 2 is checked before Priority 3
- If no priority is set, defaults to 0

**Example:**
```json
"transitions": [
  {"condition": "contains:emergency", "target": "urgent", "priority": 1},
  {"condition": "contains:goodbye", "target": "closing", "priority": 2},
  {"condition": "max_turns:5", "target": "closing", "priority": 10}
]
```

**Evaluation Order:** emergency (1st) → goodbye (2nd) → max_turns (10th)

### Transition Types

#### Pattern-Based Transitions (Instant)

These check for specific patterns and are very fast (~0ms):

| Condition | What It Does | Example |
|-----------|--------------|---------|
| `user_responded` | Caller said something | Move to next stage after ANY response |
| `contains:word` | Caller said a specific word | `contains:goodbye` triggers on "goodbye", "Goodbye", "GOODBYE" |
| `max_turns:N` | N exchanges happened in this node | `max_turns:5` after 5 back-and-forths |
| `timeout:Xs` | X seconds passed without response | `timeout:30s` after 30 seconds of silence |
| `always` | Immediately (no waiting) | Auto-advance after bot speaks (with `proactive: true`) or instant transition |
| `variables_extracted:x,y` | Variables were captured successfully | After extraction node |
| `extraction_failed:x,y` | Variables were NOT captured | Handle missing info |

#### Intent-Based Transitions (AI-Powered)

These use AI to understand caller intent (~100-150ms):

```json
{
  "intents": {
    "wants_billing": {
      "description": "Caller has questions about their bill",
      "examples": ["billing question", "about my invoice", "payment issue"]
    },
    "wants_support": {
      "description": "Caller needs technical help",
      "examples": ["not working", "problem with", "help me"]
    }
  },
  "transitions": [
    {"condition": "intent:wants_billing", "target": "billing"},
    {"condition": "intent:wants_support", "target": "support"},
    {"condition": "intent:no_match", "target": "general"}
  ]
}
```

**Use `intent:no_match` for when no intent was recognized confidently.**

#### Intent Configuration Details

Fine-tune how intent classification works:

```json
{
  "intent_config": {
    "confidence_threshold": 0.6,
    "context_scope": "node",
    "context_messages": 4
  }
}
```

| Setting | Default | What It Does |
|---------|---------|--------------|
| `confidence_threshold` | 0.7 | Minimum confidence (0-1) to match an intent. Lower = more matches but less accurate |
| `context_scope` | "node" | `"node"` = only messages in this node, `"conversation"` = entire call |
| `context_messages` | 6 | How many messages to consider for classification |

**Tips:**
- Use `confidence_threshold: 0.6` for more lenient matching
- Use `confidence_threshold: 0.8` for stricter matching
- Use `context_scope: "node"` for decision points
- Use `context_scope: "conversation"` when broader context matters

### Proactive Nodes: Speaking Before Waiting

The `proactive` field controls whether a node speaks immediately upon entry:

**"Set `proactive: true` to have the bot speak first (via static_text or LLM), then evaluate transitions."**

**When to Use `proactive: true`:**
- Greetings that welcome the caller
- Disclaimers that auto-advance
- Questions that prompt for information
- Any message you want to say proactively

**Behavior Matrix:**

| `proactive` | Transition | Behavior |
|-------------|------------|----------|
| `true` | `always` | Speak → Continue immediately (auto-advance) |
| `true` | `user_responded` | Speak → Wait for user (speak-then-listen) |
| `false` | `user_responded` | Silent → Wait → LLM responds (default) |
| `false` | `always` | Silent → Continue immediately (processing node) |

**Example Flow:**
```json
{
  "id": "disclaimer",
  "proactive": true,
  "static_text": "This call may be recorded.",
  "transitions": [
    {"condition": "always", "target": "greeting"}
  ]
},
{
  "id": "greeting",
  "proactive": true,
  "system_prompt": "Say hello and ask for their name.",
  "transitions": [
    {"condition": "user_responded", "target": "extract_name"}
  ]
}
```

**Key Points:**
- `proactive: true` + `always` = speak then auto-advance (replaces old "skip_response" pattern)
- `proactive: true` + `user_responded` = speak then wait for user (NEW capability!)
- Without `proactive: true`, the bot waits for caller input before speaking

### Common Transition Patterns

#### Pattern 1: Simple Linear Flow
```json
"transitions": [
  {"condition": "user_responded", "target": "next_node"}
]
```
Wait for caller to say something, then move on.

#### Pattern 2: Exit Detection with Fallback
```json
"transitions": [
  {"condition": "contains:goodbye", "target": "closing", "priority": 1},
  {"condition": "contains:bye", "target": "closing", "priority": 1},
  {"condition": "max_turns:10", "target": "closing", "priority": 2}
]
```
Check for goodbye words first, otherwise close after 10 exchanges.

#### Pattern 3: Auto-Advance After Message
```json
{
  "proactive": true,
  "transitions": [
    {"condition": "always", "target": "next_node"}
  ]
}
```
Set `proactive: true` to speak, then use `always` to automatically continue.

#### Pattern 4: Variable Extraction Results
```json
"transitions": [
  {"condition": "variables_extracted:name,email", "target": "success"},
  {"condition": "extraction_failed:name,email", "target": "retry"}
]
```
Branch based on whether info was captured.

---

## Global Intents: Topic Switching

Global intents allow callers to switch topics at any point during the call. Unlike node-level intents (which only work within a specific node), global intents are evaluated on EVERY user input, regardless of the current node.

### When to Use Global Intents

Use global intents when you want the caller to be able to:
- Switch between different topics at any time
- Jump to a specific section of the conversation
- Access help or support from anywhere in the call

**Perfect for:**
- Multi-topic education agents (e.g., "Tell me about MRI" from any node)
- Customer service with multiple departments
- FAQ systems with multiple categories

### How Global Intents Work

1. Caller says something
2. System checks global intents FIRST (before node-level transitions)
3. If a global intent matches with high confidence → jump to that topic
4. If no match → continue with normal node-level transitions

### Configuration

Global intents are defined at the workflow level:

```json
{
  "workflow": {
    "initial_node": "greeting",
    "global_intents": {
      "appointment_topic": {
        "description": "User wants to discuss appointments",
        "examples": ["appointment", "what to bring", "upcoming visit"],
        "target_node": "appointment_info"
      },
      "mri_topic": {
        "description": "User wants information about MRI",
        "examples": ["MRI", "scan", "magnetic", "imaging"],
        "target_node": "mri_info"
      },
      "device_overview": {
        "description": "User wants an overview of their devices",
        "examples": ["my devices", "device overview", "what devices"],
        "target_node": "device_overview"
      }
    },
    "global_intent_config": {
      "enabled": true,
      "confidence_threshold": 0.75,
      "context_messages": 4
    },
    "nodes": [...]
  }
}
```

### Global Intent Fields

| Field | Required | Description |
|-------|----------|-------------|
| `description` | ✅ Yes | What this intent represents (used for AI classification) |
| `examples` | ❌ No | Example phrases that trigger this intent |
| `target_node` | ✅ Yes | Node to jump to when intent matches |
| `priority` | ❌ No | Higher priority wins when multiple intents match (default: 0) |
| `active_from_nodes` | ❌ No | Only evaluate when in these nodes (whitelist) |
| `excluded_from_nodes` | ❌ No | Never evaluate when in these nodes (blacklist) |

### Global Intent Config

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable/disable global intent matching |
| `confidence_threshold` | `0.75` | Minimum confidence to trigger (higher than node-level for safety) |
| `context_messages` | `4` | Messages to include in classification context |

### Controlling Where Intents Are Active

You can limit which nodes a global intent is active from:

```json
{
  "global_intents": {
    "emergency_exit": {
      "description": "User wants to end the call immediately",
      "target_node": "closing",
      "excluded_from_nodes": ["closing", "end_call"]
    },
    "detailed_info": {
      "description": "User wants detailed information",
      "target_node": "detailed_explanation",
      "active_from_nodes": ["overview", "summary", "intro"]
    }
  }
}
```

- **`active_from_nodes`**: Intent only works when in these nodes (whitelist)
- **`excluded_from_nodes`**: Intent never works when in these nodes (blacklist)

### Example: Multi-Topic Healthcare Agent

```json
{
  "workflow": {
    "initial_node": "greeting",
    "global_intents": {
      "medication_topic": {
        "description": "User wants to discuss medications",
        "examples": ["medication", "pills", "dosage", "prescription"],
        "target_node": "medication_info",
        "priority": 10
      },
      "appointment_topic": {
        "description": "User wants information about appointments",
        "examples": ["appointment", "schedule", "visit"],
        "target_node": "appointment_info",
        "priority": 10
      },
      "emergency_topic": {
        "description": "User is experiencing an emergency",
        "examples": ["emergency", "urgent", "help immediately"],
        "target_node": "emergency_redirect",
        "priority": 100,
        "excluded_from_nodes": ["emergency_redirect"]
      }
    },
    "global_intent_config": {
      "enabled": true,
      "confidence_threshold": 0.7
    },
    "nodes": [
      {
        "id": "greeting",
        "type": "standard",
        "name": "Welcome",
        "system_prompt": "Welcome the caller and ask what topic they'd like to discuss."
      },
      {
        "id": "medication_info",
        "type": "standard",
        "name": "Medication Information",
        "system_prompt": "Provide information about medications."
      },
      {
        "id": "appointment_info",
        "type": "standard",
        "name": "Appointment Information",
        "system_prompt": "Provide information about appointments."
      },
      {
        "id": "emergency_redirect",
        "type": "standard",
        "name": "Emergency Redirect",
        "proactive": true,
        "system_prompt": "Tell the caller to call 911 for emergencies.",
        "transitions": [
          {"condition": "always", "target": "end_call"}
        ]
      }
    ]
  }
}
```

### Global Intents vs Node-Level Intents

| Feature | Global Intents | Node-Level Intents |
|---------|---------------|-------------------|
| **Scope** | Entire workflow | Single node only |
| **Evaluation** | Checked first on every input | Checked only in that node |
| **Use Case** | Topic switching | Routing within a decision point |
| **Confidence** | Higher threshold (0.75) | Standard threshold (0.6-0.7) |
| **Priority** | Takes precedence | Only if global doesn't match |

---

## Actions: Making Things Happen

Actions let you trigger events when entering or leaving a node.

### Action Structure

```json
{
  "actions": {
    "on_entry": ["action1", "action2"],
    "on_exit": ["action3"]
  }
}
```

- `on_entry`: Runs when entering this node
- `on_exit`: Runs when leaving this node

### Action Types

#### 1. Log Action
Writes a message to the system logs.

```json
"actions": {
  "on_entry": [
    "log:Caller entered support node",
    "log:Caller name is {{caller_name}}"
  ]
}
```

**Special:** Use `log:variables` to log all captured variables.

#### 2. Webhook Action
Sends data to an external system.

```json
"actions": {
  "on_exit": [
    "webhook:https://your-crm.com/api/call-data"
  ]
}
```

**What Gets Sent:**
```json
{
  "action_type": "on_exit",
  "node_id": "survey",
  "timestamp": 1234567890.123,
  "session_id": "call-abc-123",
  "collected_data": {
    "caller_name": "John Smith",
    "rating": "5"
  }
}
```

#### 3. Hangup Action
Ends the call immediately.

```json
"actions": {
  "on_entry": ["hangup"]
}
```

**Note:** It's usually better to use an `end_call` node type instead.

#### 4. Custom Action
Triggers custom code (requires developer setup).

```json
"actions": {
  "on_entry": ["custom:send_sms_notification"]
}
```

### Variable Substitution in Actions

You can include captured variables in action values:

```json
"actions": {
  "on_entry": [
    "log:Call from {{first_name}} {{last_name}}",
    "log:Topic: {{topic}}"
  ]
}
```

---

## Variables: Capturing Information

Variables let you personalize conversations by capturing and reusing caller information.

### How Variables Work

1. **Capture**: Use a `retrieve_variable` node to extract info
2. **Store**: System stores as `{{variable_name}}`
3. **Use**: Reference in prompts with `{{variable_name}}`

### Example Flow

```
1. Greeting → Ask for name
2. Extract Name → Capture "{{first_name}}"
3. Personalized Message → "Hello {{first_name}}!"
```

### Using Variables in Prompts

```json
{
  "system_prompt": "Address the caller as {{first_name}}. They are interested in {{topic}}. Provide helpful information."
}
```

**If variable not found:**
- If `default_value` was set: Uses that value
- If variable exists but is null: Shows as text "null"
- If variable name doesn't exist: Placeholder stays unchanged

### Automatic Context Preservation

The system automatically helps the AI remember what's happened:

1. **Variable Summary**: When you've collected variables, the AI automatically knows about them in subsequent nodes
2. **Conversation Progress**: After initial greetings, the AI knows not to re-introduce itself

This means your prompts can focus on the current task without repeating everything.

### Using Variables in Static Text

```json
{
  "static_text": "Thank you for calling, {{first_name}}. Your confirmation number is ready."
}
```

### Extraction Best Practices

**Good Extraction Prompts:**
```json
{
  "variable_name": "phone_number",
  "extraction_prompt": "Extract the caller's phone number. Return only the digits, no formatting. If no phone number mentioned, return null.",
  "default_value": null
}
```

**Keep prompts specific:**
- Tell the AI exactly what format you want
- Specify what to do if info is missing
- Use `default_value` for graceful fallbacks

---

## Knowledge Base (RAG)

RAG (Retrieval-Augmented Generation) lets your agent access a knowledge base to answer questions.

### How It Works

1. Caller asks a question
2. System searches knowledge base for relevant information
3. Agent receives this information as context
4. Agent formulates answer using the knowledge

### Enabling/Disabling RAG Per Node

```json
{
  "id": "faq_node",
  "system_prompt": "Answer questions using the knowledge base.",
  "rag": {
    "enabled": true,
    "search_mode": "hybrid",
    "top_k": 5
  }
},
{
  "id": "greeting",
  "system_prompt": "Greet the caller warmly.",
  "rag": {
    "enabled": false
  }
}
```

### When to Enable RAG

| Node Type | RAG Recommended |
|-----------|----------------|
| Greeting | No - doesn't need knowledge |
| FAQ/Information | Yes - needs knowledge base |
| Survey/Questions | No - asking, not answering |
| Closing | No - standard farewell |

### Search Modes Explained

| Mode | Best For | Description |
|------|----------|-------------|
| `vector` | Conceptual questions | Understands meaning, not just keywords |
| `fts` | Exact terms | Matches specific words exactly |
| `hybrid` | General use | Combines both approaches (recommended) |

### RAG Settings

```json
"rag": {
  "enabled": true,
  "search_mode": "hybrid",
  "top_k": 5,
  "vector_weight": 0.7,
  "fts_weight": 0.3
}
```

| Setting | What It Does | Recommended |
|---------|--------------|-------------|
| `enabled` | Turn RAG on/off | true for info nodes |
| `search_mode` | How to search | "hybrid" |
| `top_k` | How many chunks to retrieve | 5-10 |
| `vector_weight` | Weight for meaning-based search | 0.6-0.8 |
| `fts_weight` | Weight for keyword search | 0.2-0.4 |

**Tip:** `vector_weight + fts_weight` should equal 1.0

---

## Interruption Handling

Control what happens when a caller interrupts the agent while it's speaking.

### Global Settings

```json
{
  "workflow": {
    "interruption_settings": {
      "enabled": true,
      "delay_ms": 300,
      "resume_prompt": "Go ahead"
    }
  }
}
```

| Setting | What It Does | Recommended |
|---------|--------------|-------------|
| `enabled` | Allow interruptions at all | true |
| `delay_ms` | How long caller speaks before triggering | 300 |
| `resume_prompt` | What bot says after interruption | "Go ahead" |

### Per-Node Override

Override the global setting for specific nodes:

```json
{
  "id": "important_disclaimer",
  "interruptions_enabled": false,
  "system_prompt": "Deliver the legal disclaimer completely."
},
{
  "id": "conversation",
  "interruptions_enabled": true,
  "system_prompt": "Have a natural conversation."
}
```

### When to Disable Interruptions

- Legal disclaimers
- Critical safety information
- Short greetings
- Compliance messages
- End-of-call farewells

---

## Voice and Speech Settings

### TTS (Text-to-Speech) Configuration

```json
{
  "workflow": {
    "tts": {
      "enabled": true,
      "voice_name": "george",
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true
    }
  }
}
```

| Setting | What It Does | Range |
|---------|--------------|-------|
| `enabled` | Turn speech on | true/false |
| `voice_name` | Which voice to use | See available voices |
| `stability` | Voice consistency | 0.0-1.0 |
| `similarity_boost` | Voice clarity | 0.0-1.0 |
| `style` | Expressiveness | 0.0-1.0 |
| `use_speaker_boost` | Enhanced audio | true/false |

### Available Voices

| Voice Name | Description |
|------------|-------------|
| `george` | Warm, captivating male voice |
| `rachel` | Matter-of-fact, personable female |
| `jonathan` | Calm, trustworthy, confident |

### LLM (AI Brain) Configuration

```json
{
  "workflow": {
    "llm": {
      "enabled": true,
      "model_name": "gpt4.1",
      "temperature": 1.0,
      "max_tokens": 150
    }
  }
}
```

| Setting | What It Does | Recommended |
|---------|--------------|-------------|
| `enabled` | Enable AI responses | true |
| `model_name` | Which AI model | "gpt4.1" |
| `temperature` | Creativity (0=consistent, 2=creative) | 0.8-1.0 |
| `max_tokens` | Maximum response length | 100-200 |

---

## Post-Call Analysis

After a call ends, the system can automatically analyze the transcript to extract insights and answer structured questions.

### Default Analysis

By default, every call gets basic analysis:
- **Sentiment**: positive, neutral, negative, or mixed
- **Sentiment Score**: -1.0 to 1.0 scale
- **Summary**: 2-3 sentence overview
- **Call Success**: Whether the call achieved its objective
- **Keywords**: Important terms detected
- **Topics**: Main subjects discussed

### Structured Questionnaires

For specialized use cases (healthcare, compliance, surveys), you can configure **post-call questionnaires** that extract structured data from the transcript.

**Use Cases:**
- **SDOH Data Collection**: Social Determinants of Health screening
- **Compliance Checklists**: Verify required disclosures were made
- **Survey Responses**: Extract ratings and feedback
- **Sales Qualification**: Capture lead information

### Configuration

Add questionnaires to the workflow configuration:

```json
{
  "workflow": {
    "initial_node": "greeting",
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
          "name": "Customer satisfaction rating",
          "type": "number",
          "description": "Rating from 1-5 given by the customer"
        },
        {
          "name": "Caller's main concern",
          "type": "string",
          "description": "Summarize the caller's primary issue"
        },
        {
          "name": "Caller agreed to callback",
          "type": "boolean"
        }
      ],
      "additional_instructions": "Focus on social determinants of health indicators."
    },
    "nodes": [...]
  }
}
```

### Question Types

| Type | Description | Example Answer |
|------|-------------|----------------|
| `string` | Free-text answer | "The caller was concerned about medication costs" |
| `number` | Numeric value | 4.5 |
| `boolean` | Yes/No answer | true |
| `enum` | One of predefined choices | "yes_worried" |

### Question Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ Yes | Question text or identifier |
| `type` | ❌ No | "string", "number", "enum", "boolean" (default: string) |
| `description` | ❌ No | Additional context for the AI |
| `choices` | ⚠️ For enum | Array of valid choices with value/label |
| `required` | ❌ No | Whether this must be answered (default: false) |

### Enum Choices

For `enum` type questions, define valid choices:

```json
{
  "name": "Employment status",
  "type": "enum",
  "choices": [
    {"value": "full_time", "label": "Full-time employment"},
    {"value": "part_time", "label": "Part-time employment"},
    {"value": "unemployed", "label": "Unemployed"},
    {"value": "retired", "label": "Retired"}
  ],
  "required": true
}
```

The AI will only return one of the defined `value` options.

### Example: Healthcare SDOH Screening

```json
{
  "workflow": {
    "post_call_analysis": {
      "enabled": true,
      "questions": [
        {
          "name": "Housing stability",
          "type": "enum",
          "choices": [
            {"value": "stable"},
            {"value": "at_risk"},
            {"value": "unstable"}
          ],
          "required": true
        },
        {
          "name": "Food security concerns",
          "type": "boolean",
          "description": "Did the caller express concerns about access to food?"
        },
        {
          "name": "Transportation barriers",
          "type": "boolean",
          "description": "Does the caller have difficulty getting to appointments?"
        },
        {
          "name": "Number of risk factors identified",
          "type": "number",
          "description": "Count of concerning responses across all questions"
        }
      ],
      "additional_instructions": "Be sensitive to indirect mentions of hardship. Consider context when answering."
    }
  }
}
```

### Analysis Results

Question responses are stored in the database with:
- **Question Name**: The question identifier
- **Answer**: The extracted value
- **Confidence**: AI's confidence in the answer (0.0-1.0)

### Additional Instructions

Use `additional_instructions` to guide the AI:

```json
{
  "additional_instructions": "Focus on social determinants of health. Consider cultural context. If the caller mentions family members having issues, note that as well."
}
```

### Best Practices

1. **Be Specific**: Use clear question names that describe exactly what you're looking for
2. **Use Descriptions**: Add descriptions for complex questions to help the AI
3. **Choose Right Type**: Use `enum` when you need predefined categories
4. **Set Required Carefully**: Only mark truly essential questions as required
5. **Test With Real Data**: Verify the AI correctly interprets your questions

---

## Complete Workflow Examples

### Example 1: Simple Greeting Agent

```json
{
  "agent": {
    "id": "simple_greeter",
    "name": "Simple Greeting Agent"
  },
  "workflow": {
    "initial_node": "greeting",
    "global_prompt": "You are a friendly assistant. Be helpful and concise.",
    "llm": {
      "enabled": true,
      "model_name": "gpt4.1",
      "temperature": 1.0,
      "max_tokens": 150
    },
    "tts": {
      "enabled": true,
      "voice_name": "george"
    },
    "nodes": [
      {
        "id": "greeting",
        "type": "standard",
        "name": "Welcome",
        "system_prompt": "Greet the caller and ask how you can help.",
        "transitions": [
          {
            "condition": "contains:bye",
            "target": "closing",
            "priority": 1
          },
          {
            "condition": "max_turns:10",
            "target": "closing",
            "priority": 2
          }
        ]
      },
      {
        "id": "closing",
        "type": "standard",
        "name": "Goodbye",
        "proactive": true,
        "system_prompt": "Thank the caller and say goodbye.",
        "interruptions_enabled": false,
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

### Example 2: Name Collection Agent

```json
{
  "agent": {
    "id": "name_collector",
    "name": "Name Collection Agent"
  },
  "workflow": {
    "initial_node": "disclaimer",
    "global_prompt": "You are a polite assistant collecting caller information.",
    "llm": {
      "enabled": true,
      "model_name": "gpt4.1",
      "temperature": 1.0,
      "max_tokens": 150
    },
    "tts": {
      "enabled": true,
      "voice_name": "rachel"
    },
    "nodes": [
      {
        "id": "disclaimer",
        "type": "standard",
        "name": "Disclaimer",
        "proactive": true,
        "interruptions_enabled": false,
        "static_text": "This call may be recorded.",
        "transitions": [
          {
            "condition": "always",
            "target": "ask_name"
          }
        ]
      },
      {
        "id": "ask_name",
        "type": "standard",
        "name": "Ask for Name",
        "proactive": true,
        "system_prompt": "Greet the caller and ask for their first and last name.",
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
            "variable_name": "first_name",
            "extraction_prompt": "Extract the caller's first name.",
            "default_value": "Friend"
          },
          {
            "variable_name": "last_name",
            "extraction_prompt": "Extract the caller's last name.",
            "default_value": ""
          }
        ],
        "transitions": [
          {
            "condition": "variables_extracted:first_name",
            "target": "confirm_name"
          },
          {
            "condition": "extraction_failed:first_name",
            "target": "ask_name"
          }
        ]
      },
      {
        "id": "confirm_name",
        "type": "standard",
        "name": "Confirm Name",
        "system_prompt": "Greet {{first_name}} {{last_name}} by name and ask how you can help today.",
        "transitions": [
          {
            "condition": "contains:bye",
            "target": "closing",
            "priority": 1
          },
          {
            "condition": "max_turns:5",
            "target": "closing",
            "priority": 2
          }
        ],
        "actions": {
          "on_entry": [
            "log:Caller identified as {{first_name}} {{last_name}}"
          ]
        }
      },
      {
        "id": "closing",
        "type": "standard",
        "name": "Goodbye",
        "proactive": true,
        "interruptions_enabled": false,
        "system_prompt": "Thank {{first_name}} for calling and wish them a good day.",
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

### Example 3: Topic Router with Intents

```json
{
  "agent": {
    "id": "topic_router",
    "name": "Topic Routing Agent"
  },
  "workflow": {
    "initial_node": "greeting",
    "global_prompt": "You are a helpful assistant. Route callers to the right department.",
    "llm": {
      "enabled": true,
      "model_name": "gpt4.1",
      "temperature": 0.8,
      "max_tokens": 150
    },
    "tts": {
      "enabled": true,
      "voice_name": "jonathan"
    },
    "nodes": [
      {
        "id": "greeting",
        "type": "standard",
        "name": "Welcome",
        "proactive": true,
        "system_prompt": "Welcome the caller. Ask if they need help with billing, technical support, or something else.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "listen_for_topic"
          }
        ]
      },
      {
        "id": "listen_for_topic",
        "type": "standard",
        "name": "Listen for Topic",
        "system_prompt": "Listen to what the caller needs help with.",
        "intents": {
          "billing": {
            "description": "Caller has billing, payment, or invoice questions",
            "examples": ["billing question", "my bill", "payment issue", "charge on my account"]
          },
          "technical": {
            "description": "Caller needs technical help or support",
            "examples": ["not working", "technical issue", "error message", "help with"]
          },
          "general": {
            "description": "General questions or other topics",
            "examples": ["question", "information", "I need help"]
          }
        },
        "intent_config": {
          "confidence_threshold": 0.6,
          "context_scope": "node",
          "context_messages": 4
        },
        "transitions": [
          {
            "condition": "intent:billing",
            "target": "billing_support",
            "priority": 1
          },
          {
            "condition": "intent:technical",
            "target": "tech_support",
            "priority": 1
          },
          {
            "condition": "intent:general",
            "target": "general_support",
            "priority": 2
          },
          {
            "condition": "intent:no_match",
            "target": "general_support",
            "priority": 3
          },
          {
            "condition": "max_turns:3",
            "target": "general_support",
            "priority": 10
          }
        ]
      },
      {
        "id": "billing_support",
        "type": "standard",
        "name": "Billing Support",
        "system_prompt": "Help the caller with billing questions. Be helpful and clear.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 5
        },
        "transitions": [
          {
            "condition": "contains:bye",
            "target": "closing",
            "priority": 1
          },
          {
            "condition": "max_turns:8",
            "target": "closing",
            "priority": 2
          }
        ],
        "actions": {
          "on_entry": ["log:Routed to billing support"]
        }
      },
      {
        "id": "tech_support",
        "type": "standard",
        "name": "Technical Support",
        "system_prompt": "Help the caller with technical issues. Be patient and thorough.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid",
          "top_k": 8
        },
        "transitions": [
          {
            "condition": "contains:bye",
            "target": "closing",
            "priority": 1
          },
          {
            "condition": "max_turns:10",
            "target": "closing",
            "priority": 2
          }
        ],
        "actions": {
          "on_entry": ["log:Routed to technical support"]
        }
      },
      {
        "id": "general_support",
        "type": "standard",
        "name": "General Support",
        "system_prompt": "Help the caller with their general questions.",
        "transitions": [
          {
            "condition": "contains:bye",
            "target": "closing",
            "priority": 1
          },
          {
            "condition": "max_turns:8",
            "target": "closing",
            "priority": 2
          }
        ],
        "actions": {
          "on_entry": ["log:Routed to general support"]
        }
      },
      {
        "id": "closing",
        "type": "standard",
        "name": "Goodbye",
        "proactive": true,
        "interruptions_enabled": false,
        "system_prompt": "Thank the caller for calling and wish them well.",
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

---

## Reading the Logs

The system produces logs that help you understand what's happening. Here's how to read them:

### Key Log Messages

| Log Pattern | Meaning |
|-------------|---------|
| `🎬 WORKFLOW STARTED` | Call started, agent initialized |
| `📍 NODE ACTIVE` | Agent entered a new node |
| `➡️ TRANSITION` | Moving from one node to another |
| `👤 User:` | What the caller said |
| `🤖 Assistant:` | What the agent said |
| `✅ Variable extracted` | Successfully captured information |
| `⚠️ Variable not found` | Failed to find information |
| `🧠 RAG:` | Knowledge base search results |
| `⚡ User interrupted bot` | Caller interrupted the agent |
| `☎️ END_CALL NODE REACHED` | Call is ending |

### Example Log Flow

```
🎬 WORKFLOW STARTED | Node: greeting | Welcome Greeting
📍 NODE ACTIVE | greeting | Welcome Greeting
🤖 Assistant: Hello! How can I help you today?
👤 User: I need help with my bill
➡️ TRANSITION | greeting → billing_support | intent:billing
📍 NODE ACTIVE | billing_support | Billing Support
🧠 RAG: Found 5 relevant chunks
🤖 Assistant: I'd be happy to help with your bill...
```

### Troubleshooting with Logs

**Problem:** Bot not speaking
- Look for: `📍 NODE ACTIVE` - is it reaching the node?
- Check: Is `proactive: true` missing? Without it, the bot waits for input before speaking.

**Problem:** Wrong transition firing
- Look for: `➡️ TRANSITION` - which condition triggered?
- Check: Priority order - higher priority checked first

**Problem:** Variable not captured
- Look for: `⚠️ Variable not found` or `✅ Variable extracted`
- Check: Extraction prompt clarity, conversation context

---

## Common Patterns and Recipes

### Pattern 1: Speak-Then-Listen (Most Common)

```json
{
  "id": "speak_then_listen",
  "proactive": true,
  "system_prompt": "Say your message here and wait for response.",
  "transitions": [
    {"condition": "user_responded", "target": "next"}
  ]
}
```
With `proactive: true` + `user_responded`, the bot speaks first then waits for user input.

### Pattern 2: Collect Information Then Confirm

```json
[
  {
    "id": "ask",
    "proactive": true,
    "system_prompt": "Ask for the information.",
    "transitions": [
      {"condition": "user_responded", "target": "extract"}
    ]
  },
  {
    "id": "extract",
    "type": "retrieve_variable",
    "variables": [...],
    "transitions": [
      {"condition": "variables_extracted:...", "target": "confirm"},
      {"condition": "extraction_failed:...", "target": "ask"}
    ]
  },
  {
    "id": "confirm",
    "proactive": true,
    "system_prompt": "Confirm the information with {{variable}}.",
    "transitions": [...]
  }
]
```
With `proactive: true`, the ask and confirm nodes speak first then wait for user response.

### Pattern 3: Early Exit Detection

Always add goodbye detection as highest priority:

```json
"transitions": [
  {"condition": "contains:goodbye", "target": "closing", "priority": 1},
  {"condition": "contains:bye", "target": "closing", "priority": 1},
  {"condition": "contains:hang up", "target": "closing", "priority": 1},
  // ... other transitions with lower priority
]
```

### Pattern 4: Conversation Limits

Always include a max_turns fallback:

```json
"transitions": [
  // ... other transitions
  {"condition": "max_turns:10", "target": "closing", "priority": 10}
]
```

### Pattern 5: Intent-Based Routing

```json
{
  "intents": {
    "option_a": {"description": "...", "examples": ["..."]},
    "option_b": {"description": "...", "examples": ["..."]},
    "option_c": {"description": "...", "examples": ["..."]}
  },
  "transitions": [
    {"condition": "intent:option_a", "target": "node_a", "priority": 1},
    {"condition": "intent:option_b", "target": "node_b", "priority": 1},
    {"condition": "intent:option_c", "target": "node_c", "priority": 1},
    {"condition": "intent:no_match", "target": "fallback", "priority": 2}
  ]
}
```

---

## Important Warnings

### Must-Have Settings

Every agent configuration MUST have these sections to function:

1. **LLM Section** - Without this, the bot cannot generate responses
   ```json
   "workflow": {
     "llm": {
       "enabled": true,
       "model_name": "gpt4.1"
     }
   }
   ```

2. **TTS Section** - Without this, the bot cannot speak
   ```json
   "workflow": {
     "tts": {
       "enabled": true,
       "voice_name": "george"
     }
   }
   ```

3. **At Least One end_call Node** - Every workflow needs a way to end

### Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Missing `proactive: true` for greetings | Bot waits silently for user input | Add `proactive: true` to speak first |
| Using `always` without `proactive: true` | Skips to next node without speaking | Use `proactive: true` + `always` to speak then continue |
| Missing goodbye detection | Call may run forever | Add `contains:bye` with high priority |
| No `max_turns` fallback | Infinite loops possible | Add `max_turns:10` with low priority |
| Same priority for different transitions | Order may be unpredictable | Use different priorities for clarity |
| Both `static_text` and `system_prompt` | Invalid configuration | Choose one or the other |

### Priority Numbers Are "Checked First" Order

Remember: **Lower priority number = Checked first**

- Priority 1 is "1st priority" (checked first)
- Priority 10 is "10th priority" (checked last)

This is intuitive if you think "1st, 2nd, 3rd..."

---

## Troubleshooting Guide

### Bot Doesn't Speak When Expected

**Symptom:** Node activates but bot stays silent

**Solutions:**
1. Add `proactive: true` to the node to trigger proactive speaking
2. Check if `tts.enabled` is true
3. Verify the node has `system_prompt` or `static_text`

### Bot Speaks But Doesn't Wait for Response

**Symptom:** Bot immediately moves to next node

**Solutions:**
1. Change transition from `always` to `user_responded` if you want to wait
2. Keep `proactive: true` but use `user_responded` to speak-then-wait
3. Check priority order of transitions

### Variables Not Being Captured

**Symptom:** `{{variable}}` shows as empty or null

**Solutions:**
1. Check extraction prompt is clear and specific
2. Verify the information exists in the conversation
3. Add a `default_value` for graceful fallback
4. Check logs for extraction results

### Wrong Intent Being Matched

**Symptom:** Routing to wrong node based on intent

**Solutions:**
1. Improve intent descriptions
2. Add more diverse examples
3. Lower `confidence_threshold`
4. Add `intent:no_match` fallback

### Call Never Ends

**Symptom:** Call continues indefinitely

**Solutions:**
1. Ensure you have an `end_call` node
2. Add `max_turns` fallback transitions
3. Check for circular transitions
4. Add timeout transitions

### Workflow Not Loading

**Symptom:** Error on startup

**Solutions:**
1. Verify JSON syntax is valid
2. Check `initial_node` matches a node ID
3. Ensure all transition targets exist
4. Verify you have at least one `end_call` node

### Common JSON Mistakes

| Mistake | Correct Format |
|---------|---------------|
| Missing comma after item | Add comma: `"field1": "value1",` |
| Extra comma at end | Remove last comma |
| Single quotes | Use double quotes: `"field"` |
| Missing brackets | Ensure `[]` for arrays, `{}` for objects |
| Typo in node ID | IDs must match exactly (case-sensitive) |

---

## Quick Reference Card

### Node Types
- `standard` - Regular conversation (default)
- `retrieve_variable` - Capture information
- `end_call` - Terminate call

### Transition Conditions
- `user_responded` - After any response
- `contains:word` - Contains keyword
- `max_turns:N` - After N exchanges
- `timeout:Ns` - After N seconds
- `always` - Immediately (with `proactive: true` = speak first)
- `variables_extracted:x,y` - Variables captured
- `extraction_failed:x,y` - Variables missing
- `intent:name` - Intent matched
- `intent:no_match` - No intent matched

### Proactive Field
- `proactive: true` - Node speaks first (via static_text or LLM)
- `proactive: false` - Node waits for user input before responding (default)

### Actions
- `log:message` - Log message
- `webhook:url` - Send data
- `hangup` - End call
- `custom:name` - Custom action

### Priority
- Lower number = Higher priority
- Priority 1 checked before Priority 2
- Default priority is 0

### Variables
- Capture: `retrieve_variable` node
- Use: `{{variable_name}}` in prompts

---

**Document Version:** 1.2.0
**Last Updated:** 2026-01-15

**Changelog:**
- 1.2.0 (2026-01-15): Replaced `skip_response` transition with `proactive` field model; Updated all examples to use `proactive: true` + `always` for speak-then-continue pattern
- 1.1.0 (2026-01-14): Added Global Intents section for topic switching; Added Post-Call Analysis section with structured questionnaires
- 1.0.0 (2025-11-23): Initial release
