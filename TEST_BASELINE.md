# Stellar Echo - UI Test Baseline Documentation

**Date:** November 22, 2025
**Application Version:** v1.0.0
**Test Environment:** localhost:3000
**Test Credentials:** admin@example.com / password123

---

## Purpose

This document serves as a baseline for UI functionality testing before refactoring. Use this as a reference to verify that all functionality remains intact after code changes.

---

## Test Evidence Location

All screenshots are stored in:
```
.playwright-mcp/test-evidence/
```

---

## Prerequisites for Retesting

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Ensure database is running and seeded:**
   ```bash
   pnpm db:test    # Verify connection
   pnpm db:seed    # Create test user if needed
   ```

3. **Test credentials:**
   - Email: `admin@example.com`
   - Password: `password123`

---

## Test Checklist

### 1. Authentication Flow

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1 | Login page display | Navigate to `/login` | Login form with Email, Password fields and Login button |
| 1.2 | Login with valid credentials | Enter admin@example.com / password123, click Login | Toast "Login successful!", redirect to `/dashboard` |
| 1.3 | Login with invalid credentials | Enter wrong password | Error message displayed |
| 1.4 | User menu | Click user avatar in header | Dropdown shows email, role, and Log out option |
| 1.5 | Logout | Click "Log out" in user menu | Toast "Logged out successfully", redirect to `/login` |
| 1.6 | Protected routes | Try accessing `/dashboard` without login | Redirect to `/login` |

**Evidence:** `01-dashboard-loaded.png`, `02-user-menu-open.png`, `03-logout-success-login-page.png`, `04-login-success.png`

---

### 2. Dashboard Page (`/dashboard`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1 | Page load | Navigate to `/dashboard` | Page loads with header "Dashboard" |
| 2.2 | KPI Cards | Check stats cards | Display: Total Calls, Avg Duration, Avg Response Time, Success Rate |
| 2.3 | Call Volume chart | Check left chart | Bar chart showing calls over last 7 days |
| 2.4 | Sentiment Distribution | Check right chart | Pie/donut chart showing sentiment breakdown |
| 2.5 | Recent Calls table | Check table at bottom | Shows recent calls with Agent, From, To, Status, Started, Duration |
| 2.6 | View All Calls link | Click "View All Calls" | Navigate to `/calls` |

**Evidence:** `01-dashboard-loaded.png`

---

### 3. Analytics Page (`/analytics`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1 | Page load | Navigate to `/analytics` | Page loads with header "Analytics" |
| 3.2 | Latency by Agent | Check first chart | Bar chart showing average latency per agent |
| 3.3 | Token Usage Trends | Check second chart | Line/bar chart with LLM Tokens and TTS Characters |
| 3.4 | Performance Insights | Check text section | Informational text about metrics |

**Evidence:** `05-analytics-page.png`

---

### 4. Calls List Page (`/calls`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1 | Page load | Navigate to `/calls` | Page loads with header "Calls" |
| 4.2 | Stats cards | Check top cards | Total Calls, Avg Duration, Avg Latency, Success Rate |
| 4.3 | Search filter | Locate search box | Text input with placeholder "Call ID, phone..." |
| 4.4 | Status filter | Click Status dropdown | Options: All statuses, Started, Ongoing, Ended, Failed |
| 4.5 | Agent filter | Click Agent dropdown | Shows list of agents |
| 4.6 | Apply filters | Select "Ended" status, click Apply | Table filters to show only ended calls |
| 4.7 | Clear filters | Click clear button (X) | Filters reset |
| 4.8 | Calls table | Check table columns | Call ID, Date/Time, Duration, From, To, Agent, Status, Messages |
| 4.9 | Pagination | Check pagination controls | Previous/Next buttons, page indicator |
| 4.10 | View call detail | Click arrow button on row | Navigate to `/calls/[call_id]` |

**Evidence:** `06-calls-page.png`

---

### 5. Call Detail Page (`/calls/[call_id]`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1 | Page load | Click on a call from list | Page loads with call details |
| 5.2 | Header | Check header area | Call ID, Download Recording button, status badge |
| 5.3 | Info cards | Check top cards | From Number, To Number, Duration, Messages |
| 5.4 | Tab navigation | Check tabs | Timeline, Metrics, Analysis, Transcript tabs |

