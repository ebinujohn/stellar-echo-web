import { db } from '@/lib/db';
import { phoneConfigs, phoneConfigMappings } from '@/lib/db/schema/phone-configs';
import { agents } from '@/lib/db/schema/agents';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { tenantFilter, type QueryContext } from './utils';

/**
 * Get all phone configs for a tenant with their agent mappings
 */
export async function getPhoneConfigs(tenantId: string) {
  const configs = await db
    .select({
      id: phoneConfigs.id,
      tenantId: phoneConfigs.tenantId,
      phoneNumber: phoneConfigs.phoneNumber,
      name: phoneConfigs.name,
      description: phoneConfigs.description,
      isActive: phoneConfigs.isActive,
      createdAt: phoneConfigs.createdAt,
      updatedAt: phoneConfigs.updatedAt,
      // Mapping details
      mappingAgentId: phoneConfigMappings.agentId,
      agentName: agents.name,
    })
    .from(phoneConfigs)
    .leftJoin(phoneConfigMappings, eq(phoneConfigs.id, phoneConfigMappings.phoneConfigId))
    .leftJoin(agents, eq(phoneConfigMappings.agentId, agents.id))
    .where(and(eq(phoneConfigs.tenantId, tenantId), eq(phoneConfigs.isActive, true)))
    .orderBy(desc(phoneConfigs.createdAt));

  return configs.map((config) => ({
    id: config.id,
    tenantId: config.tenantId,
    phoneNumber: config.phoneNumber,
    name: config.name,
    description: config.description,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    mapping: config.mappingAgentId
      ? {
          agentId: config.mappingAgentId,
          agentName: config.agentName,
        }
      : null,
  }));
}

/**
 * Get a single phone config with its mapping
 */
export async function getPhoneConfigDetail(phoneConfigId: string, tenantId: string) {
  const results = await db
    .select({
      id: phoneConfigs.id,
      tenantId: phoneConfigs.tenantId,
      phoneNumber: phoneConfigs.phoneNumber,
      name: phoneConfigs.name,
      description: phoneConfigs.description,
      isActive: phoneConfigs.isActive,
      createdAt: phoneConfigs.createdAt,
      updatedAt: phoneConfigs.updatedAt,
      // Mapping details
      mappingAgentId: phoneConfigMappings.agentId,
      agentName: agents.name,
    })
    .from(phoneConfigs)
    .leftJoin(phoneConfigMappings, eq(phoneConfigs.id, phoneConfigMappings.phoneConfigId))
    .leftJoin(agents, eq(phoneConfigMappings.agentId, agents.id))
    .where(and(eq(phoneConfigs.id, phoneConfigId), eq(phoneConfigs.tenantId, tenantId)));

  if (results.length === 0) {
    return null;
  }

  const config = results[0];
  return {
    id: config.id,
    tenantId: config.tenantId,
    phoneNumber: config.phoneNumber,
    name: config.name,
    description: config.description,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    mapping: config.mappingAgentId
      ? {
          agentId: config.mappingAgentId,
          agentName: config.agentName,
        }
      : null,
  };
}

/**
 * Create a new phone config
 */
export async function createPhoneConfig(
  data: {
    phoneNumber: string;
    name?: string;
    description?: string;
    agentId?: string | null;
  },
  tenantId: string
) {
  return await db.transaction(async (tx) => {
    // Create the phone config
    const [newConfig] = await tx
      .insert(phoneConfigs)
      .values({
        phoneNumber: data.phoneNumber,
        name: data.name || null,
        description: data.description || null,
        tenantId,
      })
      .returning();

    // Create mapping if agent is specified
    if (data.agentId) {
      await tx.insert(phoneConfigMappings).values({
        phoneConfigId: newConfig.id,
        agentId: data.agentId,
        tenantId,
      });
    }

    return newConfig;
  });
}

/**
 * Update phone config metadata
 */
export async function updatePhoneConfig(
  phoneConfigId: string,
  data: {
    phoneNumber?: string;
    name?: string;
    description?: string;
    agentId?: string | null;
  },
  tenantId: string
) {
  return await db.transaction(async (tx) => {
    // Update phone config metadata
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.phoneNumber !== undefined) {
      updateData.phoneNumber = data.phoneNumber;
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    const [updatedConfig] = await tx
      .update(phoneConfigs)
      .set(updateData)
      .where(and(eq(phoneConfigs.id, phoneConfigId), eq(phoneConfigs.tenantId, tenantId)))
      .returning();

    // Handle agent mapping update
    if (data.agentId !== undefined) {
      // Delete existing mapping
      await tx.delete(phoneConfigMappings).where(eq(phoneConfigMappings.phoneConfigId, phoneConfigId));

      // Create new mapping if agent is specified
      if (data.agentId) {
        await tx.insert(phoneConfigMappings).values({
          phoneConfigId,
          agentId: data.agentId,
          tenantId,
        });
      }
    }

    return updatedConfig;
  });
}

