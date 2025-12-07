# Database Schema Changes for Google OAuth

This document describes the database schema changes required to implement Google Workspace sign-in with Better Auth.

## Overview

- Add new columns to `users` table
- Create 3 new tables for Better Auth: `sessions`, `accounts`, `verifications`

---

## 1. Modify `users` Table

### Add New Columns

```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN is_global_user BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN image VARCHAR(500);
```

### Make Columns Nullable

```sql
-- Allow Google-only users (no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Allow global users (no specific tenant)
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;
```

### Column Descriptions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `google_id` | VARCHAR(255) | YES | NULL | Google account ID (unique per user) |
| `is_global_user` | BOOLEAN | NO | false | Cross-tenant access flag for Google OAuth users |
| `email_verified` | BOOLEAN | NO | false | Required by Better Auth |
| `image` | VARCHAR(500) | YES | NULL | Profile picture URL from Google |

---

## 2. Create `sessions` Table (Better Auth)

Stores active user sessions.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_token_idx ON sessions(token);
```

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key (auto-generated) |
| `expires_at` | TIMESTAMP | NO | Session expiration time |
| `token` | TEXT | NO | Unique session token |
| `created_at` | TIMESTAMP | NO | Creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `ip_address` | TEXT | YES | Client IP address |
| `user_agent` | TEXT | YES | Client user agent |
| `user_id` | UUID | NO | Foreign key to users table |

---

## 3. Create `accounts` Table (Better Auth)

Links OAuth providers and credentials to users.

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX accounts_user_id_idx ON accounts(user_id);
CREATE INDEX accounts_provider_account_idx ON accounts(provider_id, account_id);
```

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key (auto-generated) |
| `account_id` | TEXT | NO | Provider's user ID (e.g., Google's sub claim) |
| `provider_id` | TEXT | NO | Provider name: 'google', 'credential' |
| `user_id` | UUID | NO | Foreign key to users table |
| `access_token` | TEXT | YES | OAuth access token |
| `refresh_token` | TEXT | YES | OAuth refresh token |
| `id_token` | TEXT | YES | OIDC ID token |
| `access_token_expires_at` | TIMESTAMP | YES | Access token expiration |
| `refresh_token_expires_at` | TIMESTAMP | YES | Refresh token expiration |
| `scope` | TEXT | YES | OAuth scopes granted |
| `password` | TEXT | YES | Hashed password for credential accounts |
| `created_at` | TIMESTAMP | NO | Creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |

---

## 4. Create `verifications` Table (Better Auth)

Stores email verification tokens.

```sql
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX verifications_identifier_idx ON verifications(identifier);
```

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key (auto-generated) |
| `identifier` | TEXT | NO | Email or phone being verified |
| `value` | TEXT | NO | Verification token/code |
| `expires_at` | TIMESTAMP | NO | Token expiration time |
| `created_at` | TIMESTAMP | NO | Creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |

---

## Migration Order

1. Modify `users` table (add columns, make nullable)
2. Create `sessions` table
3. Create `accounts` table
4. Create `verifications` table

---

## Rollback Commands

```sql
-- Remove new columns from users
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
ALTER TABLE users DROP COLUMN IF EXISTS is_global_user;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS image;

-- Restore NOT NULL constraints (only if no null values exist)
-- ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;

-- Drop Better Auth tables
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sessions;
```
