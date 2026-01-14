import { pgTable, pgEnum, uuid, varchar, text, timestamp, index, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// User role enum matching the database
export const userRoleEnum = pgEnum('user_role_enum', ['admin', 'user', 'viewer']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // tenantId is nullable for global users (Google OAuth users with cross-tenant access)
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash'),
    name: varchar('name', { length: 255 }).notNull(),
    // Profile image URL (populated from Google OAuth)
    image: text('image'),
    role: userRoleEnum('role').notNull().default('user'),
    isActive: boolean('is_active').notNull().default(true),
    emailVerified: boolean('email_verified').notNull().default(false),
    // isGlobalUser flag for cross-tenant access (Google OAuth admin users)
    isGlobalUser: boolean('is_global_user').notNull().default(false),
    lastLogin: timestamp('last_login', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    tenantIdx: index('idx_users_tenant').on(table.tenantId),
    roleIdx: index('idx_users_role').on(table.role),
    activeIdx: index('idx_users_active').on(table.isActive),
    globalUserIdx: index('idx_users_global_user').on(table.isGlobalUser),
    // Unique constraint on email only (tenantId can be null for global users)
    emailUnique: uniqueIndex('uq_users_email').on(table.email),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