/**
 * Soft delete a phone config (set isActive = false)
 */
export async function deletePhoneConfig(phoneConfigId: string, tenantId: string) {
  const [deletedConfig] = await db
    .update(phoneConfigs)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(phoneConfigs.id, phoneConfigId), eq(phoneConfigs.tenantId, tenantId)))
    .returning();

  return deletedConfig;
}

/**
 * Check if a phone number already exists for a tenant
 */
export async function isPhoneNumberExists(
  phoneNumber: string,
  tenantId: string,
  excludePhoneConfigId?: string
) {
  const existing = await db.query.phoneConfigs.findFirst({
    where: and(
      eq(phoneConfigs.phoneNumber, phoneNumber),
      eq(phoneConfigs.tenantId, tenantId),
      eq(phoneConfigs.isActive, true),
      excludePhoneConfigId ? eq(phoneConfigs.id, excludePhoneConfigId) : undefined
    ),
  });

  if (excludePhoneConfigId && existing?.id === excludePhoneConfigId) {
    return false;
  }

  return !!existing;
}

/**
 * Get phone configs for dropdown (simplified list)
 */
export async function getPhoneConfigsForDropdown(ctx: QueryContext) {
  const tenantCondition = tenantFilter(phoneConfigs.tenantId, ctx);
  const conditions = [eq(phoneConfigs.isActive, true)];
  if (tenantCondition) conditions.push(tenantCondition);

  const configs = await db.query.phoneConfigs.findMany({
    where: and(...conditions),
    orderBy: [phoneConfigs.phoneNumber],
  });

  return configs.map((config) => ({
    id: config.id,
    phoneNumber: config.phoneNumber,
    name: config.name,
  }));
}

/**
 * Get phone configs mapped to a specific agent
 */
export async function getAgentPhoneConfigs(agentId: string, ctx: QueryContext) {
  const tenantCondition = tenantFilter(phoneConfigs.tenantId, ctx);
  const conditions = [
    eq(phoneConfigMappings.agentId, agentId),
    eq(phoneConfigs.isActive, true),
  ];
  if (tenantCondition) conditions.push(tenantCondition);

  const results = await db
    .select({
      id: phoneConfigs.id,
      phoneNumber: phoneConfigs.phoneNumber,
      name: phoneConfigs.name,
    })
    .from(phoneConfigs)
    .innerJoin(phoneConfigMappings, eq(phoneConfigs.id, phoneConfigMappings.phoneConfigId))
    .where(and(...conditions))
    .orderBy(phoneConfigs.phoneNumber);

  return results;
}

/**
 * Get unmapped phone configs (for agent assignment dropdown)
 */
export async function getUnmappedPhoneConfigs(tenantId: string) {
  const results = await db
    .select({
      id: phoneConfigs.id,
      phoneNumber: phoneConfigs.phoneNumber,
      name: phoneConfigs.name,
    })
    .from(phoneConfigs)
    .leftJoin(phoneConfigMappings, eq(phoneConfigs.id, phoneConfigMappings.phoneConfigId))
    .where(
      and(
        eq(phoneConfigs.tenantId, tenantId),
        eq(phoneConfigs.isActive, true),
        isNull(phoneConfigMappings.agentId)
      )
    )
    .orderBy(phoneConfigs.phoneNumber);

  return results;
}

/**
 * Get agent for a phone number (for call routing)
 */
export async function getAgentForPhoneNumber(phoneNumber: string, tenantId: string) {
  const result = await db
    .select({
      agentId: phoneConfigMappings.agentId,
      agentName: agents.name,
    })
    .from(phoneConfigs)
    .innerJoin(phoneConfigMappings, eq(phoneConfigs.id, phoneConfigMappings.phoneConfigId))
    .innerJoin(agents, eq(phoneConfigMappings.agentId, agents.id))
    .where(
      and(
        eq(phoneConfigs.phoneNumber, phoneNumber),
        eq(phoneConfigs.tenantId, tenantId),
        eq(phoneConfigs.isActive, true)
      )
    )
    .limit(1);

  return result[0] || null;
}
