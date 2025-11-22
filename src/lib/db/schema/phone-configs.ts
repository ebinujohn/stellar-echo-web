import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { agents } from './agents';
import { relations } from 'drizzle-orm';

/**
 * Phone Configurations - Phone number pool
 * Tenant-scoped, stores individual phone numbers with metadata
 */
export const phoneConfigs = pgTable(
  'phone_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(), // E.164 format (e.g., +17708304765)
    name: varchar('name', { length: 255 }), // Optional label for this phone number
    description: text('description'), // Optional description
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('phone_configs_tenant_idx').on(table.tenantId),
    phoneNumberIdx: index('phone_configs_phone_number_idx').on(table.phoneNumber),
    // Each phone number must be unique within a tenant
    tenantPhoneUnique: unique('phone_configs_tenant_phone_unique').on(
      table.tenantId,
      table.phoneNumber
    ),
  })
);

/**
 * Phone Mappings - Links phone numbers to agents
 * Each phone_config can be mapped to one agent
 */
export const phoneConfigMappings = pgTable(
  'phone_mappings',
  {
    phoneConfigId: uuid('phone_config_id')
      .primaryKey()
      .references(() => phoneConfigs.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    agentIdx: index('phone_config_mappings_agent_idx').on(table.agentId),
    tenantIdx: index('phone_config_mappings_tenant_idx').on(table.tenantId),
  })
);

// Relations
export const phoneConfigsRelations = relations(phoneConfigs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [phoneConfigs.tenantId],
    references: [tenants.id],
  }),
  mapping: one(phoneConfigMappings, {
    fields: [phoneConfigs.id],
    references: [phoneConfigMappings.phoneConfigId],
  }),
}));

export const phoneConfigMappingsRelations = relations(phoneConfigMappings, ({ one }) => ({
  phoneConfig: one(phoneConfigs, {
    fields: [phoneConfigMappings.phoneConfigId],
    references: [phoneConfigs.id],
  }),
  agent: one(agents, {
    fields: [phoneConfigMappings.agentId],
    references: [agents.id],
  }),
  tenant: one(tenants, {
    fields: [phoneConfigMappings.tenantId],
    references: [tenants.id],
  }),
}));

// Type exports
export type PhoneConfig = typeof phoneConfigs.$inferSelect;
export type NewPhoneConfig = typeof phoneConfigs.$inferInsert;
export type PhoneConfigMapping = typeof phoneConfigMappings.$inferSelect;
export type NewPhoneConfigMapping = typeof phoneConfigMappings.$inferInsert;
