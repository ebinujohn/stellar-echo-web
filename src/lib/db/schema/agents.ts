import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { ragConfigs } from './rag-configs';
import { voiceConfigs } from './voice-configs';
import { relations } from 'drizzle-orm';

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('agents_tenant_idx').on(table.tenantId),
}));

export const agentConfigVersions = pgTable('agent_config_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  version: integer('version').notNull(),
  configJson: jsonb('config_json').notNull(),
  globalPrompt: text('global_prompt'),
  // Note: LLM settings are stored in configJson.workflow.llm (no separate column needed)
  // RAG Configuration Reference
  ragEnabled: boolean('rag_enabled').default(false).notNull(),
  ragConfigId: uuid('rag_config_id').references(() => ragConfigs.id),
  // Voice Configuration Reference
  voiceConfigId: uuid('voice_config_id').references(() => voiceConfigs.id),
  // Version Metadata
  isActive: boolean('is_active').default(false).notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
}, (table) => ({
  agentIdx: index('agent_config_versions_agent_idx').on(table.agentId),
  activeIdx: index('agent_config_versions_active_idx').on(table.isActive),
  ragConfigIdx: index('agent_config_versions_rag_config_idx').on(table.ragConfigId),
  voiceConfigIdx: index('agent_config_versions_voice_config_idx').on(table.voiceConfigId),
}));

export const phoneMappings = pgTable('phone_mappings', {
  phoneNumber: varchar('phone_number', { length: 20 }).primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  agentId: uuid('agent_id').references(() => agents.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const agentsRelations = relations(agents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [agents.tenantId],
    references: [tenants.id],
  }),
  configVersions: many(agentConfigVersions),
}));

export const agentConfigVersionsRelations = relations(agentConfigVersions, ({ one }) => ({
  agent: one(agents, {
    fields: [agentConfigVersions.agentId],
    references: [agents.id],
  }),
  tenant: one(tenants, {
    fields: [agentConfigVersions.tenantId],
    references: [tenants.id],
  }),
  ragConfig: one(ragConfigs, {
    fields: [agentConfigVersions.ragConfigId],
    references: [ragConfigs.id],
  }),
  voiceConfig: one(voiceConfigs, {
    fields: [agentConfigVersions.voiceConfigId],
    references: [voiceConfigs.id],
  }),
}));

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentConfigVersion = typeof agentConfigVersions.$inferSelect;
export type NewAgentConfigVersion = typeof agentConfigVersions.$inferInsert;
export type PhoneMapping = typeof phoneMappings.$inferSelect;
export type NewPhoneMapping = typeof phoneMappings.$inferInsert;
