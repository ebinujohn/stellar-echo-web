import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { llmModels } from '@/lib/db/schema';

/**
 * Get all active LLM models
 */
export async function getLlmModels() {
  return db.query.llmModels.findMany({
    where: eq(llmModels.isActive, true),
    orderBy: (llmModels, { asc }) => [asc(llmModels.modelName)],
  });
}

/**
 * Get LLM models formatted for dropdown selection
 */
export async function getLlmModelsForDropdown() {
  const models = await db
    .select({
      modelName: llmModels.modelName,
      provider: llmModels.provider,
      description: llmModels.description,
    })
    .from(llmModels)
    .where(eq(llmModels.isActive, true))
    .orderBy(llmModels.modelName);

  return models.map((model) => ({
    modelName: model.modelName,
    displayName: model.modelName,
    description: model.description,
  }));
}
