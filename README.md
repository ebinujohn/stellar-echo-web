# Call Analytics Web Application

A modern, production-ready web application for managing voice AI agent calls and configurations.

## Tech Stack

- **Frontend/Backend**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with HTTP-only cookies
- **Data Fetching**: TanStack Query v5
- **Validation**: Zod v3
- **Charts**: Recharts v2 (prepared for implementation)

## Prerequisites

- Node.js 20+ or Bun
- PostgreSQL database (existing database with schema)
- npm, pnpm, or bun package manager

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and update with your database credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=orchestrator
DB_PASSWORD=your_actual_password_here
DB_NAME=orchestrator

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# App
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Test Database Connection

```bash
npm run db:test
```

You should see a successful connection message with your database tables listed.

### 4. Create Test User (First Time Setup)

```bash
npm run db:seed
# Creates admin@example.com / password123
```

Or reset an existing user's password:

```bash
npm run db:reset-password
# Resets admin@example.com password to password123
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and login with:
- **Email**: admin@example.com
- **Password**: password123

## Features Implemented

### ✅ Phase 1 - Complete Call Analytics Dashboard

#### 1. **Authentication System**
- JWT-based auth with HTTP-only cookies
- Login page with form validation
- Role-based access control (admin/viewer)
- Tenant isolation at database level
- Protected routes with middleware
- Session management

#### 2. **Dashboard Layout**
- Responsive sidebar navigation with active states
- Top navbar with user menu
- Dark mode support (Light/Dark/System)
- Theme toggle component
- User profile dropdown with logout
- Mobile-responsive design

#### 3. **Call List Page** (`/calls`)
- ✅ Real-time KPI cards (Total Calls, Avg Duration, Avg Latency, Success Rate)
- ✅ Advanced filtering (Search, Status, Agent)
- ✅ Paginated table with 20 items per page
- ✅ Sortable columns
- ✅ Click to view call details
- ✅ Real-time data from database

#### 4. **Call Detail Page** (`/calls/[call_id]`)
Complete tabbed interface with 4 tabs:

**Timeline Tab**:
- ✅ Unified chronological view of all events
- ✅ Messages, transitions, and transcripts merged
- ✅ Visual timeline with icons and color coding
- ✅ Shows latency, tokens, and confidence scores
- ✅ Real-time data

**Metrics Tab**:
- ✅ KPI cards: Avg TTFB, Pipeline Time, LLM Tokens, TTS Characters
- ✅ Performance metrics from database
- ✅ Placeholder for future charts (Recharts)

**Analysis Tab**:
- ✅ Sentiment analysis with score visualization
- ✅ AI-generated call summary
- ✅ Keywords extraction
- ✅ Topics discussed
- ✅ Visual sentiment indicators

**Transcript Tab**:
- ✅ Full conversation transcript
- ✅ Speaker identification (User/Agent icons)
- ✅ Confidence scores per entry
- ✅ Export to TXT functionality
- ✅ Formatted timestamps

#### 5. **Dashboard Page** (`/dashboard`)
- ✅ Real-time KPI statistics
- ✅ Total Calls, Avg Duration, Avg Latency, Success Rate
- ✅ Placeholder sections for charts
- ✅ Quick navigation to Calls page

#### 6. **Database Layer**
- ✅ Drizzle ORM fully configured
- ✅ Complete schema matching actual PostgreSQL database
- ✅ Query functions with tenant isolation
- ✅ Connection pooling
- ✅ Type-safe queries with Drizzle relations

#### 7. **API Routes**
Complete REST API:
- `/api/auth/login` - Authentication
- `/api/auth/logout` - Logout
- `/api/calls` - Paginated call list with filters
- `/api/calls/stats` - KPI statistics
- `/api/calls/[call_id]` - Call details
- `/api/calls/[call_id]/timeline` - Timeline events
- `/api/calls/[call_id]/metrics` - Performance metrics
- `/api/calls/[call_id]/analysis` - AI analysis
- `/api/calls/[call_id]/transcript` - Full transcript
- `/api/agents` - Agent list

#### 8. **Data Management**
- ✅ TanStack Query hooks for data fetching
- ✅ Automatic caching and revalidation
- ✅ Optimistic UI updates ready
- ✅ Error handling and loading states
- ✅ Zod validation on API inputs

#### 9. **Utility Functions**
Comprehensive formatters in `src/lib/utils/formatters.ts`:
- `formatDateTime` - Human-readable timestamps
- `formatDuration` - Call duration formatting
- `formatLatency` - Latency in ms/s
- `formatPhoneNumber` - E.164 phone formatting
- `formatPercentage` - Success rates
- `getStatusVariant` - Badge color mapping

## Project Structure

```
src/
├── app/                                # Next.js App Router
│   ├── (auth)/                         # Auth routes (login)
│   │   └── login/
│   ├── (dashboard)/                    # Protected dashboard routes
│   │   ├── dashboard/                  # Main dashboard
│   │   ├── calls/                      # Calls list & detail
│   │   │   └── [call_id]/             # Dynamic call detail page
│   │   ├── analytics/                  # Analytics & charts
│   │   └── agents/                     # Agent management
│   ├── api/                            # API routes
│   │   ├── auth/                       # Authentication
│   │   ├── calls/                      # Call endpoints
│   │   │   ├── [call_id]/             # Call detail endpoints
│   │   │   │   ├── timeline/
│   │   │   │   ├── metrics/
│   │   │   │   ├── analysis/
│   │   │   │   └── transcript/
│   │   │   └── stats/
│   │   └── agents/
│   ├── layout.tsx                      # Root layout with providers
│   └── page.tsx                        # Home page (redirects)
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── auth/                           # Login form
│   ├── layout/                         # Layout components
│   │   ├── sidebar.tsx                 # Navigation sidebar
│   │   ├── navbar.tsx                  # Top navbar
│   │   ├── user-menu.tsx              # User dropdown
│   │   └── theme-toggle.tsx           # Dark mode toggle
│   ├── calls/                          # Call components
│   │   ├── call-stats-cards.tsx       # KPI cards
│   │   ├── call-filters.tsx           # Filter controls
│   │   ├── call-list-table.tsx        # Paginated table
│   │   ├── calls-page-client.tsx      # Main calls page
│   │   ├── call-detail-client.tsx     # Call detail wrapper
│   │   ├── call-timeline.tsx          # Timeline tab
│   │   ├── call-metrics-tab.tsx       # Metrics tab
│   │   ├── call-analysis-tab.tsx      # Analysis tab
│   │   └── call-transcript-tab.tsx    # Transcript tab
│   ├── dashboard/                      # Dashboard components
│   │   └── dashboard-page-client.tsx
│   └── providers/                      # React context providers
├── lib/
│   ├── db/                             # Database layer
│   │   ├── schema/                     # Drizzle schema definitions
│   │   │   ├── index.ts
│   │   │   ├── calls.ts               # Call-related tables
│   │   │   ├── agents.ts              # Agent tables
│   │   │   ├── users.ts               # User tables
│   │   │   └── tenants.ts             # Tenant tables
│   │   ├── queries/                    # Database queries
│   │   │   ├── calls.ts               # Call list queries
│   │   │   └── call-details.ts        # Call detail queries
│   │   ├── index.ts                    # DB connection
│   │   ├── seed-user.ts               # User seeding
│   │   └── reset-password.ts          # Password reset
│   ├── auth/                           # Authentication
│   │   ├── jwt.ts                      # JWT utilities
│   │   └── session.ts                  # Session management
│   ├── hooks/                          # TanStack Query hooks
│   │   ├── use-calls.ts               # Call list hooks
│   │   └── use-call-detail.ts         # Call detail hooks
│   ├── validations/                    # Zod schemas
│   │   └── auth.ts
│   └── utils/
│       └── formatters.ts               # Formatting utilities
├── types/                              # TypeScript types
│   └── index.ts
└── middleware.ts                       # Auth middleware

