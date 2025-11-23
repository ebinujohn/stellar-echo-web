import { db } from '@/lib/db';
import {
  agents,
  agentConfigVersions,
  phoneMappings,
  type Agent,
  type NewAgent,
  type AgentConfigVersion,
  type NewAgentConfigVersion,
  type PhoneMapping,
  type NewPhoneMapping,
} from '@/lib/db/schema/agents';
import { calls } from '@/lib/db/schema/calls';
import { eq, and, desc, count, sql } from 'drizzle-orm';

/**
 * Get single agent with active version details
 */
export async function getAgentDetail(agentId: string, tenantId: string) {
  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)),
  });

  if (!agent) {
    return null;
  }

  // Get active version with full config
  const activeVersion = await db.query.agentConfigVersions.findFirst({
    where: and(
      eq(agentConfigVersions.agentId, agentId),
      eq(agentConfigVersions.isActive, true)
    ),
  });

  // Get call count
  const callCount = await db
    .select({ count: count() })
    .from(calls)
    .where(and(eq(calls.agentId, agentId), eq(calls.tenantId, tenantId)))
    .then((result) => result[0]?.count || 0);

  // Get phone mapping count
  const phoneMappingCount = await db
    .select({ count: count() })
    .from(phoneMappings)
    .where(
      and(eq(phoneMappings.agentId, agentId), eq(phoneMappings.tenantId, tenantId))
    )
    .then((result) => result[0]?.count || 0);

  // Get total version count
  const versionCount = await db
    .select({ count: count() })
    .from(agentConfigVersions)
    .where(eq(agentConfigVersions.agentId, agentId))
    .then((result) => result[0]?.count || 0);

  return {
    ...agent,
    activeVersion: activeVersion
      ? {
          id: activeVersion.id,
          version: activeVersion.version,
          configJson: activeVersion.configJson,
          globalPrompt: activeVersion.globalPrompt,
          ragEnabled: activeVersion.ragEnabled,
          ragConfigId: activeVersion.ragConfigId,
          voiceConfigId: activeVersion.voiceConfigId,
          createdBy: activeVersion.createdBy,
          createdAt: activeVersion.createdAt,
          notes: activeVersion.notes,
        }
      : null,
    callCount: Number(callCount),
    phoneMappingCount: Number(phoneMappingCount),
    versionCount: Number(versionCount),
  };
}

/**
 * Create a new agent with an initial config version
 */
export async function createAgent(
  data: { name: string; description?: string },
  configJson: any,
  tenantId: string,
  userId: string
) {
  return await db.transaction(async (tx) => {
    // Create the agent
    const [newAgent] = await tx
      .insert(agents)
      .values({
        name: data.name,
        description: data.description || null,
        tenantId,
      })
      .returning();

    // Create the initial config version (version 1, active by default)
    const [newVersion] = await tx
      .insert(agentConfigVersions)
      .values({
        agentId: newAgent.id,
        tenantId,
        version: 1,
        configJson,
        isActive: true,
        createdBy: userId,
        notes: 'Initial version',
      })
      .returning();

    return {
      ...newAgent,
      activeVersion: {
        id: newVersion.id,
        version: newVersion.version,
        configJson: newVersion.configJson,
        createdBy: newVersion.createdBy,
        createdAt: newVersion.createdAt,
        notes: newVersion.notes,
      },
    };
  });
}

/**
 * Update agent metadata (name, description)
 */
