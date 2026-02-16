# Node-Based Workflow Guide

Quick guide for creating multi-stage conversation flows with dynamic branching, state management, and conditional logic.

> **Full Reference:** See [WORKFLOW_REFERENCE.md](./WORKFLOW_REFERENCE.md) for complete documentation of all features, conditions, and troubleshooting.

---

## Quick Start

### Why Use Workflows?

Use workflows for:

- Multi-stage conversations (greeting → topic selection → education → survey → closing)
- Dynamic branching based on user intent or responses
- Per-node configuration (different RAG settings, prompts per stage)
- Data collection throughout conversation
- Conditional actions (webhooks, logging, hangups)

Use single prompt for:

- Simple Q&A or chitchat
- No distinct conversation stages
- Simpler maintenance needs

---

## Basic Structure

```json
{
  "agent": {
    "id": "my_agent",
    "name": "My Workflow Agent"
  },
  "workflow": {
    "initial_node": "greeting",
    "history_window": 20,
    "max_transitions": 50,
    "nodes": [
      {
        "id": "greeting",
        "name": "Welcome",
        "system_prompt": "Greet the user warmly.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "main_conversation"
          }
        ],
        "actions": {
          "on_entry": ["log:Session started"]
        }
      },
      {
        "id": "main_conversation",
        "name": "Main Chat",
        "system_prompt": "Have a helpful conversation.",
        "transitions": [
          {
            "condition": "contains:goodbye",
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
        "type": "end_call",
        "name": "Farewell",
        "system_prompt": "Say goodbye warmly."
      }
    ]
  },
  "llm": {
    "model": "gpt-5-mini",
    "temperature": 0.8
  }
}
```

> **Note:** Voice/TTS and RAG configurations are stored in the database, not in agent JSON files.
> See `docs/AGENT_JSON_SCHEMA.md` for details on database-backed configurations.

---

## Node Configuration

### Node Types

**Standard Node:**

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

**End Node:**

```json
{
  "id": "closing",
  "type": "end_call",
  "system_prompt": "Say goodbye warmly."
}
```

**Note:** When a node with `type: "end"` is reached, the system automatically:

1. Delivers the closing message from the LLM
2. Waits 3 seconds for TTS to complete
3. Hangs up the call automatically (requires `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`)

**Variable Extraction Node:**

```json
{
  "id": "get_first_name",
  "type": "retrieve_variable",
  "variable_name": "first_name",
  "extraction_prompt": "Extract the user's first name from the conversation",
  "default_value": "there",
  "transitions": [
    {
      "condition": "always",
      "target": "greeting"
    }
  ]
}
```

**How it works:**

1. Analyzes entire conversation history up to this point
2. Uses the extraction LLM (configured via `workflow.extraction_llm.provider_id`) to identify the requested variable
3. Stores value in `collected_data[variable_name]`
4. Auto-transitions to first transition target (no user interaction)
5. Variable becomes available in subsequent nodes via `{{variable_name}}` syntax

**LLM Configuration:**
- By default, uses the agent's `extraction_llm` provider (typically a cheaper/faster model like gpt-5-mini)
- Per-node override available via `llm_override` field (see [AGENT_JSON_SCHEMA.md](./AGENT_JSON_SCHEMA.md))

**Variable Substitution:**
Once extracted, use variables in any subsequent node's system_prompt:

```json
{
  "id": "greeting",
  "system_prompt": "Say: Hello {{first_name}}, how can I help you today?"
}
```

Comments:

- If first_name = "John": "Hello John, how can I help..."
- If not found & default="there": "Hello there, how can I help..."
- If not found & no default: "Hello [MISSING: first_name], how can I help..."

