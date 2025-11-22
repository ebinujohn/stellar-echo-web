import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Configuration Type Categories
 */
export type ConfigTypeCategory = 'node_type' | 'transition_condition' | 'action_type' | 'search_mode';

/**
 * Workflow Configuration Types - Reference table for UI applications
 * Contains metadata about all available configuration options
 */
export const workflowConfigTypes = pgTable(
  'workflow_config_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Type Classification
    category: varchar('category', { length: 50 }).notNull(), // node_type, transition_condition, action_type, search_mode
    value: varchar('value', { length: 100 }).notNull(), // e.g., 'standard', 'timeout', 'log'

    // Display Information
    displayName: varchar('display_name', { length: 255 }).notNull(),
    description: text('description'),

    // Configuration Schema (for parameterized types)
    parameterSchema: jsonb('parameter_schema'), // JSON schema for parameters (e.g., {pattern: "timeout:{seconds}s", parameters: [{name: "seconds", type: "number"}]})

    // Transition-specific fields
    isPatternBased: boolean('is_pattern_based'), // For transitions: true=deterministic (~0ms), false=LLM-based (~100-300ms)

    // Applicability
    applicableTo: jsonb('applicable_to').$type<string[]>().default(sql`'[]'::jsonb`), // Node types this can be used with

    // Examples and Documentation
    examples: jsonb('examples').$type<string[]>().default(sql`'[]'::jsonb`), // Usage examples

    // Display and Status
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('workflow_config_types_category_idx').on(table.category),
    categoryValueIdx: index('workflow_config_types_category_value_idx').on(table.category, table.value),
    activeIdx: index('workflow_config_types_active_idx').on(table.isActive),
  })
);

// Type exports
export type WorkflowConfigType = typeof workflowConfigTypes.$inferSelect;
export type NewWorkflowConfigType = typeof workflowConfigTypes.$inferInsert;
