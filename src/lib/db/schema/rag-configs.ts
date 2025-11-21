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
  unique,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { relations } from 'drizzle-orm';

/**
 * RAG Configurations - Base entity for RAG configuration
 * Tenant-scoped, can be shared across multiple agents
 */
export const ragConfigs = pgTable(
  'rag_configs',
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
    tenantIdx: index('rag_configs_tenant_idx').on(table.tenantId),
    tenantNameUnique: unique('rag_configs_tenant_name_unique').on(table.tenantId, table.name),
  })
);

/**
 * RAG Configuration Versions - Versioned RAG settings
 * Each version contains all RAG parameters
 */
export const ragConfigVersions = pgTable(
  'rag_config_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ragConfigId: uuid('rag_config_id')
      .notNull()
      .references(() => ragConfigs.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    version: integer('version').notNull(),

    // Search Configuration
    searchMode: varchar('search_mode', { length: 50 }).default('hybrid').notNull(),
    topK: integer('top_k').default(5).notNull(),
    relevanceFilter: boolean('relevance_filter').default(true).notNull(),

    // Hybrid Search Parameters
    rrfK: integer('rrf_k').default(60).notNull(),
    vectorWeight: decimal('vector_weight', { precision: 3, scale: 2 }).default('0.6').notNull(),
    ftsWeight: decimal('fts_weight', { precision: 3, scale: 2 }).default('0.4').notNull(),
    hnswEfSearch: integer('hnsw_ef_search').default(64).notNull(),

    // Bedrock Configuration
    bedrockModel: varchar('bedrock_model', { length: 255 }).default(
      'amazon.titan-embed-text-v2:0'
    ),
    bedrockDimensions: integer('bedrock_dimensions').default(1024),

    // File Paths (Infrastructure)
    faissIndexPath: varchar('faiss_index_path', { length: 500 }).default('data/faiss/index.faiss'),
    faissMappingPath: varchar('faiss_mapping_path', { length: 500 }).default(
      'data/faiss/mapping.pkl'
    ),
    sqliteDbPath: varchar('sqlite_db_path', { length: 500 }).default(
      'data/metadata/healthcare_rag.db'
    ),

    // Version Metadata
    isActive: boolean('is_active').default(false).notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
  },
  (table) => ({
    ragConfigIdx: index('rag_config_versions_config_idx').on(table.ragConfigId),
    activeIdx: index('rag_config_versions_active_idx').on(table.isActive),
    versionUnique: unique('rag_config_versions_version_unique').on(table.ragConfigId, table.version),
  })
);

// Relations
export const ragConfigsRelations = relations(ragConfigs, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [ragConfigs.tenantId],
    references: [tenants.id],
  }),
  versions: many(ragConfigVersions),
}));

export const ragConfigVersionsRelations = relations(ragConfigVersions, ({ one }) => ({
  ragConfig: one(ragConfigs, {
    fields: [ragConfigVersions.ragConfigId],
    references: [ragConfigs.id],
  }),
  tenant: one(tenants, {
    fields: [ragConfigVersions.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [ragConfigVersions.createdBy],
    references: [users.id],
  }),
}));

// Type exports
export type RagConfig = typeof ragConfigs.$inferSelect;
export type NewRagConfig = typeof ragConfigs.$inferInsert;
export type RagConfigVersion = typeof ragConfigVersions.$inferSelect;
export type NewRagConfigVersion = typeof ragConfigVersions.$inferInsert;
