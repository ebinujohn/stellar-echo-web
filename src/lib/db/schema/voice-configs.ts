import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { relations } from 'drizzle-orm';

/**
 * Voice Configurations - Base entity for Voice/TTS configuration
 * Tenant-scoped, can be shared across multiple agents
 */
export const voiceConfigs = pgTable(
  'voice_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('voice_configs_tenant_idx').on(table.tenantId),
    tenantNameUnique: unique('voice_configs_tenant_name_unique').on(table.tenantId, table.name),
  })
);

/**
 * Voice Configuration Versions - Versioned Voice/TTS settings
 * Each version contains all voice parameters
 */
export const voiceConfigVersions = pgTable(
  'voice_config_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voiceConfigId: uuid('voice_config_id')
      .notNull()
      .references(() => voiceConfigs.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    version: integer('version').notNull(),

    // Voice Configuration
    voiceId: varchar('voice_id', { length: 255 }).notNull(), // ElevenLabs voice ID (required)
    model: varchar('model', { length: 100 }).default('eleven_turbo_v2_5').notNull(),

    // Voice Quality Settings
    stability: decimal('stability', { precision: 3, scale: 2 }).default('0.5').notNull(),
    similarityBoost: decimal('similarity_boost', { precision: 3, scale: 2 }).default('0.75').notNull(),
    style: decimal('style', { precision: 3, scale: 2 }).default('0.0').notNull(),

    // Voice Features
    useSpeakerBoost: boolean('use_speaker_boost').default(true).notNull(),
    enableSsmlParsing: boolean('enable_ssml_parsing').default(false).notNull(),

    // Pronunciation Configuration
    pronunciationDictionariesEnabled: boolean('pronunciation_dictionaries_enabled')
      .default(true)
      .notNull(),
    pronunciationDictionaryIds: jsonb('pronunciation_dictionary_ids')
      .$type<string[]>()
      .default([])
      .notNull(),

    // Version Metadata
    isActive: boolean('is_active').default(false).notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
  },
  (table) => ({
    voiceConfigIdx: index('voice_config_versions_config_idx').on(table.voiceConfigId),
    activeIdx: index('voice_config_versions_active_idx').on(table.isActive),
    versionUnique: unique('voice_config_versions_version_unique').on(
      table.voiceConfigId,
      table.version
    ),
  })
);

// Relations
export const voiceConfigsRelations = relations(voiceConfigs, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [voiceConfigs.tenantId],
    references: [tenants.id],
  }),
  versions: many(voiceConfigVersions),
}));

export const voiceConfigVersionsRelations = relations(voiceConfigVersions, ({ one }) => ({
  voiceConfig: one(voiceConfigs, {
    fields: [voiceConfigVersions.voiceConfigId],
    references: [voiceConfigs.id],
  }),
  tenant: one(tenants, {
    fields: [voiceConfigVersions.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [voiceConfigVersions.createdBy],
    references: [users.id],
  }),
}));

// Type exports
export type VoiceConfig = typeof voiceConfigs.$inferSelect;
export type NewVoiceConfig = typeof voiceConfigs.$inferInsert;
export type VoiceConfigVersion = typeof voiceConfigVersions.$inferSelect;
export type NewVoiceConfigVersion = typeof voiceConfigVersions.$inferInsert;
