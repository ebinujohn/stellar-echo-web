import { db } from '@/lib/db';
import { workflowConfigTypes, type WorkflowConfigType, type ConfigTypeCategory } from '@/lib/db/schema/workflow-config-types';
import { eq, and, asc } from 'drizzle-orm';

/**
 * Get all workflow config types
 */
export async function getWorkflowConfigTypes(): Promise<WorkflowConfigType[]> {
  const types = await db.query.workflowConfigTypes.findMany({
    where: eq(workflowConfigTypes.isActive, true),
    orderBy: [asc(workflowConfigTypes.category), asc(workflowConfigTypes.displayOrder)],
  });

  return types;
}

/**
 * Get workflow config types by category
 */
export async function getWorkflowConfigTypesByCategory(
  category: ConfigTypeCategory
): Promise<WorkflowConfigType[]> {
  const types = await db.query.workflowConfigTypes.findMany({
    where: and(
      eq(workflowConfigTypes.category, category),
      eq(workflowConfigTypes.isActive, true)
    ),
    orderBy: [asc(workflowConfigTypes.displayOrder)],
  });

  return types;
}

/**
 * Get node types for dropdown
 */
export async function getNodeTypes(): Promise<WorkflowConfigType[]> {
  return getWorkflowConfigTypesByCategory('node_type');
}

/**
 * Get transition conditions for dropdown/autocomplete
 */
export async function getTransitionConditions(): Promise<WorkflowConfigType[]> {
  return getWorkflowConfigTypesByCategory('transition_condition');
}

/**
 * Get action types for dropdown/autocomplete
 */
export async function getActionTypes(): Promise<WorkflowConfigType[]> {
  return getWorkflowConfigTypesByCategory('action_type');
}

/**
 * Get RAG search modes for dropdown
 */
export async function getSearchModes(): Promise<WorkflowConfigType[]> {
  return getWorkflowConfigTypesByCategory('search_mode');
}

/**
 * Get a specific config type by category and value
 */
export async function getWorkflowConfigType(
  category: ConfigTypeCategory,
  value: string
): Promise<WorkflowConfigType | null> {
  const type = await db.query.workflowConfigTypes.findFirst({
    where: and(
      eq(workflowConfigTypes.category, category),
      eq(workflowConfigTypes.value, value),
      eq(workflowConfigTypes.isActive, true)
    ),
  });

  return type || null;
}
