# Call Recording Configuration Guide

## Default Settings

### Recording Config (in workflow)

**Default Behavior:** Recording is **ON** by default for compliance purposes.

If you need to disable recording for a specific agent, explicitly set it:
```json
{
  "recording": {
    "enabled": false
  }
}
```

**System-wide settings** (in `.env`):
- `RECORDING_TRACK=both` - Which audio to record (inbound, outbound, both)
- `RECORDING_CHANNELS=dual` - Mono or dual-channel recording

### Interruption Settings (in workflow)
```json
{
  "interruption_settings": {
    "enabled": true,
    "delay_ms": 300,
    "resume_prompt": "Go ahead"
  }
}
```

---

## Agent Configuration Examples

### Minimal Recording Config (uses defaults)
```json
// scripts/seed_data/tenant_12345/agent_sales.json
{
  "agent": {
    "id": "sales",
    "name": "Sales Assistant"
  },
  "workflow": {
    "initial_node": "greeting",
    "recording": {
      "enabled": true
    },
    "nodes": [
      {
        "id": "greeting",
        "name": "Greeting",
        "system_prompt": "Welcome the caller warmly.",
        "transitions": [
          {
            "condition": "user_responded",
            "target": "conversation"
          }
        ]
      }
    ]
  }
}
```

**Result:**
- ✅ Recording enabled
- ✅ Both tracks recorded (inbound + outbound)
- ✅ Dual-channel recording (separate audio)
- ✅ Metadata saved to S3

---

### Full Recording Config (all options)
```json
// scripts/seed_data/tenant_12345/agent_support.json
{
  "agent": {
    "id": "support",
    "name": "Customer Support"
  },
  "workflow": {
    "initial_node": "greeting",
    "recording": {
      "enabled": true,
      "track": "both",
      "channels": "dual"
    },
    "interruption_settings": {
      "enabled": true,
      "delay_ms": 500,
      "resume_prompt": "Please continue"
    },
    "nodes": [
      {
        "id": "greeting",
        "name": "Greeting",
        "system_prompt": "Greet the customer professionally.",
        "interruptions_enabled": false,
        "transitions": [
          {
            "condition": "user_responded",
            "target": "issue_collection"
          }
        ]
      }
    ]
  }
}
```

**Result:**
- ✅ Recording enabled
- ✅ Both tracks recorded
- ✅ Dual-channel (user on left, bot on right)
- ✅ 500ms interruption delay
- ✅ Custom resume prompt
- ✅ Greeting not interruptible

---

### Recording Options Explained

#### `track` (what audio to record)
- **`"inbound"`** - Only record user's audio (caller speaking)
- **`"outbound"`** - Only record bot's audio (TTS output)
- **`"both"`** - Record both user and bot audio (default, recommended)

#### `channels` (how to structure the recording)
- **`"mono"`** - Single channel, mixed audio (user + bot together)
- **`"dual"`** - Dual channel, separate tracks (user left, bot right) (default, recommended)

---

## Recording Disabled Example

To disable recording for a specific agent, explicitly set `enabled: false`:

```json
// scripts/seed_data/tenant_12345/agent_demo.json
{
  "agent": {
    "id": "demo",
    "name": "Demo Agent"
  },
  "workflow": {
    "initial_node": "greeting",
    "recording": {
      "enabled": false
    },
    "nodes": [
      {
        "id": "greeting",
        "name": "Greeting",
        "proactive": true,
        "system_prompt": "Provide a demo.",
        "transitions": [
          {
            "condition": "always",
            "target": "end"
          }
        ]
      }
    ]
  }
}
```

**Note:** Recording is **enabled by default** for compliance. Omitting the recording section means recording **will** be enabled.

**Result when disabled:**
- ❌ No recording
- ❌ No Twilio API call to start recording
- ❌ No S3 uploads
- ✅ Zero impact on call flow

---

## Environment Variables Required

```bash
# .env file

# Twilio credentials (required for recording API)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token

# Public webhook URL (REQUIRED for database updates)
RECORDING_WEBHOOK_BASE_URL=https://your-domain.com
```

---

## Recording Data Storage

When recording is enabled:

**Twilio handles:**
- Server-side call recording (zero latency)
- Direct upload to your configured S3 bucket (see Twilio Console)
- S3 path structure determined by Twilio's external storage configuration

**Orchestrator handles:**
- Recording metadata in PostgreSQL `calls` table:
  - `recording_sid` - Twilio recording identifier
  - `recording_url` - S3 URL of the recording file
  - `recording_enabled` - Whether recording was active
- Database updates via webhook callback from Twilio

### Database Schema (calls table)
```sql
recording_enabled BOOLEAN DEFAULT FALSE,
recording_sid VARCHAR(100),          -- Twilio recording SID (e.g., "RExxxx")
recording_url VARCHAR(500),          -- S3 URL to recording file
```

### Query Examples
```sql
-- Get all recorded calls
SELECT call_id, recording_sid, recording_url, started_at
FROM calls
WHERE recording_enabled = true AND recording_sid IS NOT NULL;

-- Get recording info for specific call
SELECT recording_sid, recording_url
FROM calls
WHERE call_id = 'your-call-id';
```

---

## Logs to Expect

### Recording Enabled
```
Recording manager initialized | webhook=https://your-domain.com/recording-status
📹 Recording started | recording_sid=RExxxx
Recording SID updated | call_id=... | recording_sid=RExxxx
Recording status webhook | recording_sid=RExxxx | status=completed
Recording URL updated in database | call_id=... | recording_url=https://s3...
```

### Recording Disabled
```
(No recording-related logs - completely silent)
```

### Webhook URL Not Set
```
RECORDING_WEBHOOK_BASE_URL not set - recording status webhook disabled.
Set RECORDING_WEBHOOK_BASE_URL to your public URL (e.g., https://your-domain.com)
Recording manager initialized | webhook=None (status updates disabled)
📹 Recording started | recording_sid=RExxxx
(No webhook callback - recording works but database not updated with URL)
```

---

## Quick Reference

| Setting | Default | Options | Description |
|---------|---------|---------|-------------|
| `enabled` | `true` | `true`, `false` | Enable/disable recording (default: enabled for compliance) |
| `track` | `"both"` | `"inbound"`, `"outbound"`, `"both"` | Which audio to record (system-wide via `.env`) |
| `channels` | `"dual"` | `"mono"`, `"dual"` | Mono or dual-channel (system-wide via `.env`) |

**Pro Tip:** Always use `track: "both"` and `channels: "dual"` for best quality and analysis flexibility.

---

## Troubleshooting

**Recording doesn't start:**
- ✅ Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`
- ✅ Verify agent JSON has `recording.enabled: true`
- ✅ Confirm Twilio external S3 storage is configured in Twilio Console

**Database not updated:**
- ✅ Check `RECORDING_WEBHOOK_BASE_URL` in `.env`
- ✅ Verify webhook URL is publicly accessible (use ngrok for local dev)
- ✅ Check PostgreSQL connection is working
- ✅ Verify Twilio is sending webhook callbacks (check Twilio logs)

**Recording works but database empty:**
- ✅ Set `RECORDING_WEBHOOK_BASE_URL` - recordings work without it but database won't be updated
- ✅ Check webhook endpoint is reachable from Twilio (test with curl)
