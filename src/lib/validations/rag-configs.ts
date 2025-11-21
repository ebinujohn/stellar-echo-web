import { z } from 'zod';

/**
 * Schema for creating a new RAG config
 */
export const createRagConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'RAG config name is required')
    .max(255, 'RAG config name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  // Initial version settings
  searchMode: z.enum(['vector', 'fts', 'hybrid']).optional().default('hybrid'),
  topK: z.number().int().min(1).max(50).optional().default(5),
  relevanceFilter: z.boolean().optional().default(true),
  rrfK: z.number().int().min(1).max(200).optional().default(60),
  vectorWeight: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional().default('0.6'),
  ftsWeight: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional().default('0.4'),
  hnswEfSearch: z.number().int().min(1).optional().default(64),
  bedrockModel: z.string().optional().default('amazon.titan-embed-text-v2:0'),
  bedrockDimensions: z.number().int().min(1).optional().default(1024),
  faissIndexPath: z.string().optional().default('data/faiss/index.faiss'),
  faissMappingPath: z.string().optional().default('data/faiss/mapping.pkl'),
  sqliteDbPath: z.string().optional().default('data/metadata/healthcare_rag.db'),
});

export type CreateRagConfigInput = z.infer<typeof createRagConfigSchema>;

/**
 * Schema for updating RAG config metadata
 */
export const updateRagConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'RAG config name is required')
    .max(255, 'RAG config name must be less than 255 characters')
    .optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

export type UpdateRagConfigInput = z.infer<typeof updateRagConfigSchema>;

/**
 * Schema for creating a new RAG config version
 */
export const createRagConfigVersionSchema = z.object({
  searchMode: z.enum(['vector', 'fts', 'hybrid']).optional(),
  topK: z.number().int().min(1).max(50).optional(),
  relevanceFilter: z.boolean().optional(),
  rrfK: z.number().int().min(1).max(200).optional(),
  vectorWeight: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional(),
  ftsWeight: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional(),
  hnswEfSearch: z.number().int().min(1).optional(),
  bedrockModel: z.string().optional(),
  bedrockDimensions: z.number().int().min(1).optional(),
  faissIndexPath: z.string().optional(),
  faissMappingPath: z.string().optional(),
  sqliteDbPath: z.string().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export type CreateRagConfigVersionInput = z.infer<typeof createRagConfigVersionSchema>;

/**
 * Search mode enum for UI
 */
export const searchModes = [
  { value: 'vector', label: 'Vector (Semantic)', description: 'Pure semantic search using embeddings' },
  { value: 'fts', label: 'FTS (Keyword)', description: 'Pure keyword search using SQLite FTS5' },
  { value: 'hybrid', label: 'Hybrid', description: 'Combines vector + FTS using RRF fusion' },
] as const;

export type SearchMode = typeof searchModes[number]['value'];
