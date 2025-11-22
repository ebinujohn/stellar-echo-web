import { db } from '@/lib/db';
import { voiceConfigs, voiceConfigVersions } from '@/lib/db/schema/voice-configs';
import { eq, and, desc, count } from 'drizzle-orm';

/**
 * Get all Voice configs for a tenant
 */
export async function getVoiceConfigs(tenantId: string) {
  const configs = await db.query.voiceConfigs.findMany({
    where: and(eq(voiceConfigs.tenantId, tenantId), eq(voiceConfigs.isActive, true)),
    orderBy: [desc(voiceConfigs.createdAt)],
  });

  // Get active version for each config
  const configsWithVersions = await Promise.all(
    configs.map(async (config) => {
      const activeVersion = await db.query.voiceConfigVersions.findFirst({
        where: and(
          eq(voiceConfigVersions.voiceConfigId, config.id),
          eq(voiceConfigVersions.isActive, true)
        ),
      });

      const versionCount = await db
        .select({ count: count() })
        .from(voiceConfigVersions)
        .where(eq(voiceConfigVersions.voiceConfigId, config.id))
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
 * Get a single Voice config with its active version
 */
export async function getVoiceConfigDetail(voiceConfigId: string, tenantId: string) {
  const config = await db.query.voiceConfigs.findFirst({
    where: and(eq(voiceConfigs.id, voiceConfigId), eq(voiceConfigs.tenantId, tenantId)),
  });

  if (!config) {
    return null;
  }

  // Get active version
  const activeVersion = await db.query.voiceConfigVersions.findFirst({
    where: and(
      eq(voiceConfigVersions.voiceConfigId, voiceConfigId),
      eq(voiceConfigVersions.isActive, true)
    ),
  });

  // Get version count
  const versionCount = await db
    .select({ count: count() })
    .from(voiceConfigVersions)
    .where(eq(voiceConfigVersions.voiceConfigId, voiceConfigId))
    .then((result) => result[0]?.count || 0);

  return {
    ...config,
    activeVersion: activeVersion || null,
    versionCount: Number(versionCount),
  };
}

/**
 * Create a new Voice config with initial version
 */
export async function createVoiceConfig(
  data: {
    name: string;
    description?: string;
    voiceId: string;
    model?: string;
    stability?: string;
    similarityBoost?: string;
    style?: string;
    useSpeakerBoost?: boolean;
    enableSsmlParsing?: boolean;
    pronunciationDictionariesEnabled?: boolean;
    pronunciationDictionaryIds?: string[];
  },
  tenantId: string,
  userId: string
) {
  return await db.transaction(async (tx) => {
    // Create the Voice config
    const [newConfig] = await tx
      .insert(voiceConfigs)
      .values({
        name: data.name,
        description: data.description || null,
        tenantId,
      })
      .returning();

    // Create the initial version (version 1, active by default)
    const [newVersion] = await tx
      .insert(voiceConfigVersions)
      .values({
        voiceConfigId: newConfig.id,
        tenantId,
        version: 1,
        voiceId: data.voiceId,
        model: data.model || 'eleven_turbo_v2_5',
        stability: data.stability || '0.5',
        similarityBoost: data.similarityBoost || '0.75',
        style: data.style || '0.0',
        useSpeakerBoost: data.useSpeakerBoost ?? true,
        enableSsmlParsing: data.enableSsmlParsing ?? false,
        pronunciationDictionariesEnabled: data.pronunciationDictionariesEnabled ?? true,
        pronunciationDictionaryIds: data.pronunciationDictionaryIds || [],
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
 * Update Voice config metadata (name, description)
 */
export async function updateVoiceConfig(
  voiceConfigId: string,
  data: { name?: string; description?: string },
  tenantId: string
) {
  const [updatedConfig] = await db
    .update(voiceConfigs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(voiceConfigs.id, voiceConfigId), eq(voiceConfigs.tenantId, tenantId)))
    .returning();

  return updatedConfig;
}

/**
 * Soft delete a Voice config (set isActive = false)
 */
export async function deleteVoiceConfig(voiceConfigId: string, tenantId: string) {
  const [deletedConfig] = await db
    .update(voiceConfigs)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(voiceConfigs.id, voiceConfigId), eq(voiceConfigs.tenantId, tenantId)))
    .returning();

  return deletedConfig;
}

/**
 * Get all versions for a Voice config
 */
export async function getVoiceConfigVersions(voiceConfigId: string, tenantId: string) {
  const versions = await db.query.voiceConfigVersions.findMany({
    where: and(
      eq(voiceConfigVersions.voiceConfigId, voiceConfigId),
      eq(voiceConfigVersions.tenantId, tenantId)
    ),
    orderBy: [desc(voiceConfigVersions.version)],
  });

  return versions;
}

/**
 * Get a specific version
 */
export async function getVoiceConfigVersion(versionId: string, tenantId: string) {
  const version = await db.query.voiceConfigVersions.findFirst({
    where: and(
      eq(voiceConfigVersions.id, versionId),
      eq(voiceConfigVersions.tenantId, tenantId)
    ),
  });

  return version;
}

/**
 * Create a new version for a Voice config
 */
export async function createVoiceConfigVersion(
  voiceConfigId: string,
  data: {
    voiceId?: string;
    model?: string;
    stability?: string;
    similarityBoost?: string;
    style?: string;
    useSpeakerBoost?: boolean;
    enableSsmlParsing?: boolean;
    pronunciationDictionariesEnabled?: boolean;
    pronunciationDictionaryIds?: string[];
    notes?: string;
  },
  tenantId: string,
  userId: string
) {
  // Get the highest version number
  const latestVersion = await db.query.voiceConfigVersions.findFirst({
    where: eq(voiceConfigVersions.voiceConfigId, voiceConfigId),
    orderBy: [desc(voiceConfigVersions.version)],
  });

  const newVersionNumber = (latestVersion?.version || 0) + 1;

  const [newVersion] = await db
    .insert(voiceConfigVersions)
    .values({
      voiceConfigId,
      tenantId,
      version: newVersionNumber,
      voiceId: data.voiceId || latestVersion?.voiceId || '',
      model: data.model || latestVersion?.model || 'eleven_turbo_v2_5',
      stability: data.stability || latestVersion?.stability || '0.5',
      similarityBoost: data.similarityBoost || latestVersion?.similarityBoost || '0.75',
      style: data.style || latestVersion?.style || '0.0',
      useSpeakerBoost: data.useSpeakerBoost ?? latestVersion?.useSpeakerBoost ?? true,
      enableSsmlParsing: data.enableSsmlParsing ?? latestVersion?.enableSsmlParsing ?? false,
      pronunciationDictionariesEnabled:
        data.pronunciationDictionariesEnabled ??
        latestVersion?.pronunciationDictionariesEnabled ??
        true,
      pronunciationDictionaryIds:
        data.pronunciationDictionaryIds || latestVersion?.pronunciationDictionaryIds || [],
      isActive: false,
      createdBy: userId,
      notes: data.notes || null,
    })
    .returning();

  return newVersion;
}

/**
 * Activate a specific Voice config version
 */
export async function activateVoiceConfigVersion(
  versionId: string,
  voiceConfigId: string,
  tenantId: string
) {
  return await db.transaction(async (tx) => {
    // Deactivate all versions for this config
    await tx
      .update(voiceConfigVersions)
      .set({ isActive: false })
      .where(eq(voiceConfigVersions.voiceConfigId, voiceConfigId));

    // Activate the specified version
    const [activatedVersion] = await tx
      .update(voiceConfigVersions)
      .set({ isActive: true })
      .where(
        and(
          eq(voiceConfigVersions.id, versionId),
          eq(voiceConfigVersions.tenantId, tenantId)
        )
      )
      .returning();

    return activatedVersion;
  });
}

/**
 * Get Voice configs for dropdown (simplified list)
 */
export async function getVoiceConfigsForDropdown(tenantId: string) {
  const configs = await db.query.voiceConfigs.findMany({
    where: and(eq(voiceConfigs.tenantId, tenantId), eq(voiceConfigs.isActive, true)),
    orderBy: [voiceConfigs.name],
  });

  return configs.map((config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
  }));
}
