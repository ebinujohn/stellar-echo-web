# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Development Workflow

**ALWAYS follow this workflow:**

1. **Check Documentation First** - Before implementing features, check docs via context7 MCP
2. **Use TodoWrite for Task Planning** - Multi-step tasks → Create todo list BEFORE coding
3. **Clarify Requirements** - Use `AskUserQuestion` tool when requirements are ambiguous
4. **Never Auto-Commit** - DO NOT AUTO COMMIT unless explicitly asked
5. **Run Quality Checks After Code Changes** - ALWAYS run quality tools after modifying code:
   ```bash
   pnpm lint          # Check for linting errors
   pnpm type-check    # Verify TypeScript types
   pnpm security      # Run Semgrep security scan
   ```
   Fix any errors before considering the task complete.

## Project Overview

**Stellar Echo** - Next.js 16 web application for managing voice AI agent calls and analytics. Built with React 19, TypeScript, Tailwind CSS v4, PostgreSQL, and Drizzle ORM.

## Quick Reference

### Development Commands

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm db:test          # Test database connection
pnpm db:seed          # Create test user (admin@example.com / password123)
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript checking
pnpm format           # Run Prettier
pnpm security         # Run Semgrep security scan
pnpm test             # Run Vitest tests
pnpm test:e2e         # Run Playwright E2E tests
```

### Docker Deployment

```bash
# Build image
docker build -t stellar-echo-web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn> \
  .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=postgres \
  -e DB_NAME=stellar_echo \
  -e JWT_SECRET=your-secret \
  stellar-echo-web
```

Health check endpoint: `GET /api/health` (used by container orchestration)

### Code Quality Tools

| Tool | Purpose | Config File |
|------|---------|-------------|
| ESLint v9 | Linting (Next.js + TypeScript) | `eslint.config.mjs` |
| Prettier v3 | Code formatting | `prettier-plugin-tailwindcss` |
| TypeScript | Type checking | `tsconfig.json` |
| Semgrep | Static security analysis | `.semgrepconfig.yml` |

**Semgrep** checks for:
- OWASP Top 10 vulnerabilities (SQL injection, XSS, secrets)
- Missing authentication in API routes
- Insecure cookie settings
- Dangerous patterns (eval, document.write)

### Environment Variables

Required in `.env.local`:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL
- `JWT_SECRET` - JWT signing key
- `NEXT_PUBLIC_API_URL` - API base URL
- `LOG_LEVEL` - Logging level (trace/debug/info/warn/error/fatal/silent). Default: 'info' in dev, 'warn' in prod
- `NODE_ENV` - development/production
- Optional: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - S3 for recordings
- Optional: `ADMIN_API_BASE_URL`, `ADMIN_API_KEY` - Orchestrator cache management
- Optional: `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN
- Optional: `NEXT_PUBLIC_SENTRY_ENABLED`, `SENTRY_ENABLED` - Enable Sentry in development

## Architecture

### Authentication & Authorization
- **JWT-based auth** with HTTP-only cookies (15min access, 7-day refresh tokens)
- **Middleware** at `src/middleware.ts` validates tokens, injects headers (`x-user-id`, `x-tenant-id`, `x-user-role`)
- **Session helpers** in `src/lib/auth/session.ts`: `requireAuth()`, `requireRole()`
- **Multi-tenant isolation** enforced at database query level using `tenantId`

### Database (Drizzle ORM)
- **Schema**: `src/lib/db/schema/` - tenants, users, agents, calls, rag-configs, voice-configs, phone-configs
- **Queries**: `src/lib/db/queries/` - reusable query functions with tenant isolation
- **JSONB fields**: `call_metrics_summary.metrics_data` (per-turn latency), `call_transcripts.transcript_data`

