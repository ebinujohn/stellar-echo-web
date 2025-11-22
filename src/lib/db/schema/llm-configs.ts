import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  index,
} from 'drizzle-orm/pg-core';

/**
 * LLM Models - System-level predefined LLM models
 * Available across all tenants, managed by administrators
 * Used as a reference table for model selection in agent settings
 */
export const llmModels = pgTable(
  'llm_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelName: varchar('model_name', { length: 100 }).notNull().unique(),
    provider: varchar('provider', { length: 50 }).notNull(), // e.g., "openai", "azure"
    actualModelId: varchar('actual_model_id', { length: 100 }).notNull(), // e.g., "gpt-4.1"
    description: text('description'),

    // Default Parameters
    defaultTemperature: decimal('default_temperature', { precision: 3, scale: 2 }).default('1.0'),
    defaultMaxTokens: integer('default_max_tokens').default(150),
    defaultServiceTier: varchar('default_service_tier', { length: 50 }).default('auto'),

    // Metadata
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    modelNameIdx: index('llm_models_model_name_idx').on(table.modelName),
    activeIdx: index('llm_models_active_idx').on(table.isActive),
  })
);

// Type exports
export type LlmModel = typeof llmModels.$inferSelect;
export type NewLlmModel = typeof llmModels.$inferInsert;
