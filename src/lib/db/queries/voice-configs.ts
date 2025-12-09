import { db } from '@/lib/db';
import { voiceConfigs } from '@/lib/db/schema/voice-configs';
import { eq, desc } from 'drizzle-orm';

/**
 * Get all Voice configs (system-level, no tenant filtering)
 * Voice configs are a shared catalog available to all tenants
 */
export async function getVoiceConfigs() {
  return db.query.voiceConfigs.findMany({
    where: eq(voiceConfigs.isActive, true),
    orderBy: [desc(voiceConfigs.createdAt)],
  });
}

/**
 * Get a single Voice config by ID
 */
export async function getVoiceConfigDetail(voiceConfigId: string) {
  return db.query.voiceConfigs.findFirst({
    where: eq(voiceConfigs.id, voiceConfigId),
  });
}

/**
 * Create a new Voice config (simple catalog entry)
 * Per AGENT_JSON_SCHEMA.md: voice configs are just identity (name, voiceId, description)
 * TTS tuning parameters are configured at agent level in workflow.tts
 */
export async function createVoiceConfig(
  data: {
    name: string;
    description?: string;
    voiceId: string;
  }
) {
  // Voice configs are system-level and don't require tenant/user context
  const [newConfig] = await db
    .insert(voiceConfigs)
    .values({
      name: data.name,
      description: data.description || null,
      voiceId: data.voiceId,
      provider: 'elevenlabs', // Default provider
      model: 'eleven_turbo_v2_5', // Default model
    })
    .returning();

  return {
    ...newConfig,
    activeVersion: null,
    versionCount: 0,
  };
}

/**
 * Update Voice config (name, description only)
 */
export async function updateVoiceConfig(
  voiceConfigId: string,
  data: { name?: string; description?: string }
) {
  const [updatedConfig] = await db
    .update(voiceConfigs)
    .set({
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      updatedAt: new Date(),
    })
    .where(eq(voiceConfigs.id, voiceConfigId))
    .returning();

  return updatedConfig;
}

/**
 * Soft delete a Voice config (set isActive = false)
 */
export async function deleteVoiceConfig(voiceConfigId: string) {
  const [deletedConfig] = await db
    .update(voiceConfigs)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(voiceConfigs.id, voiceConfigId))
    .returning();

  return deletedConfig;
}

/**
 * Get Voice configs for dropdown (simplified list)
 */
export async function getVoiceConfigsForDropdown() {
  // Voice configs are system-level (shared across all tenants)
  const configs = await db.query.voiceConfigs.findMany({
    where: eq(voiceConfigs.isActive, true),
    orderBy: [voiceConfigs.name],
  });

  return configs.map((config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
  }));
}