### API Routes
- **Structure**: `src/app/api/[resource]/route.ts`
- **Error handling**: Use `handleApiError()` from `src/lib/api/error-handler.ts`
- **Handlers**: Use `handleGet()`, `handleGetById()` from `src/lib/api/handlers.ts`
- **Validation**: Zod schemas in `src/lib/validations/`

### React Hooks (TanStack Query)
- **Location**: `src/lib/hooks/`
- **Constants**: `src/lib/hooks/constants/` - centralized stale times and query keys
- **Factories**: `src/lib/hooks/factories/` - generic CRUD and version hook factories

### Components
- **Feature components**: `src/components/[feature]/` (calls, dashboard, analytics, agents, settings)
- **UI primitives**: `src/components/ui/` (shadcn/ui)
- **Layout**: `src/components/layout/` (sidebar, navbar)
- **Providers**: `src/components/providers/` (theme, query, sentry)

### Error Tracking (Sentry)
- **Config files**: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- **Instrumentation**: `src/instrumentation.ts` - Loads server/edge SDK
- **Client provider**: `src/components/providers/sentry-provider.tsx` - Browser initialization
- **Error boundaries**: `src/app/global-error.tsx`, `src/app/(dashboard)/dashboard/error.tsx`
- **Tunnel route**: `/monitoring-tunnel` - Bypasses ad blockers (excluded from auth in middleware)
- **Features**: Error tracking, Session Replay, Feedback Widget, Performance Monitoring

## Key Patterns

### API Route Pattern (Simplified)

```typescript
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { handleGet } from '@/lib/api/handlers';

// GET - use handler for simple list queries
export const GET = () => handleGet(getResourceList);

// POST - use error handler in catch block
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const data = schema.parse(await request.json());
    const result = await createResource(data, session.tenantId);
    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error, { resourceName: 'Resource', fieldName: 'name' });
  }
}
```

### Multi-tenant Data Isolation

ALL database queries MUST include tenant filtering:

```typescript
const session = await requireAuth();
const data = await db.query.resource.findMany({
  where: eq(resource.tenantId, session.tenantId),
});
```

### TanStack Query Hook Pattern

**Prefer factory pattern** - see Hook Factories section. For custom hooks:

```typescript
import { apiFetch } from '@/lib/hooks/factories/create-api-hooks';
import { STALE_TIMES, QUERY_KEYS } from '@/lib/hooks/constants';

export function useResource(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.resource.detail(id),
    queryFn: () => apiFetch<Resource>(`/api/resource/${id}`),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!id,
  });
}
```

### Batch Query Pattern (Avoid N+1)

```typescript
// BAD: N+1 queries
const items = await Promise.all(
  configs.map(async (config) => {
    const version = await getActiveVersion(config.id); // N queries
    return { ...config, version };
  })
);

// GOOD: Batch queries
const configIds = configs.map((c) => c.id);
const versions = await db.query.versions.findMany({
  where: inArray(versions.configId, configIds),
});
const versionMap = new Map(versions.map((v) => [v.configId, v]));
return configs.map((c) => ({ ...c, version: versionMap.get(c.id) }));
```

## Utilities

### API Error Handler (`src/lib/api/error-handler.ts`)
- `handleApiError(error, options)` - Handles auth, Zod, unique constraint, not found errors
- `successResponse(data, status)` - Creates standard success response

### API Handlers (`src/lib/api/handlers.ts`)
- `handleGet(queryFn)` - Generic GET handler for list and dropdown endpoints
- `handleGetById(id, queryFn, resourceName)` - GET handler for detail endpoints

### Query Constants (`src/lib/hooks/constants/`)
- `STALE_TIMES` - Centralized stale time configuration
- `QUERY_KEYS` - Type-safe query key factory

### Hook Factories (`src/lib/hooks/factories/create-api-hooks.ts`)
- `createCrudHooks<TList, TDetail>()` - Creates useList, useDetail, useCreate, useUpdate, useDelete
- `createVersionHooks<TVersion, TIdKey>()` - Creates useVersions, useActivateVersion with typed ID keys
- `createDropdownHook<T>()` - Creates dropdown query hooks
- `apiFetch<T>()` / `apiMutate<T>()` - Generic typed fetch wrappers