export async function updateAgent(
  agentId: string,
  data: { name?: string; description?: string },
  tenantId: string
) {
  const [updatedAgent] = await db
    .update(agents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
    .returning();

  return updatedAgent;
}

/**
 * Delete an agent and all associated data
 * Note: This cascades to config versions and updates phone mappings
 */
export async function deleteAgent(agentId: string, tenantId: string) {
  return await db.transaction(async (tx) => {
    // First, clear phone mappings for this agent
    await tx
      .update(phoneMappings)
      .set({ agentId: null })
      .where(
        and(eq(phoneMappings.agentId, agentId), eq(phoneMappings.tenantId, tenantId))
      );

    // Delete all config versions
    await tx
      .delete(agentConfigVersions)
      .where(eq(agentConfigVersions.agentId, agentId));

    // Delete the agent
    const [deletedAgent] = await tx
      .delete(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
      .returning();

    return deletedAgent;
  });
}

/**
 * Get all config versions for an agent
 */
export async function getAgentVersions(agentId: string, tenantId: string) {
  const versions = await db.query.agentConfigVersions.findMany({
    where: and(
      eq(agentConfigVersions.agentId, agentId),
      eq(agentConfigVersions.tenantId, tenantId)
    ),
    orderBy: [desc(agentConfigVersions.version)],
  });

  return versions;
}

/**
 * Get a specific config version
 */
export async function getAgentVersion(versionId: string, tenantId: string) {
  const version = await db.query.agentConfigVersions.findFirst({
    where: and(
      eq(agentConfigVersions.id, versionId),
      eq(agentConfigVersions.tenantId, tenantId)
    ),
  });

  return version;
}

/**
 * Create a new config version for an agent
 */
export async function createAgentVersion(
  agentId: string,
  configJson: any,
  userId: string,
  tenantId: string,
  notes?: string,
  globalPrompt?: string | null,
  ragEnabled?: boolean,
  ragConfigId?: string | null,
  voiceConfigId?: string | null
) {
  // Get the highest version number for this agent
  const latestVersion = await db.query.agentConfigVersions.findFirst({
    where: eq(agentConfigVersions.agentId, agentId),
    orderBy: [desc(agentConfigVersions.version)],
  });

  const newVersionNumber = (latestVersion?.version || 0) + 1;

  const [newVersion] = await db
    .insert(agentConfigVersions)
    .values({
      agentId,
      tenantId,
      version: newVersionNumber,
      configJson,
      globalPrompt: globalPrompt ?? null,
      ragEnabled: ragEnabled ?? false,
      ragConfigId: ragConfigId ?? null,
      voiceConfigId: voiceConfigId ?? null,
      isActive: false, // New versions are not active by default
      createdBy: userId,
      notes: notes || null,
    })
    .returning();

  return newVersion;
}

/**
 * Activate a specific config version
 * This sets the specified version as active and all others as inactive
 */
export async function activateVersion(
  versionId: string,
  agentId: string,
  tenantId: string
) {
  return await db.transaction(async (tx) => {
    // Set all versions for this agent as inactive
    await tx
      .update(agentConfigVersions)
      .set({ isActive: false })
      .where(eq(agentConfigVersions.agentId, agentId));

    // Set the specified version as active
    const [activatedVersion] = await tx
      .update(agentConfigVersions)
      .set({ isActive: true })
      .where(
        and(
          eq(agentConfigVersions.id, versionId),
          eq(agentConfigVersions.tenantId, tenantId)
        )
      )
      .returning();

    return activatedVersion;
  });
}

/**
 * Get all phone mappings for a tenant
 */
export async function getPhoneMappings(tenantId: string) {
  const mappings = await db
    .select({
      phoneNumber: phoneMappings.phoneNumber,
      agentId: phoneMappings.agentId,
      agentName: agents.name,
      createdAt: phoneMappings.createdAt,
      updatedAt: phoneMappings.updatedAt,
    })
    .from(phoneMappings)
    .leftJoin(agents, eq(phoneMappings.agentId, agents.id))
    .where(eq(phoneMappings.tenantId, tenantId))
    .orderBy(phoneMappings.phoneNumber);

  return mappings;
}

/**
 * Get phone mappings for a specific agent
 */
export async function getAgentPhoneMappings(agentId: string, tenantId: string) {
  const mappings = await db.query.phoneMappings.findMany({
    where: and(
      eq(phoneMappings.agentId, agentId),
      eq(phoneMappings.tenantId, tenantId)
    ),
    orderBy: [phoneMappings.phoneNumber],
  });

  return mappings;
}

/**
 * Create a new phone mapping
 */
export async function createPhoneMapping(
  phoneNumber: string,
  agentId: string | null,
  tenantId: string
) {
  const [mapping] = await db
    .insert(phoneMappings)
    .values({
      phoneNumber,
      agentId,
      tenantId,
    })
    .returning();

  return mapping;
}

/**
 * Update a phone mapping
 */
export async function updatePhoneMapping(
  phoneNumber: string,
  agentId: string | null,
  tenantId: string
) {
  const [mapping] = await db
    .update(phoneMappings)
    .set({
      agentId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(phoneMappings.phoneNumber, phoneNumber),
        eq(phoneMappings.tenantId, tenantId)
      )
    )
    .returning();

  return mapping;
}

/**
 * Delete a phone mapping
 */
export async function deletePhoneMapping(phoneNumber: string, tenantId: string) {
  const [mapping] = await db
    .delete(phoneMappings)
    .where(
      and(
        eq(phoneMappings.phoneNumber, phoneNumber),
        eq(phoneMappings.tenantId, tenantId)
      )
    )
    .returning();

  return mapping;
}

/**
 * Check if a phone number is already mapped
 */
export async function isPhoneNumberMapped(
  phoneNumber: string,
  tenantId: string
): Promise<boolean> {
  const mapping = await db.query.phoneMappings.findFirst({
    where: and(
      eq(phoneMappings.phoneNumber, phoneNumber),
      eq(phoneMappings.tenantId, tenantId)
    ),
  });

  return !!mapping;
}
