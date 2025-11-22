# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Development Workflow

**ALWAYS follow this workflow - These instructions override any conflicting guidance:**

### 1. Check Documentation First

- **Before implementing ANY feature**, check docs via context7 MCP
- Use `mcp__context7__resolve-library-id` with "pipecat-ai" to get library ID
- Then `mcp__context7__get-library-docs` with the library ID and topic

### 2. Use TodoWrite for Task Planning

- Multi-step tasks → Create todo list BEFORE coding
- Track progress with status updates (pending → in_progress → completed)
- Mark tasks completed IMMEDIATELY after finishing (don't batch)
- One task in_progress at a time

### 3. Clarify Requirements When Uncertain

- Use `AskUserQuestion` tool when requirements are ambiguous
- Present 2-4 clear options for user to choose from
- Avoid making assumptions about user intent

### 4. Never Auto-Commit

- **DO NOT AUTO COMMIT CODE UNLESS EXPLICITLY ASKED TO**

## Project Overview

**Stellar Echo** - A production-ready Next.js 16 web application for managing voice AI agent calls and analytics. Built with React 19, TypeScript, Tailwind CSS v4, and PostgreSQL with Drizzle ORM. The application provides real-time call analytics, per-turn latency metrics, AI-powered analysis, and comprehensive dashboard views.

## Common Development Commands

### Development Server

```bash
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
```

### Database Operations

```bash
pnpm db:test          # Test database connection
pnpm db:seed          # Create test user (admin@example.com / password123)
pnpm db:reset-password # Reset user password to password123
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Run migrations
```

### Code Quality

```bash
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm type-check       # TypeScript type checking (tsc --noEmit)
```

### Testing

```bash
pnpm test             # Run Vitest unit tests
pnpm test:ui          # Run Vitest with UI
pnpm test:e2e         # Run Playwright E2E tests
pnpm test:e2e:ui      # Run Playwright with UI
```

## Architecture

### Authentication & Authorization

- **JWT-based authentication** with HTTP-only cookies (15-minute access tokens, 7-day refresh tokens)
- **Middleware protection** at `src/middleware.ts` - validates tokens and injects user headers (`x-user-id`, `x-tenant-id`, `x-user-role`, `x-user-email`)
- **Session management** via `src/lib/auth/session.ts` with `requireAuth()` and `requireRole()` helpers
- **Multi-tenant isolation** enforced at the database query level using `tenantId` from JWT payload
- All API routes use `requireAuth()` to validate sessions before processing requests

### Database Layer (Drizzle ORM)

- **Schema location**: `src/lib/db/schema/` with separate files for `tenants.ts`, `users.ts`, `agents.ts`, `calls.ts`, `rag-configs.ts`, `voice-configs.ts`, `phone-configs.ts`
- **Connection**: `src/lib/db/index.ts` manages PostgreSQL connection pooling (max 10 connections, 20s idle timeout)
- **Query functions**: `src/lib/db/queries/` contains reusable query logic with tenant isolation built-in
- **JSONB fields**: `call_metrics_summary.metrics_data` (per-turn metrics) and `call_transcripts.transcript_data` (conversation data) require special parsing
- **Relations**: Defined in schema files using Drizzle's relations API for type-safe joins
- **Environment**: Database credentials loaded from `.env.local` (see `.env.example`)

### Data Fetching (TanStack Query)

- **Custom hooks** in `src/lib/hooks/` wrap API calls with automatic caching, loading states, and error handling
- **Stale times**: 30s for calls list, 1min for stats, 5min for agents, 2min for detail pages
- **Query keys**: Structured as `['resource', params]` for automatic cache invalidation
- **Pattern**: Components use hooks like `useCalls()`, `useCallDetail()`, `useCallMetrics()` instead of direct fetch calls

### API Routes (Next.js App Router)

- **Structure**: `src/app/api/[resource]/route.ts` with dynamic segments for IDs
- **Auth enforcement**: All routes call `requireAuth()` or `requireRole()` before processing
- **Validation**: Zod schemas in `src/lib/validations/` validate request payloads
- **Error handling**: Consistent JSON error responses with appropriate HTTP status codes
- **Tenant isolation**: Database queries automatically filter by `session.tenantId`

### Component Organization

- **Page components**: Client components with `"use client"` directive in `src/app/(dashboard)/`
- **Feature components**: Domain-specific components in `src/components/[feature]/` (calls, dashboard, analytics, agents, settings)
  - Agent settings form: `src/components/agents/settings-form.tsx` - comprehensive global settings UI (LLM, TTS, STT, RAG, auto-hangup)
  - Agent detail tabs: Overview (with settings preview), Workflow Editor, Versions, Settings
  - Workflow editor: `src/components/agents/workflow-editor/` - visual node editor with per-node RAG overrides
    - Bidirectional sync between canvas edges and panel transitions (add/delete syncs both ways)
    - Target node dropdown showing available nodes with name and ID
  - Call detail page: `src/components/calls/call-detail-client.tsx` - displays call info with download recording button (when available)
  - RAG config management: `src/components/settings/rag/` - CRUD UI for shared RAG configurations
  - Voice config management: `src/components/settings/voice/` - CRUD UI for shared Voice/TTS configurations
  - Phone config management: `src/components/settings/phone/` - CRUD UI for phone number pool and agent mappings
- **Layout components**: Reusable layout pieces in `src/components/layout/` (sidebar, navbar, user-menu, theme-toggle)
- **UI primitives**: shadcn/ui components in `src/components/ui/`
- **Providers**: React context providers in `src/components/providers/`
- **Toast notifications**: Positioned at top-center via Sonner (configured in `src/app/layout.tsx`)

### Chart Infrastructure

- **Configuration**: `src/lib/charts/config.ts` provides theme-aware colors using CSS custom properties
- **Pattern**: All charts use centralized color palettes (`chartColors`, `sentimentColors`, `statusColors`)
- **Recharts integration**: Common config objects for margins, grids, axes, tooltips, and legends
- **Dark mode**: Charts automatically adapt to theme via `hsl(var(--chart-1))` color references

### TypeScript Patterns

- **Path alias**: `@/*` maps to `src/*` (configured in `tsconfig.json`)
- **Strict mode**: TypeScript strict checking enabled
- **Type exports**: Centralized types in `src/types/index.ts`
- **Database types**: Auto-generated from Drizzle schema via `typeof` inference
- **API types**: Define request/response shapes in type files, validate with Zod

## Key Technical Details

### Multi-tenant Data Isolation

ALL database queries MUST include tenant filtering. The pattern is:

```typescript
const session = await requireAuth();
const data = await db.query.calls.findMany({
  where: eq(calls.tenantId, session.tenantId),
  // ... other conditions
});
```

Never query across tenants. The middleware injects `tenantId` into headers, and `requireAuth()` extracts it from the JWT.

### JSONB Field Parsing

Two critical JSONB fields require special handling:

1. **`call_metrics_summary.metrics_data`** - Array of per-turn latency metrics:

```typescript
interface TurnMetrics {
  turnNumber: number;
  timestamp: string;
  pipelineTotalMs: number;
  llmProcessingMs: number;
  llmTtfbMs: number;
  sttDelayMs: number;
  transcriptLlmGapMs: number;
  llmToTtsGapMs: number;
  wasInterrupted: boolean;
}
```

2. **`call_transcripts.transcript_data`** - Supports multiple formats (array or nested object with `entries`/`messages`/`turns`). Parse defensively with fallbacks.

### Per-Turn Metrics Visualization

The Metrics tab on call detail pages shows 9 latency components:

- Primary: Pipeline Total, User→Bot Latency, LLM Processing, LLM TTFB
- Processing: STT Delay
- Gaps: Transcript→LLM Gap, LLM→TTS Gap
- Optional: RAG Processing, Variable Extraction

Display min/avg/max for each metric, and show interruptions with visual indicators.

### Agent Configuration Management

Agent configurations are stored as versioned JSONB documents in `agent_config_versions.config_json`:

**Configuration Structure:**
```typescript
{
  agent: { id, name, description, version },
  workflow: { initial_node, nodes, transitions, ... },
  llm: { enabled, model, temperature, max_tokens, service_tier },
  tts: { enabled, model, voice_id, stability, similarity_boost, style, ... },
  stt: { model, sample_rate, eager_eot_threshold, eot_threshold, ... },
  rag: { enabled, search_mode, top_k, relevance_filter, rrf_k, vector_weight, fts_weight, ... },
  auto_hangup: { enabled }
}
```

**Settings Management:**
- **Overview Tab**: Displays all global settings in read-only cards (LLM, TTS, STT, RAG, Auto-Hangup)
- **Settings Tab**: Full form for editing global settings with save button at top (creates new version)
  - RAG configuration: Select from shared RAG configs created in Settings → RAG Configurations
  - Voice configuration: Select from shared Voice configs created in Settings → Voice Configurations
  - No inline configuration editing - all RAG/Voice changes must be made in respective Settings pages
- **Workflow Tab**: Visual editor for workflow nodes and transitions
  - Per-node RAG overrides: Standard nodes can override global RAG settings (enabled, search_mode, top_k, weights)
  - Collapsible RAG section in node properties panel
- All changes create a new configuration version via `/api/agents/[id]/versions`
- Active version (`is_active=true`) is used for agent runtime behavior

### RAG Configuration Management

Shared RAG configurations are stored in database tables (`rag_configs`, `rag_config_versions`) and can be reused across multiple agents:

**Database Structure:**
- `rag_configs` - Base entity (id, tenant_id, name, description, is_active)
- `rag_config_versions` - Versioned settings (search_mode, top_k, relevance_filter, rrf_k, vector_weight, fts_weight, hnsw_ef_search, bedrock_model, bedrock_dimensions, faiss paths, sqlite_db_path)
- `agent_config_versions.rag_config_id` - References shared RAG config

**Settings Page (`/settings/rag`):**
- List all RAG configurations with active version preview
- Create new configs with all RAG parameters
- Edit configs with version history
- Activate specific versions

**Agent Integration:**
- Select from dropdown of available shared RAG configs in agent Settings tab
- Shows preview of active version settings when config is selected
- `ragEnabled` and `ragConfigId` stored on agent config version

### Voice Configuration Management

Shared Voice/TTS configurations are stored in database tables (`voice_configs`, `voice_config_versions`) and can be reused across multiple agents:

**Database Structure:**
- `voice_configs` - Base entity (id, tenant_id, name, description, is_active)
- `voice_config_versions` - Versioned settings (voice_id, model, stability, similarity_boost, style, use_speaker_boost, enable_ssml_parsing, pronunciation_dictionaries_enabled, pronunciation_dictionary_ids)
- `agent_config_versions.voice_config_id` - References shared Voice config

**Settings Page (`/settings/voice`):**
- List all Voice configurations with active version preview
- Create new configs with ElevenLabs TTS parameters
- Edit configs with version history
- Activate specific versions

**Agent Integration:**
- Select from dropdown of available shared Voice configs in agent Settings tab
- Shows preview of active version settings when config is selected
- `voiceConfigId` stored on agent config version

### Phone Configuration Management

Phone numbers are managed as a pool in database tables (`phone_configs`, `phone_config_mappings`) and can be mapped to agents for call routing:

**Database Structure:**
- `phone_configs` - Phone number pool (id, tenant_id, phone_number, name, description, is_active)
- `phone_config_mappings` - Links phone_config_id to agent_id for routing

**Settings Page (`/settings/phone`):**
- List all phone numbers with agent mapping badges
- Add new phone numbers in E.164 format (e.g., +17708304765)
- Edit phone details and agent mappings
- Delete phone numbers from pool

**Agent Integration:**
- Agent Settings tab displays read-only list of mapped phone numbers
- Phone mappings are managed from Settings → Phone Numbers page
- Used for call routing: incoming calls to a phone number route to the mapped agent

### Session & Cookie Management

- Access token expires in 15 minutes (short-lived for security)
- Refresh token lasts 1 day (for seamless re-authentication)
- Middleware automatically refreshes expired access tokens using valid refresh tokens
- Cookies are HTTP-only, secure in production, sameSite=lax
- Middleware validates on every request except `/login` and static assets

## Database Schema Reference

### Core Tables

- `tenants` - Organizations (multi-tenancy root)
- `users` - User accounts with bcrypt-hashed passwords
- `agents` - Agent definitions
- `agent_config_versions` - Versioned agent configurations (stores workflow, LLM, TTS, STT, RAG, auto-hangup settings in `config_json` JSONB field)

### Call Tables

- `calls` - Call metadata (status, duration, phone numbers, timestamps, recording_url for S3 recordings)
- `call_messages` - Conversation messages with role, content, turn_number, was_interrupted
- `call_transitions` - Workflow state transitions with from/to nodes and reasons
- `call_transcripts` - Full transcripts with transcript_text and transcript_data (JSONB)
- `call_metrics_summary` - 34 columns of performance metrics including per-turn data in metrics_data (JSONB)
- `call_analysis` - AI insights: sentiment, summary, keywords, topics, success analysis

## Environment Setup

Required environment variables in `.env.local`:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL connection
- `JWT_SECRET` - Secret key for JWT signing (change in production!)
- `NEXT_PUBLIC_API_URL` - API base URL
- `NODE_ENV` - development/production
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS S3 credentials for call recording downloads (optional)

Default test credentials: `admin@example.com` / `password123`

## Development Workflow

1. **Start development**: Ensure PostgreSQL is running, then `pnpm db:test` to verify connection
2. **First-time setup**: Run `pnpm db:seed` to create test user
3. **Schema changes**: Update `src/lib/db/schema/*.ts`, then `pnpm db:push` (or `db:generate` + `db:migrate` for migrations)
4. **Type safety**: Always run `pnpm type-check` before committing
5. **Code formatting**: Use `pnpm format` to auto-format with Prettier
6. **Testing**: Write unit tests in `*.test.ts` files, run with `pnpm test`

## Important Patterns

### API Route Pattern

```typescript
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    // Query with tenant isolation
    const data = await db.query.tableName.findMany({
      where: eq(tableName.tenantId, session.tenantId),
    });
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: "Message" }, { status: 500 });
  }
}
```

### TanStack Query Hook Pattern

```typescript
export function useResource(id: string) {
  return useQuery({
    queryKey: ["resource", id],
    queryFn: async () => {
      const response = await fetch(`/api/resource/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}