**Using Factories (preferred pattern):**
```typescript
// Create typed hooks using factories
const resourceCrud = createCrudHooks<Resource[], ResourceDetail>({
  endpoint: '/api/resources',
  listKey: QUERY_KEYS.resources.all,
  detailKey: QUERY_KEYS.resources.detail,
  listStaleTime: STALE_TIMES.CONFIG_LIST,
  detailStaleTime: STALE_TIMES.DETAIL,
});

// For versioned resources, specify the ID key name
const resourceVersions = createVersionHooks<ResourceVersion, 'resourceId'>({
  endpoint: '/api/resources',
  versionsKey: QUERY_KEYS.resources.versions,
  detailKey: QUERY_KEYS.resources.detail,
  listKey: QUERY_KEYS.resources.all,
  staleTime: STALE_TIMES.DETAIL,
  idKey: 'resourceId',
});

// Export hooks with standard naming
export const useResources = resourceCrud.useList;
export const useResource = resourceCrud.useDetail;
export const useCreateResource = resourceCrud.useCreate;
export const useUpdateResource = resourceCrud.useUpdate;
export const useDeleteResource = resourceCrud.useDelete;
export const useResourceVersions = resourceVersions.useVersions;
export const useActivateResourceVersion = resourceVersions.useActivateVersion;
```

### Formatters (`src/lib/utils/formatters.ts`)
- `formatDateTime()`, `formatDuration()`, `formatLatency()`, `formatPhoneNumber()`
- `formatPercentage()`, `formatNumber()`, `getStatusVariant()`, `getStatusColor()`

### HMAC Signing (`src/lib/external-apis/hmac-signing.ts`)
- `generateNonce()` - Cryptographically secure random nonce (URL-safe, 32 chars)
- `computeSignature()` - HMAC-SHA256 signature for API authentication
- `generateSignedHeaders()` - Generate X-Timestamp, X-Nonce, X-Signature headers

### S3 Presigned URLs (`src/lib/s3/presigned-url.ts`)
- `generatePresignedDownloadUrl()` - Secure temporary download URLs
- `isValidS3Url()` - Validate S3 URL format

## Database Schema Quick Reference

### Core Tables
- `tenants` - Organizations (multi-tenancy root)
- `users` - User accounts
- `agents` + `agent_config_versions` - Versioned agent configurations

### Call Tables
- `calls` - Call metadata
- `call_messages` - Conversation messages
- `call_transitions` - Workflow state transitions
- `call_transcripts` - Full transcripts (JSONB)
- `call_metrics_summary` - 34 latency metrics columns
- `call_analysis` - AI-powered insights

### Config Tables
- `rag_configs` + `rag_config_versions` - RAG settings (versioned)
- `voice_configs` - Voice catalog (simple, no versioning)
- `phone_configs` + `phone_config_mappings` - Phone number pool

## Latency Metrics

The Metrics tab displays per-turn latency components:
- **Primary**: User→Bot Latency, LLM Processing, LLM TTFB, TTS TTFB
- **Processing**: STT Processing, Pipeline Total
- **Optional**: RAG Processing, Variable Extraction

All metrics show min/avg/max values with interruption indicators.

## Common Issues

### "Unauthorized" errors
- Check `access_token` cookie
- Verify `JWT_SECRET` matches
- Ensure middleware isn't blocking routes

### Database connection failures
- Run `pnpm db:test`
- Verify PostgreSQL is running
- Check `.env.local` credentials

### Type errors after schema changes
- `rm -rf .next && pnpm build`
- `pnpm db:generate`
- `pnpm type-check`
- Use Context7 MCP for any library documentation. Use Playwright MCP for UI & UX testing and checking.