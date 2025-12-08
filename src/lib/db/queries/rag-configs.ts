import { db } from '@/lib/db';
import {
  ragConfigs,
  ragConfigVersions,
  type RagConfig,
  type RagConfigVersion,
} from '@/lib/db/schema/rag-configs';
import { eq, and, desc, count, inArray, sql } from 'drizzle-orm';
import { tenantFilter, type QueryContext } from './utils';

/**
 * Get all RAG configs for a tenant (optimized to avoid N+1 queries)
 */
export async function getRagConfigs(ctx: QueryContext) {
  const tenantCondition = tenantFilter(ragConfigs.tenantId, ctx);
  const conditions = [eq(ragConfigs.isActive, true)];
  if (tenantCondition) conditions.push(tenantCondition);

  const configs = await db.query.ragConfigs.findMany({
    where: and(...conditions),
    orderBy: [desc(ragConfigs.createdAt)],
  });

  if (configs.length === 0) {
    return [];
  }

  const configIds = configs.map((c) => c.id);

  // Batch fetch all active versions in one query
  const activeVersions = await db.query.ragConfigVersions.findMany({
    where: and(
      inArray(ragConfigVersions.ragConfigId, configIds),
      eq(ragConfigVersions.isActive, true)
    ),
  });

  // Batch fetch version counts in one query
  const versionCounts = await db
    .select({
      ragConfigId: ragConfigVersions.ragConfigId,
      count: count(),
    })
    .from(ragConfigVersions)
    .where(inArray(ragConfigVersions.ragConfigId, configIds))
    .groupBy(ragConfigVersions.ragConfigId);

  // Create lookup maps
  const activeVersionMap = new Map(activeVersions.map((v) => [v.ragConfigId, v]));
  const versionCountMap = new Map(versionCounts.map((v) => [v.ragConfigId, Number(v.count)]));

  // Combine data
  return configs.map((config) => ({
    ...config,
    activeVersion: activeVersionMap.get(config.id) || null,
    versionCount: versionCountMap.get(config.id) || 0,
  }));
}

/**
 * Get a single RAG config with its active version
 */