**API Call Node:**

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
      "Authorization": "Bearer {{api_token}}"
    },
    "timeout_seconds": 30,
    "response_extraction": [
      {
        "path": "data.patient.first_name",
        "variable_name": "patient_first_name",
        "default_value": "Patient"
      }
    ]
  },
  "transitions": [
    { "condition": "api_success", "target": "show_info", "priority": 0 },
    { "condition": "api_failed", "target": "api_error", "priority": 1 }
  ]
}
```

**How it works:**

1. Optionally delivers `static_text` as a loading message
2. Executes HTTP request with variable substitution in URL, headers, body
3. Extracts values from JSON response using dot notation paths
4. Stores extracted values as variables for subsequent nodes
5. Auto-transitions based on `api_success` or `api_failed` conditions

**See [WORKFLOW_REFERENCE.md](./WORKFLOW_REFERENCE.md)** for complete API call configuration options.

**Multiple Variables:**
Extract multiple variables in sequence:

```json
{
  "nodes": [
    {
      "id": "get_name",
      "type": "retrieve_variable",
      "variable_name": "first_name",
      "extraction_prompt": "Extract the user's first name",
      "transitions": [
        {
          "condition": "always",
          "target": "get_topic"
        }
      ]
    },
    {
      "id": "get_topic",
      "type": "retrieve_variable",
      "variable_name": "topic_of_interest",
      "extraction_prompt": "Extract what health topic the user wants to learn about",
      "default_value": "general health",
      "transitions": [
        {
          "condition": "always",
          "target": "personalized_conversation"
        }
      ]
    },
    {
      "id": "personalized_conversation",
      "system_prompt": "Address the user as {{first_name}} and discuss {{topic_of_interest}}.\nProvide educational information tailored to their interest."
    }
  ]
}
```

### Global Prompt

> **Note:** The `global_prompt` is stored in the **database column** (`agent_config_versions.global_prompt`), NOT in the JSON configuration. When seeding from JSON files, include `global_prompt` in the workflow section and the seed script will extract it to the database column.

Prepended to **every** node's system prompt. Use for:

- Agent identity and name
- Safety guardrails
- Compliance requirements
- Common instructions

**Example content for global_prompt:**
```
You are Dr. Smith, a medical education assistant.
NEVER give medical advice - education only.
Always recommend consulting a healthcare provider.
```

**Final prompt = `global_prompt + "\n\n" + node.system_prompt`**

---

## Transition Conditions

Transitions determine when to move between nodes. **First matching condition wins.**

### Pattern-Based (Fast, ~0ms)

```json
{
  "transitions": [
    {
      "condition": "timeout:10s",
      "target": "next_node"
    },
    {
      "condition": "max_turns:5",
      "target": "next_node"
    },
    {
      "condition": "contains:help",
      "target": "help_node"
    },
    {
      "condition": "user_responded",
      "target": "next_node"
    },
    {
      "condition": "survey_complete",
      "target": "closing"
    }
  ]
}
```

### Variable-Based (Deterministic, ~0ms)

```json
{
  "transitions": [
    {
      "condition": "variable_equals:call_intent_in_days=5",
      "target": "five_day_flow",
      "priority": 1
    },
    {
      "condition": "variable_equals:call_intent_in_days=30",
      "target": "thirty_day_flow",
      "priority": 2
    },
    {
      "condition": "always",
      "target": "default_flow",
      "priority": 10
    }
  ]
}
```

Use `variable_equals:var_name=value` to route based on collected variable values (case-insensitive comparison). Ideal for branching on API response data or extracted variables without LLM calls.

### Intent-Based (LLM Batch Classification, ~100-150ms)

```json
{
  "intents": {
    "wants_diabetes_info": {
      "description": "User wants to learn about diabetes",
      "examples": ["tell me about diabetes", "diabetes info"]
    },
    "wants_support": {
      "description": "User needs help or support",
      "examples": ["I need help", "can you help me"]
    }
  },
  "transitions": [
    {
      "condition": "intent:wants_diabetes_info",
      "target": "diabetes_education"
    },
    {
      "condition": "intent:wants_support",
      "target": "support"
    },
    {
      "condition": "intent:no_match",
      "target": "general"
    }
  ]
}
```

**Note:** Semantic conditions (e.g., `user_satisfied`) have been removed. Use intent-based transitions for LLM-powered routing.

### Evaluation Order

Transitions are evaluated by priority (lower number = higher priority). Without explicit priority, transitions are evaluated in array order.

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

**Evaluation order:** Priority 1 → Priority 2 → Priority 3 (like "1st priority", "2nd priority")

**Same priority handling:** Transitions with the same priority are evaluated in their **array order** (stable sort).

**Example:**
```json
{
  "transitions": [
    {"condition": "contains:goodbye", "priority": 1},  ← Checked 1st
    {"condition": "contains:bye", "priority": 1},      ← Checked 2nd (same priority, array order)
    {"condition": "max_turns:10", "priority": 2}       ← Checked 3rd
  ]
}
```

**Best practices:**
- Priority 1-3: Critical checks (timeouts, exit conditions)
- Priority 4-10: Normal flow control
- Priority 11+: Fallback behaviors
- Omit priority for simple flows (uses array order)
- Use same priority for related conditions that should be checked together

---

## Actions

Execute code on node entry or exit.

```json
{
  "actions": {
    "on_entry": ["log:Survey started", "webhook:https://api.example.com/start"],
    "on_exit": [
      "webhook:https://api.example.com/complete",
      "log:Survey completed",
      "hangup"
    ]
  }
}
```

### Action Types

| Action      | Format                 | Description            |
| ----------- | ---------------------- | ---------------------- |
| **log**     | `log:message`          | Log to console         |
| **webhook** | `webhook:url`          | POST data to API       |
| **hangup**  | `hangup`               | Terminate call         |
| **custom**  | `custom:function_name` | Custom Python function |

**Webhook Payload:**

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

---

## Data Collection

Capture structured data from user inputs.

```json
{
  "data_collection": [
    {
      "key": "selected_topic",
      "extract": "topic_name"
    },
    {
      "key": "survey_q1",
      "extract": "full_input"
    },
    {
      "key": "appointment_date",
      "extract": "llm_extract",
      "prompt": "Extract date in YYYY-MM-DD format or 'none'"
    }
  ]
}
```

### Extraction Strategies

- **`full_input`**: Store entire user message
- **`topic_name`**: Extract topic via keyword matching (glp1, colonoscopy, diabetes)
- **`llm_extract`**: Use LLM with custom prompt for structured extraction

Collected data available in:

- Transition conditions (intent classification)
- Action webhooks (JSON payload)
- Session summary logs

---

## Per-Node RAG

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

---

## Interruption Handling

Control how the bot responds when users interrupt its speech:

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

**Parameters:**

- `enabled` (default: `true`) - Enable/disable interruptions globally
- `delay_ms` (default: `300`) - Milliseconds of continuous user speech before interrupting bot
  - Lower values (100-200ms): More responsive, may trigger on noise
  - Higher values (400-600ms): More stable, feels less responsive
- `resume_prompt` (default: `"Go ahead"`) - Bot's response after interruption
  - Set to `null` or empty string for silent resume
  - Examples: `"Sorry, what were you saying?"`, `"Yes?"`, `"I'm listening"`

### Per-Node Override

Disable interruptions for specific nodes (e.g., important messages):

```json
{
  "nodes": [
    {
      "id": "greeting",
      "system_prompt": "Greet the user warmly.",
      "interruptions_enabled": false
    },
    {
      "id": "conversation",
      "system_prompt": "Have a conversation.",
      "interruptions_enabled": true
    },
    {
      "id": "important_notice",
      "system_prompt": "Deliver critical information.",
      "interruptions_enabled": false
    }
  ]
}
```

**When to disable interruptions:**

- Important safety/compliance information
- Critical instructions or warnings
- Short greetings or acknowledgments
- End-of-call messages

**Metrics:**

- Interruption count and rate tracked in session summary
- Per-node interruption tracking in debug logs
- Use `LOG_LEVEL=DEBUG` to see detailed interruption events

---

## History Windowing

Control conversation history preservation across transitions:

```json
{
  "workflow": {
    "history_window": 0
  }
}
```

Examples:

- `history_window: 0` - Keep ALL history (default)
- `history_window: 20` - Keep last 20 messages (10 exchanges)
- `history_window: 40` - Keep last 40 messages (20 exchanges)

**Benefits:**

- Prevents token limit issues in long conversations
- Reduces costs by 50-80% in multi-stage flows
- Maintains relevant recent context

---

## Complete Examples

### Example 1: Simple Linear Flow

```json
{
  "workflow": {
    "initial_node": "greeting",
    "nodes": [
      {
        "id": "greeting",
        "system_prompt": "Greet the user.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "conversation"
          }
        ]
      },
      {
        "id": "conversation",
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
        "system_prompt": "Say goodbye."
      }
    ]
  }
}
```

### Example 2: Topic Selection with Branching

```json
{
  "workflow": {
    "initial_node": "greeting",
    "global_prompt": "You are a helpful assistant.",
    "nodes": [
      {
        "id": "greeting",
        "system_prompt": "Welcome and ask what topic they need.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "topic_selection"
          }
        ]
      },
      {
        "id": "topic_selection",
        "system_prompt": "Listen to topic. Guide to billing, technical, or returns.",
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
        "system_prompt": "Help with billing.",
        "rag": {
          "enabled": true
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
        "system_prompt": "Help with technical issues.",
        "rag": {
          "enabled": true
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
        "system_prompt": "Help with returns.",
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
        "system_prompt": "General assistance.",
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
        "system_prompt": "Thank them and say goodbye."
      }
    ]
  }
}
```

### Example 3: Survey with Webhooks

```json
{
  "workflow": {
    "initial_node": "greeting",
    "history_window": 30,
    "nodes": [
      {
        "id": "greeting",
        "system_prompt": "Warmly greet the user.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "education"
          }
        ]
      },
      {
        "id": "education",
        "system_prompt": "Provide educational information.",
        "rag": {
          "enabled": true,
          "search_mode": "hybrid"
        },
        "transitions": [
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
        "system_prompt": "Ask two questions ONE AT A TIME:\n1. \"How satisfied were you? (1-5)\"\n2. \"Would you recommend us?\"",
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
        "system_prompt": "Thank them and say goodbye."
      }
    ]
  }
}
```

---

## Debugging

### Enable Debug Logging

```bash
LOG_LEVEL=DEBUG uv run uvicorn app.main:app --reload
```

### Key Log Messages

```
🔄 Workflow initialized | initial_node=greeting | nodes=5 | session=session_1
🎯 Transition triggered | from=greeting | to=conversation | condition=user_responded
✅ Transitioned | from=greeting → to=conversation | total_transitions=1
📥 User input | node=education | turn=3 | input=tell me more...
🧠 RAG enabled | node=education | mode=hybrid | top_k=5
🏁 Reached end node | node=closing
🔄 Workflow Summary | final_node=closing | transitions=4 | collected_data=3 items
```

### Troubleshooting Tips

**Workflow not loading:**

- Check JSON syntax and proper formatting
- Verify `initial_node` exists in nodes list
- Check logs for validation errors

**Transitions not firing:**

- Use `LOG_LEVEL=DEBUG` to see evaluation
- Check condition syntax (no spaces in `timeout:10s`)
- Test with simple `contains:` conditions first

**Context not switching:**

- Check logs for "Context switched" messages
- Verify `global_prompt` + node prompts are combining correctly
- Ensure history windowing isn't too aggressive

**RAG not working:**

- Verify per-node `rag.enabled` setting
- Check global RAG config in agent JSON
- Ensure FAISS indices exist

---

## Best Practices

1. **Start simple**: Begin with 3-4 nodes, add complexity gradually
2. **Global prompt for guardrails**: Put safety rules in `global_prompt`
3. **Clear node purposes**: Each node = ONE clear responsibility
4. **Timeout fallbacks**: Always include timeout transitions
5. **End nodes required**: Every workflow needs at least one `type: "end"` node
6. **Test transitions**: Use `LOG_LEVEL=DEBUG` to verify logic
7. **History windowing**: Start with `history_window: 0`, tune for long conversations
8. **Action timing**: Use `on_exit` for webhooks (send data after collection)
9. **Pattern first**: Use pattern conditions before intent conditions (faster)
10. **Disable RAG wisely**: Turn off for surveys, greetings, closings

---

## Example Workflows

Complete working examples in `scripts/seed_data/`:

- **`scripts/seed_data/tenant_*/agent_*.json`** - Working agent configurations (seeded to database)

---

## Full Documentation

For complete reference including:

- All transition conditions (pattern + intent)
- Action execution details and webhook payloads
- Data collection strategies and customization
- Performance optimization techniques
- Complete troubleshooting guide
- Architecture diagrams and API reference

See **[WORKFLOW_REFERENCE.md](./WORKFLOW_REFERENCE.md)**
