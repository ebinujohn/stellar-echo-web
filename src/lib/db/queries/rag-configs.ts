import { db } from '@/lib/db';
import {
  ragConfigs,
  ragConfigVersions,
  type RagConfig,
  type RagConfigVersion,
} from '@/lib/db/schema/rag-configs';
import { eq, and, desc, count } from 'drizzle-orm';

/**
 * Get all RAG configs for a tenant
 */
export async function getRagConfigs(tenantId: string) {
  const configs = await db.query.ragConfigs.findMany({
    where: and(eq(ragConfigs.tenantId, tenantId), eq(ragConfigs.isActive, true)),
    orderBy: [desc(ragConfigs.createdAt)],
  });

  // Get active version for each config
  const configsWithVersions = await Promise.all(
    configs.map(async (config) => {
      const activeVersion = await db.query.ragConfigVersions.findFirst({
        where: and(
          eq(ragConfigVersions.ragConfigId, config.id),
          eq(ragConfigVersions.isActive, true)
        ),
      });

      const versionCount = await db
        .select({ count: count() })
        .from(ragConfigVersions)
        .where(eq(ragConfigVersions.ragConfigId, config.id))
        .then((result) => result[0]?.count || 0);

      return {
        ...config,
        activeVersion: activeVersion || null,
        versionCount: Number(versionCount),
      };
    })
  );

  return configsWithVersions;
}

/**
 * Get a single RAG config with its active version
 */
export async function getRagConfigDetail(ragConfigId: string, tenantId: string) {
  const config = await db.query.ragConfigs.findFirst({
    where: and(eq(ragConfigs.id, ragConfigId), eq(ragConfigs.tenantId, tenantId)),
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
  tenantId: string,
  userId: string
) {
  return await db.transaction(async (tx) => {
    // Create the RAG config
    const [newConfig] = await tx
      .insert(ragConfigs)
      .values({
        name: data.name,
        description: data.description || null,
        tenantId,
      })
      .returning();

    // Create the initial version (version 1, active by default)
    const [newVersion] = await tx
      .insert(ragConfigVersions)
      .values({
        ragConfigId: newConfig.id,
        tenantId,
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
  tenantId: string
) {
  const [updatedConfig] = await db
    .update(ragConfigs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(ragConfigs.id, ragConfigId), eq(ragConfigs.tenantId, tenantId)))
    .returning();

  return updatedConfig;
}

/**
 * Soft delete a RAG config (set isActive = false)
 */
export async function deleteRagConfig(ragConfigId: string, tenantId: string) {
  const [deletedConfig] = await db
    .update(ragConfigs)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(ragConfigs.id, ragConfigId), eq(ragConfigs.tenantId, tenantId)))
    .returning();

  return deletedConfig;
}

/**
 * Get all versions for a RAG config
 */
export async function getRagConfigVersions(ragConfigId: string, tenantId: string) {
  const versions = await db.query.ragConfigVersions.findMany({
    where: and(
      eq(ragConfigVersions.ragConfigId, ragConfigId),
      eq(ragConfigVersions.tenantId, tenantId)
    ),
    orderBy: [desc(ragConfigVersions.version)],
  });

  return versions;
}

/**
 * Get a specific version
 */
export async function getRagConfigVersion(versionId: string, tenantId: string) {
  const version = await db.query.ragConfigVersions.findFirst({
    where: and(
      eq(ragConfigVersions.id, versionId),
      eq(ragConfigVersions.tenantId, tenantId)
    ),
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
  tenantId: string,
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
      tenantId,
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
  tenantId: string
) {
  return await db.transaction(async (tx) => {
    // Deactivate all versions for this config
    await tx
      .update(ragConfigVersions)
      .set({ isActive: false })
      .where(eq(ragConfigVersions.ragConfigId, ragConfigId));

    // Activate the specified version
    const [activatedVersion] = await tx
      .update(ragConfigVersions)
      .set({ isActive: true })
      .where(
        and(
          eq(ragConfigVersions.id, versionId),
          eq(ragConfigVersions.tenantId, tenantId)
        )
      )
      .returning();

    return activatedVersion;
  });
}

/**
 * Get RAG configs for dropdown (simplified list)
 */
export async function getRagConfigsForDropdown(tenantId: string) {
  const configs = await db.query.ragConfigs.findMany({
    where: and(eq(ragConfigs.tenantId, tenantId), eq(ragConfigs.isActive, true)),
    orderBy: [ragConfigs.name],
  });

  return configs.map((config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
  }));
}
