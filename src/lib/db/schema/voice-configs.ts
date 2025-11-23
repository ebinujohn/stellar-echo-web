import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * Voice Configurations - System-level voice catalog
 * Simple catalog of available voices (no tenant scoping, no versioning)
 * TTS tuning parameters are configured at the agent level in workflow.tts
 *
 * Per AGENT_JSON_SCHEMA.md:
 * - Voice selection is done at agent level (voice_name references this catalog)
 * - TTS tuning params (stability, similarity_boost, etc.) are in agent's workflow.tts
 */
export const voiceConfigs = pgTable(
  'voice_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // voice_name is the friendly name used to reference this voice
    name: varchar('voice_name', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 100 }).default('elevenlabs'),
    // voice_id is the actual ElevenLabs voice ID
    voiceId: varchar('voice_id', { length: 255 }).notNull(),
    // Default model for this voice
    model: varchar('model', { length: 100 }).default('eleven_turbo_v2_5'),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameUnique: unique('voice_configs_name_unique').on(table.name),
  })
);

// Type exports
export type VoiceConfig = typeof voiceConfigs.$inferSelect;
export type NewVoiceConfig = typeof voiceConfigs.$inferInsert;