#### Timeline Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.5 | Timeline display | Click Timeline tab | Chronological list of events |
| 5.6 | Event types | Check event badges | Message, Transcript, Transition, RAG Retrieval, Variable Extraction |
| 5.7 | Event details | Check event content | Timestamps, speaker labels, content |

**Evidence:** `07-call-detail-timeline.png`

#### Metrics Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.8 | Metrics display | Click Metrics tab | Performance metrics view |
| 5.9 | Primary metrics cards | Check top cards | User→Bot Latency, STT Processing, LLM Processing, TTS TTFB |
| 5.10 | Cost tracking cards | Check middle cards | Total Turns, LLM Tokens, TTS Characters, Pipeline Total |
| 5.11 | Latency table | Check detailed table | Min/Average/Max breakdown for all metrics |
| 5.12 | Resource chart | Check bottom chart | Bar chart comparing LLM Tokens vs TTS Characters |

**Evidence:** `08-call-detail-metrics.png`

#### Analysis Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.13 | Analysis display | Click Analysis tab | AI analysis view |
| 5.14 | Sentiment Analysis | Check sentiment card | Sentiment label (Positive/Negative/Neutral) with score |
| 5.15 | Call Summary | Check summary card | AI-generated summary text |
| 5.16 | Key Topics | Check topics card | Topic tags |
| 5.17 | Keywords | Check keywords card | Keyword tags |
| 5.18 | Action Items | Check action items | List of follow-up actions (or "No action items") |

**Evidence:** `09-call-detail-analysis.png`

#### Transcript Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.19 | Transcript display | Click Transcript tab | Full conversation view |
| 5.20 | Entry count | Check header | Shows "X transcript entries" |
| 5.21 | Export button | Check export | "Export Transcript" button present |
| 5.22 | Message display | Check messages | Speaker labels (Assistant/User), timestamps, message content |
| 5.23 | About section | Check footer | Explanation about transcript generation |

**Evidence:** `10-call-detail-transcript.png`

---

### 6. Agents List Page (`/agents`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1 | Page load | Navigate to `/agents` | Page loads with header "Agents" |
| 6.2 | New Agent button | Check header | "New Agent" button present |
| 6.3 | Agent cards | Check agent display | Cards showing name, status, version, description, call count, updated date |
| 6.4 | Edit button | Check card actions | Edit (pencil) icon |
| 6.5 | Delete button | Check card actions | Delete (trash) icon |

**Evidence:** `11-agents-list.png`

#### Create Agent Dialog
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.6 | Open dialog | Click "New Agent" | Dialog opens |
| 6.7 | Agent Name field | Check form | Required text input |
| 6.8 | Description field | Check form | Optional textarea with character count |
| 6.9 | Cancel button | Click Cancel | Dialog closes |
| 6.10 | Create button | Check form | "Create Agent" button |

**Evidence:** `12-create-agent-dialog.png`

---

### 7. Agent Detail Page (`/agents/[id]`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.1 | Page load | Click on agent card | Page loads with agent details |
| 7.2 | Header | Check header | Agent name, Active badge, description, Delete Agent button |
| 7.3 | Stats cards | Check cards | Active Version, Total Calls, Phone Mappings, Last Updated |
| 7.4 | Tab navigation | Check tabs | Overview, Workflow Editor, Versions, Settings |

**Evidence:** `13-agent-detail-overview.png`

#### Overview Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.5 | Mapped Phone Numbers | Check phone section | List of phone numbers linked to agent |
| 7.6 | Agent Information | Check info card | Agent ID, Name, Description, Tenant ID |
| 7.7 | Active Configuration | Check config card | Version, Created By, Created At, Notes |
| 7.8 | Workflow Summary | Check workflow card | Initial Node, Total Nodes, Edit Workflow button |
| 7.9 | LLM Configuration | Check LLM card | Enabled status, Model, Temperature, Max Tokens |
| 7.10 | TTS Configuration | Check TTS card | Reference to shared voice configs |
| 7.11 | STT Configuration | Check STT card | Reference to environment variables |
| 7.12 | RAG Configuration | Check RAG card | Enabled status, linked config |
| 7.13 | Auto Hangup | Check hangup card | Enabled/Disabled status |