```

### Client Component Pattern

```typescript
"use client";
import { useResource } from '@/lib/hooks/use-resource';

export function ResourceComponent({ id }: { id: string }) {
  const { data, isLoading, error } = useResource(id);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <EmptyState />;

  return <div>{/* Render data */}</div>;
}
```

## Utility Functions

### Formatters (`src/lib/utils/formatters.ts`)

- `formatDateTime(date)` - Human-readable timestamps
- `formatDuration(seconds)` - Call duration (e.g., "2m 34s")
- `formatLatency(ms)` - Smart units (ms/s with appropriate precision)
- `formatPhoneNumber(e164)` - E.164 phone number formatting
- `formatPercentage(value)` - Success rates with % symbol
- `formatNumber(value)` - Numbers with comma separators
- `getStatusVariant(status)` - Badge color mapping
- `getStatusColor(status)` - Status color coding for charts

Always use these formatters for consistency across the UI.

### S3 Presigned URLs (`src/lib/s3/presigned-url.ts`)

- `generatePresignedDownloadUrl(s3Url, options)` - Generate secure temporary download URLs for S3 objects
- `isValidS3Url(url)` - Validate S3 URL format
- Supports multiple S3 URL formats: `s3://`, `https://bucket.s3.region.amazonaws.com/`, and `https://s3.region.amazonaws.com/bucket/`
- Default expiration: 1 hour (configurable from 60s to 7 days)
- Used by `/api/calls/[call_id]/recording/download` endpoint for secure call recording downloads

## Common Issues & Solutions

### "Unauthorized" errors

- Check that `access_token` cookie is present and valid
- Verify `JWT_SECRET` matches between token creation and validation
- Ensure middleware is not blocking protected routes incorrectly

### Database connection failures

- Run `pnpm db:test` to diagnose
- Verify PostgreSQL is running: `psql -U orchestrator -d orchestrator -h localhost`
- Check `.env.local` has correct credentials

### Type errors after schema changes

- Rebuild: `rm -rf .next && pnpm build`
- Regenerate types: `pnpm db:generate`
- Run `pnpm type-check` to identify issues

### Missing data in components

- Check browser network tab for API errors
- Verify TanStack Query cache with React DevTools Query tab
- Ensure tenant filtering is correct in database queries

### S3 recording download errors

- Verify AWS credentials are set in `.env.local` (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Check that recording URL in database is valid S3 format
- Ensure S3 bucket permissions allow GetObject with the configured IAM credentials
- Presigned URLs expire after 1 hour by default