scripts/
└── inspect-schema.ts                   # Database schema inspection
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:test          # Test database connection
npm run db:seed          # Create test user
npm run db:reset-password # Reset user password
npm run db:generate      # Generate migrations
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
```

## Database Schema

The app connects to an existing PostgreSQL database. Key tables:

### Core Tables
- `tenants` - Multi-tenant organizations
- `users` - User accounts (authentication)
- `agents` - Agent definitions
- `agent_config_versions` - Versioned configurations

### Call Tables
- `calls` - Call metadata (status, duration, etc.)
- `call_messages` - Conversation messages
  - Fields: `id`, `call_id`, `sequence`, `timestamp`, `role`, `content`, `node_id`, `turn_number`, `was_interrupted`
- `call_transitions` - Workflow state changes
  - Fields: `id`, `call_id`, `sequence`, `timestamp`, `from_node_id`, `from_node_name`, `to_node_id`, `to_node_name`, `reason`, `condition`, `turn_number`
- `call_transcripts` - Full transcripts
  - Fields: `id`, `call_id`, `created_at`, `transcript_text`, `transcript_data` (jsonb)
- `call_metrics_summary` - Performance metrics
  - 34 columns including: `avg_llm_ttfb_ms`, `avg_pipeline_total_ms`, `total_llm_tokens`, `total_tts_characters`, etc.
- `call_analysis` - AI insights
  - Fields: `id`, `call_id`, `sentiment`, `sentiment_score`, `summary`, `call_successful`, `success_confidence`, `keywords_detected`, `topics_discussed`, `analysis_metadata`, `status`, `processing_time_ms`

See `src/lib/db/schema/` for complete schema definitions.

## Authentication Flow

1. User visits any protected route
2. Middleware checks for `access_token` cookie
3. If no token or invalid → Redirect to `/login`
4. User submits login form
5. API validates credentials with bcrypt
6. JWT tokens set as HTTP-only cookies (15-minute expiry)
7. User redirected to `/dashboard`
8. All subsequent requests authenticated via middleware
9. Tenant ID enforced on all database queries

## Data Flow

### Call List Page
1. Component mounts → `useCalls()` hook triggers
2. TanStack Query fetches from `/api/calls?page=1&pageSize=20`
3. API validates session with `requireAuth()`
4. Database query with tenant isolation
5. Data returned with pagination metadata
6. UI renders with loading/error states

### Call Detail Page
1. Component mounts with `call_id` param
2. Multiple hooks fetch in parallel:
   - `useCallDetail()` → Basic info
   - `useCallTimeline()` → Events
   - `useCallMetrics()` → Metrics
   - `useCallAnalysis()` → AI insights
   - `useCallTranscript()` → Transcript
3. Each tab shows data when available
4. Export functionality for transcript

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run db:test

# Check environment variables
cat .env.local

# Verify PostgreSQL is running
psql -U orchestrator -d orchestrator -h localhost
```