#### Workflow Editor Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.14 | Canvas display | Click Workflow Editor tab | React Flow canvas with nodes |
| 7.15 | Node Palette | Check left panel | Standard Node, Extract Variables, End Call options |
| 7.16 | Toolbar | Check top toolbar | Auto Layout, Validate, Shortcuts, Save Workflow buttons |
| 7.17 | Nodes on canvas | Check canvas | Workflow nodes (Standard, End Call, Extract Variable types) |
| 7.18 | Connections | Check edges | Lines connecting nodes with transition labels |
| 7.19 | Properties panel | Check right panel | "Select a node to view and edit its properties" |
| 7.20 | Zoom controls | Check bottom right | Zoom in/out, fit view, toggle interactivity |
| 7.21 | Mini map | Check bottom right | Small overview of workflow |
| 7.22 | Node/connection count | Check status | "X nodes, Y connections" |

**Evidence:** `14-agent-workflow-editor.png`

#### Versions Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.23 | Version list | Click Versions tab | Table of version history |
| 7.24 | Version columns | Check table | Version, Created By, Created At, Notes, Actions |
| 7.25 | Active indicator | Check v1 row | Green checkmark indicating active version |
| 7.26 | Actions menu | Click menu button | Options to activate/view version |

**Evidence:** `15-agent-versions.png`

#### Settings Tab
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.27 | Settings form | Click Settings tab | Editable configuration form |
| 7.28 | Save button | Check top right | "Save Settings" button |
| 7.29 | Global Prompt | Check first section | Textarea with system prompt |
| 7.30 | LLM Configuration | Check form | Enable toggle, Model dropdown, Service Tier, Temperature, Max Tokens |
| 7.31 | Voice/TTS Config | Check form | Enable toggle, Voice Configuration dropdown |
| 7.32 | RAG Configuration | Check form | Enable toggle |
| 7.33 | Auto Hangup | Check form | Enable toggle |
| 7.34 | Phone Numbers | Check read-only section | List of mapped phone numbers |

**Evidence:** `16-agent-settings.png`

---

### 8. Settings Pages

#### Main Settings Page (`/settings`)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.1 | Page load | Navigate to `/settings` | Page with three config cards |
| 8.2 | RAG card | Check first card | "RAG Configurations" with description |
| 8.3 | Voice card | Check second card | "Voice Configurations" with description |
| 8.4 | Phone card | Check third card | "Phone Numbers" with description |

**Evidence:** `17-settings-main.png`

#### RAG Configurations (`/settings/rag`)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.5 | Page load | Click RAG card | RAG configurations list |
| 8.6 | Config cards | Check display | Cards with name, description, settings preview |
| 8.7 | Settings preview | Check badges | Search mode, Top K, Vector weight, version count |
| 8.8 | New button | Check header | "New Configuration" button |
| 8.9 | Back button | Check navigation | Back arrow to settings |

**Evidence:** `18-settings-rag.png`

#### Voice Configurations (`/settings/voice`)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.10 | Page load | Navigate to `/settings/voice` | Voice configurations list |
| 8.11 | Config cards | Check display | Cards with name, description, settings preview |
| 8.12 | Settings preview | Check badges | Model, Stability percentage, version count |
| 8.13 | New button | Check header | "New Configuration" button |

**Evidence:** `19-settings-voice.png`

#### Phone Numbers (`/settings/phone`)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.14 | Page load | Navigate to `/settings/phone` | Phone number list |
| 8.15 | Phone cards | Check display | Cards with phone number, name |
| 8.16 | Agent mapping | Check badge | Shows mapped agent name or "Unmapped" |
| 8.17 | Add button | Check header | "Add Phone Number" button |

**Evidence:** `20-settings-phone.png`

---

### 9. Theme Toggle

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 9.1 | Theme button | Locate in header | Sun/moon icon button |
| 9.2 | Theme menu | Click theme button | Dropdown with Light, Dark, System options |
| 9.3 | Dark mode | Select "Dark" | UI switches to dark theme |
| 9.4 | Light mode | Select "Light" | UI switches to light theme |
| 9.5 | System mode | Select "System" | UI follows system preference |

**Evidence:** `21-dark-mode.png`

---

### 10. Navigation

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 10.1 | Sidebar links | Check sidebar | Dashboard, Calls, Analytics, Agents, Settings |
| 10.2 | Active state | Navigate to each page | Active page highlighted in sidebar |
| 10.3 | Logo link | Click "Stellar Echo" logo | Navigate to dashboard |
| 10.4 | Back navigation | Use back buttons | Navigate to parent page |
| 10.5 | Breadcrumb links | Click breadcrumb links | Navigate to linked page |

---

## Retest Instructions

### Quick Smoke Test (5-10 minutes)