export async function getRagConfigDetail(ragConfigId: string, ctx: QueryContext) {
  const conditions = [eq(ragConfigs.id, ragConfigId)];
  const tenantCondition = tenantFilter(ragConfigs.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const config = await db.query.ragConfigs.findFirst({
    where: and(...conditions),
  });

  if (!config) {
    return null;
  }

  // Get active version
  const activeVersion = await db.query.ragConfigVersions.findFirst({
    where: and(
      eq(ragConfigVersions.ragConfigId, ragConfigId),
      eq(ragConfigVersions.isActive, true)
    ),
  });

  // Get version count
  const versionCount = await db
    .select({ count: count() })
    .from(ragConfigVersions)
    .where(eq(ragConfigVersions.ragConfigId, ragConfigId))
    .then((result) => result[0]?.count || 0);

  return {
    ...config,
    activeVersion: activeVersion || null,
    versionCount: Number(versionCount),
  };
}

/**
 * Create a new RAG config with initial version
 */
export async function createRagConfig(
  data: {
    name: string;
    description?: string;
    searchMode?: string;
    topK?: number;
    relevanceFilter?: boolean;
    rrfK?: number;
    vectorWeight?: string;
    ftsWeight?: string;
    hnswEfSearch?: number;
    bedrockModel?: string;
    bedrockDimensions?: number;
    faissIndexPath?: string;
    faissMappingPath?: string;
    sqliteDbPath?: string;
  },
  ctx: QueryContext,
  userId: string
) {
  return await db.transaction(async (tx) => {
    // Create the RAG config
    const [newConfig] = await tx
      .insert(ragConfigs)
      .values({
        name: data.name,
        description: data.description || null,
        tenantId: ctx.tenantId,
      })
      .returning();

    // Create the initial version (version 1, active by default)
    const [newVersion] = await tx
      .insert(ragConfigVersions)
      .values({
        ragConfigId: newConfig.id,
        tenantId: ctx.tenantId,
        version: 1,
        searchMode: data.searchMode || 'hybrid',
        topK: data.topK ?? 5,
        relevanceFilter: data.relevanceFilter ?? true,
        rrfK: data.rrfK ?? 60,
        vectorWeight: data.vectorWeight || '0.6',
        ftsWeight: data.ftsWeight || '0.4',
        hnswEfSearch: data.hnswEfSearch ?? 64,
        bedrockModel: data.bedrockModel || 'amazon.titan-embed-text-v2:0',
        bedrockDimensions: data.bedrockDimensions ?? 1024,
        faissIndexPath: data.faissIndexPath || 'data/faiss/index.faiss',
        faissMappingPath: data.faissMappingPath || 'data/faiss/mapping.pkl',
        sqliteDbPath: data.sqliteDbPath || 'data/metadata/healthcare_rag.db',
        isActive: true,
        createdBy: userId,
        notes: 'Initial version',
      })
      .returning();

    return {
      ...newConfig,
      activeVersion: newVersion,
      versionCount: 1,
    };
  });
}

/**
 * Update RAG config metadata (name, description)
 */
export async function updateRagConfig(
  ragConfigId: string,
  data: { name?: string; description?: string },
  ctx: QueryContext
) {
  const conditions = [eq(ragConfigs.id, ragConfigId)];
  const tenantCondition = tenantFilter(ragConfigs.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const [updatedConfig] = await db
    .update(ragConfigs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  return updatedConfig;
}

/**
 * Soft delete a RAG config (set isActive = false)
 */
export async function deleteRagConfig(ragConfigId: string, ctx: QueryContext) {
  const conditions = [eq(ragConfigs.id, ragConfigId)];
  const tenantCondition = tenantFilter(ragConfigs.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const [deletedConfig] = await db
    .update(ragConfigs)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  return deletedConfig;
}

/**
 * Get all versions for a RAG config
 */
export async function getRagConfigVersions(ragConfigId: string, ctx: QueryContext) {
  const conditions = [eq(ragConfigVersions.ragConfigId, ragConfigId)];
  const tenantCondition = tenantFilter(ragConfigVersions.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const versions = await db.query.ragConfigVersions.findMany({
    where: and(...conditions),
    orderBy: [desc(ragConfigVersions.version)],
  });

  return versions;
}

/**
 * Get a specific version
 */
export async function getRagConfigVersion(versionId: string, ctx: QueryContext) {
  const conditions = [eq(ragConfigVersions.id, versionId)];
  const tenantCondition = tenantFilter(ragConfigVersions.tenantId, ctx);
  if (tenantCondition) conditions.push(tenantCondition);

  const version = await db.query.ragConfigVersions.findFirst({
    where: and(...conditions),
  });

  return version;
}

/**
 * Create a new version for a RAG config
 */
export async function createRagConfigVersion(
  ragConfigId: string,
  data: {
    searchMode?: string;
    topK?: number;
    relevanceFilter?: boolean;
    rrfK?: number;
    vectorWeight?: string;
    ftsWeight?: string;
    hnswEfSearch?: number;
    bedrockModel?: string;
    bedrockDimensions?: number;
    faissIndexPath?: string;
    faissMappingPath?: string;
    sqliteDbPath?: string;
    notes?: string;
  },
  ctx: QueryContext,
  userId: string
) {
  // Get the highest version number
  const latestVersion = await db.query.ragConfigVersions.findFirst({
    where: eq(ragConfigVersions.ragConfigId, ragConfigId),
    orderBy: [desc(ragConfigVersions.version)],
  });

  const newVersionNumber = (latestVersion?.version || 0) + 1;

  const [newVersion] = await db
    .insert(ragConfigVersions)
    .values({
      ragConfigId,
      tenantId: ctx.tenantId,
      version: newVersionNumber,
      searchMode: data.searchMode || latestVersion?.searchMode || 'hybrid',
      topK: data.topK ?? latestVersion?.topK ?? 5,
      relevanceFilter: data.relevanceFilter ?? latestVersion?.relevanceFilter ?? true,
      rrfK: data.rrfK ?? latestVersion?.rrfK ?? 60,
      vectorWeight: data.vectorWeight || latestVersion?.vectorWeight || '0.6',
      ftsWeight: data.ftsWeight || latestVersion?.ftsWeight || '0.4',
      hnswEfSearch: data.hnswEfSearch ?? latestVersion?.hnswEfSearch ?? 64,
      bedrockModel: data.bedrockModel || latestVersion?.bedrockModel || 'amazon.titan-embed-text-v2:0',
      bedrockDimensions: data.bedrockDimensions ?? latestVersion?.bedrockDimensions ?? 1024,
      faissIndexPath: data.faissIndexPath || latestVersion?.faissIndexPath || 'data/faiss/index.faiss',
      faissMappingPath: data.faissMappingPath || latestVersion?.faissMappingPath || 'data/faiss/mapping.pkl',
      sqliteDbPath: data.sqliteDbPath || latestVersion?.sqliteDbPath || 'data/metadata/healthcare_rag.db',
      isActive: false,
      createdBy: userId,
      notes: data.notes || null,
    })
    .returning();

  return newVersion;
}

/**
 * Activate a specific RAG config version
 */
export async function activateRagConfigVersion(
  versionId: string,
  ragConfigId: string,
  ctx: QueryContext
) {
  const tenantCondition = tenantFilter(ragConfigVersions.tenantId, ctx);

  return await db.transaction(async (tx) => {
    // Deactivate all versions for this config
    await tx
      .update(ragConfigVersions)
      .set({ isActive: false })
      .where(eq(ragConfigVersions.ragConfigId, ragConfigId));

    // Activate the specified version
    const conditions = [eq(ragConfigVersions.id, versionId)];
    if (tenantCondition) conditions.push(tenantCondition);

    const [activatedVersion] = await tx
      .update(ragConfigVersions)
      .set({ isActive: true })
      .where(and(...conditions))
      .returning();

    return activatedVersion;
  });
}

/**
 * Get RAG configs for dropdown (simplified list)
 */
export async function getRagConfigsForDropdown(ctx: QueryContext) {
  const tenantCondition = tenantFilter(ragConfigs.tenantId, ctx);
  const conditions = [eq(ragConfigs.isActive, true)];
  if (tenantCondition) conditions.push(tenantCondition);

  const configs = await db.query.ragConfigs.findMany({
    where: and(...conditions),
    orderBy: [ragConfigs.name],
  });

  return configs.map((config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
  }));
}