### Login Issues
```bash
# Create new user
npm run db:seed

# Reset existing user password
npm run db:reset-password

# Default credentials
# Email: admin@example.com
# Password: password123
```

### Schema Mismatch
If you encounter column errors, the database schema may have changed:

```bash
# Inspect actual database schema
npx tsx scripts/inspect-schema.ts

# Update schema in src/lib/db/schema/
# Rebuild application
npm run build
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Type check
npm run type-check
```

## Next Steps

### To Be Implemented

1. **Charts & Visualizations** (Recharts)
   - Call volume over time
   - Latency trends
   - Sentiment distribution
   - Token usage graphs

2. **Analytics Page**
   - Advanced filtering by date range
   - Agent comparison charts
   - Cost analysis
   - Performance trends

3. **Agents Page**
   - Agent configuration viewer
   - Version history
   - Performance by agent

4. **Testing**
   - Unit tests (Vitest)
   - Component tests (Testing Library)
   - E2E tests (Playwright)

5. **Docker**
   - Dockerfile for Next.js app
   - docker-compose.yml
   - Production optimization

## Contributing

This is a production application. Follow these guidelines:

- Write TypeScript with strict typing
- Use shadcn/ui for new components
- Follow existing code structure
- Add proper error handling
- Write tests for new features
- Use TanStack Query for data fetching
- Ensure tenant isolation on all queries

## License

Proprietary - All rights reserved