1. **Login:** Go to `/login`, login with test credentials
2. **Dashboard:** Verify KPI cards and charts load
3. **Calls:** Navigate to `/calls`, verify list loads, click into one call
4. **Call Detail:** Check all 4 tabs (Timeline, Metrics, Analysis, Transcript)
5. **Agents:** Navigate to `/agents`, verify list loads, click into one agent
6. **Agent Detail:** Check all 4 tabs (Overview, Workflow Editor, Versions, Settings)
7. **Settings:** Navigate to `/settings`, check RAG, Voice, Phone pages
8. **Theme:** Toggle between light and dark mode
9. **Logout:** Click logout, verify redirect to login

### Full Regression Test (30-45 minutes)

Follow all test cases in this document systematically.

### Automated Retest with Playwright

Run from project root:
```bash
# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui
```

---

## Known Data Dependencies

For accurate testing, ensure the database contains:
- At least 1 user (admin@example.com)
- At least 1 agent with workflow configuration
- At least 1 call with metrics and analysis
- At least 1 RAG configuration
- At least 1 Voice configuration
- At least 1-3 phone numbers (some mapped, some unmapped)

---

## API Endpoints to Verify

If API changes are made, verify these endpoints still work:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/dashboard/call-volume` | GET | Dashboard chart data |
| `/api/dashboard/sentiment-distribution` | GET | Dashboard chart data |
| `/api/calls` | GET | Calls list with filters |
| `/api/calls/[id]` | GET | Call detail |
| `/api/calls/[id]/timeline` | GET | Call timeline events |
| `/api/calls/[id]/metrics` | GET | Call metrics |
| `/api/calls/[id]/analysis` | GET | Call AI analysis |
| `/api/calls/[id]/transcript` | GET | Call transcript |
| `/api/agents` | GET/POST | Agents list, create |
| `/api/agents/[id]` | GET/PUT/DELETE | Agent detail, update, delete |
| `/api/agents/[id]/versions` | GET/POST | Agent versions |
| `/api/rag-configs` | GET/POST | RAG configurations |
| `/api/voice-configs` | GET/POST | Voice configurations |
| `/api/phone-configs` | GET/POST | Phone configurations |

---

## Troubleshooting

### Common Issues

1. **Login fails:** Run `pnpm db:seed` to create test user
2. **No data showing:** Check database connection with `pnpm db:test`
3. **Charts not loading:** Check browser console for API errors
4. **Theme not persisting:** Clear localStorage and try again

### Resetting Test Data

```bash
# Reset user password
pnpm db:reset-password

# Re-seed database
pnpm db:seed
```

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| Nov 25, 2025 | 1.0.1 | Comprehensive UI test - ALL TESTS PASSED |
| Nov 22, 2025 | 1.0.0 | Initial baseline documentation |

---

## Test Results - November 25, 2025

### Summary
**Result: ALL TESTS PASSED**

All 10 test sections were verified using Playwright MCP automated browser testing.

### Detailed Results

| Section | Status | Notes |
|---------|--------|-------|
| 1. Authentication Flow | PASS | Login, logout, user menu, protected routes all working |
| 2. Dashboard Page | PASS | KPI cards (34 calls, 0:23 avg duration, 1.60s latency, 97.1% success), charts, recent calls table |
| 3. Analytics Page | PASS | Latency by Agent chart, Token Usage Trends chart, Performance Insights |
| 4. Calls List Page | PASS | Stats cards, filters (status/agent), pagination (34 calls, 2 pages), table columns |
| 5. Call Detail Page | PASS | All 4 tabs working (Timeline, Metrics, Analysis, Transcript) |
| 6. Agents List Page | PASS | 3 agents displayed, New Agent dialog functional |
| 7. Agent Detail Page | PASS | All 5 tabs working (Overview, Workflow Editor, Versions, Settings, RAG Query) |
| 8. Settings Pages | PASS | Main settings, RAG configs, Voice catalog (5 voices), Phone numbers (3 mapped) |
| 9. Theme Toggle | PASS | Light/Dark/System modes working correctly |
| 10. Navigation | PASS | Sidebar links, active states, back navigation |

### Test Evidence
Screenshots saved to `.playwright-mcp/`:
- `dark-mode-test.png` - Dark theme verification
- `light-mode-test.png` - Light theme verification

### Environment
- Browser: Chromium (Playwright)
- Dev Server: localhost:3000
- Test User: admin@example.com
