import { z } from 'zod';

/**
 * Schema for creating a new agent
 */
export const createAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(255, 'Agent name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

/**
 * Schema for updating agent metadata
 */
export const updateAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(255, 'Agent name must be less than 255 characters')
    .optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

/**
 * Schema for creating a new config version
 * Note: voiceConfigId is a FK to voice_configs table (voice selection)
 * TTS tuning params are stored in configJson.workflow.tts
 */
export const createVersionSchema = z.object({
  configJson: z.record(z.string(), z.any()), // Full workflow config validation done separately
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  globalPrompt: z.string().nullable().optional(),
  ragEnabled: z.boolean().optional(),
  ragConfigId: z.string().uuid().nullable().optional(),
  voiceConfigId: z.string().uuid().nullable().optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;

/**
 * Phone number validation (E.164 format)
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +17708304765)');

/**
 * Schema for creating a phone mapping
 */
export const createPhoneMappingSchema = z.object({
  phoneNumber: phoneNumberSchema,
  agentId: z.string().uuid('Agent ID must be a valid UUID').nullable(),
});

export type CreatePhoneMappingInput = z.infer<typeof createPhoneMappingSchema>;

/**
 * Schema for updating a phone mapping
 */
export const updatePhoneMappingSchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID').nullable(),
});

export type UpdatePhoneMappingInput = z.infer<typeof updatePhoneMappingSchema>;

// ========================================
// Workflow Configuration Validation
// ========================================

/**
 * Agent metadata schema (from AGENT_JSON_SCHEMA.md)
 */
const agentMetadataSchema = z.object({
  id: z.string().min(1, 'Agent ID is required'),
  name: z.string().min(1, 'Agent name is required'),
  description: z.string().optional(),
  version: z.string().optional().default('1.0.0'),
  tenant_id: z.string().optional(),
});

/**
 * Interruption settings schema
 */
const interruptionSettingsSchema = z.object({
  enabled: z.boolean().optional().default(true),
  delay_ms: z.number().int().min(0).max(5000).optional().default(300),
  resume_prompt: z.string().optional().default('Go ahead'),
});

/**
 * Recording configuration schema
 * Note: Only 'enabled' is per-agent. 'track' and 'channels' are environment variables (system-wide)
 */
const recordingSchema = z.object({
  enabled: z.boolean().optional().default(false),
});

/**
 * Transition condition schema
 */
const transitionSchema = z.object({
  condition: z.string().min(1, 'Condition is required'),
  target: z.string().min(1, 'Target node ID is required'),
  priority: z.number().int().optional().default(0),
});

/**
 * Actions schema
 */
const actionsSchema = z.object({
  on_entry: z.array(z.string()).optional(),
  on_exit: z.array(z.string()).optional(),
});

/**
 * Variable extraction config (for retrieve_variable nodes)
 */
const variableExtractionSchema = z.object({
  variable_name: z.string().min(1, 'Variable name is required'),
  extraction_prompt: z.string().min(1, 'Extraction prompt is required'),
  default_value: z.union([z.string(), z.null()]).optional(),
});

/**
 * RAG configuration schema (per-node override)
 */
const ragConfigSchema = z.object({
  enabled: z.boolean().optional(),
  search_mode: z.enum(['vector', 'fts', 'hybrid']).optional(),
  top_k: z.number().int().min(1).max(50).optional(),
  relevance_filter: z.boolean().optional(),
  faiss_index_path: z.string().optional(),
  faiss_mapping_path: z.string().optional(),
  sqlite_db_path: z.string().optional(),
  rrf_k: z.number().int().optional(),
  vector_weight: z.number().min(0).max(1).optional(),
  fts_weight: z.number().min(0).max(1).optional(),
  hnsw_ef_search: z.number().int().optional(),
  bedrock_model: z.string().optional(),
  bedrock_dimensions: z.number().int().optional(),
});

/**
 * LLM override configuration schema (per-node override)
 * References llm_models.model_name for model selection
 */
const llmOverrideSchema = z.object({
  model_name: z.string().optional(), // References llm_models.model_name (e.g., "gpt4o-mini", "gpt4.1")
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(10000).optional(),
  service_tier: z.enum(['auto', 'default', 'flex']).optional(),
});

/**
 * Base node schema (shared fields)
 */
const baseNodeSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  name: z.string().min(1, 'Node name is required'),
  interruptions_enabled: z.boolean().nullable().optional(),
  transitions: z.array(transitionSchema).optional(),
  actions: actionsSchema.optional(),
});

/**
 * Standard node schema (raw, without refinements)
 */
const standardNodeSchemaBase = baseNodeSchema.extend({
  type: z.literal('standard'),
  system_prompt: z.string().optional(),
  static_text: z.string().optional(),
  rag: ragConfigSchema.optional(),
  llm_override: llmOverrideSchema.optional(),
});

/**
 * Retrieve variable node schema (raw, without refinements)
 */
const retrieveVariableNodeSchemaBase = baseNodeSchema.extend({
  type: z.literal('retrieve_variable'),
  // Batch mode (recommended)
  variables: z.array(variableExtractionSchema).optional(),
  // Legacy mode (single variable)
  variable_name: z.string().optional(),
  extraction_prompt: z.string().optional(),
  default_value: z.union([z.string(), z.null()]).optional(),
});

/**
 * End call node schema
 */
const endCallNodeSchema = baseNodeSchema.extend({
  type: z.literal('end_call'),
});

/**
 * Union of all node types (using discriminatedUnion with base schemas)
 */
const nodeSchema = z.discriminatedUnion('type', [
  standardNodeSchemaBase,
  retrieveVariableNodeSchemaBase,
  endCallNodeSchema,
]);

/**
 * Standard node schema with refinements (for exports)
 */
const standardNodeSchema = standardNodeSchemaBase.refine(
  (data) => {
    // Must have either system_prompt OR static_text, but not both
    const hasSystemPrompt = !!data.system_prompt;
    const hasStaticText = !!data.static_text;
    return (hasSystemPrompt && !hasStaticText) || (!hasSystemPrompt && hasStaticText);
  },
  {
    message: 'Node must have either system_prompt OR static_text, but not both',
  }
);

/**
 * Retrieve variable node schema with refinements (for exports)
 */
const retrieveVariableNodeSchema = retrieveVariableNodeSchemaBase.refine(
  (data) => {
    // Must have either variables array OR variable_name + extraction_prompt
    const hasBatchMode = Array.isArray(data.variables) && data.variables.length > 0;
    const hasLegacyMode = !!data.variable_name && !!data.extraction_prompt;
    return hasBatchMode || hasLegacyMode;
  },
  {
    message: 'retrieve_variable node must have either variables array or variable_name + extraction_prompt',
  }
);

/**
 * LLM configuration schema (workflow.llm section)
 * Note: model_name references llm_models.model_name (e.g., "gpt4.1", "gpt4o-mini")
 * Connection settings (base_url, api_version) are from environment variables
 */
const llmConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  model_name: z.string().optional(), // References llm_models.model_name
  temperature: z.number().min(0).max(2).optional().default(1.0),
  max_tokens: z.number().int().min(1).max(10000).optional().default(150),
  service_tier: z.enum(['auto', 'default', 'flex']).optional().default('auto'),
});

/**
 * TTS configuration schema (workflow.tts section)
 * Per AGENT_JSON_SCHEMA.md:
 * - Voice selection is via voice_config_id FK in database
 * - TTS tuning params (stability, similarity_boost, etc.) are stored in workflow.tts
 */
const ttsConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  voice_name: z.string().optional(), // Used during seeding, ignored at runtime
  voice_id: z.string().optional(),
  model: z.string().optional().default('eleven_turbo_v2_5'),
  stability: z.number().min(0).max(1).optional().default(0.5),
  similarity_boost: z.number().min(0).max(1).optional().default(0.75),
  style: z.number().min(0).max(1).optional().default(0.0),
  use_speaker_boost: z.boolean().optional().default(true),
  enable_ssml_parsing: z.boolean().optional().default(false),
  pronunciation_dictionaries_enabled: z.boolean().optional().default(true),
  pronunciation_dictionary_ids: z.array(z.string()).optional(),
});

/**
 * Workflow configuration schema
 * Note: llm and tts configs are inside workflow section per AGENT_JSON_SCHEMA.md
 */
const workflowSchema = z.object({
  initial_node: z.string().min(1, 'Initial node is required'),
  global_prompt: z.string().optional(),
  history_window: z.number().int().min(0).optional().default(0),
  max_transitions: z.number().int().min(1).max(1000).optional().default(50),
  interruption_settings: interruptionSettingsSchema.optional(),
  recording: recordingSchema.optional(),
  llm: llmConfigSchema.optional(), // LLM config lives in workflow section
  tts: ttsConfigSchema.optional(), // TTS tuning config lives in workflow section (per AGENT_JSON_SCHEMA.md)
  nodes: z.array(nodeSchema).min(1, 'At least one node is required'),
});

/**
 * STT configuration schema
 */
const sttConfigSchema = z.object({
  model: z.string().optional().default('flux-general-en'),
  sample_rate: z.number().int().optional().default(8000),
  eager_eot_threshold: z.number().nullable().optional(),
  eot_threshold: z.number().nullable().optional(),
  eot_timeout_ms: z.number().int().nullable().optional(),
});

/**
 * Auto-hangup configuration schema
 */
const autoHangupSchema = z.object({
  enabled: z.boolean().optional().default(true),
});

/**
 * Base schema for workflow config (without refinements)
 * Used for schema structure validation
 */
const workflowConfigSchemaBase = z.object({
  agent: agentMetadataSchema,
  workflow: workflowSchema,
  // Note: tts, stt, rag at root level are ignored/deprecated
  // llm is now in workflow.llm section, tts is now in workflow.tts section
  auto_hangup: autoHangupSchema.optional(),
  // Allow these deprecated fields to pass through (will be validated by refinements)
  tts: z.any().optional(),
  stt: z.any().optional(),
  llm: z.any().optional(),
  rag: z.any().optional(),
});

/**
 * Complete workflow configuration schema
 * This validates the entire config JSON that goes into agentConfigVersions.configJson
 *
 * Per AGENT_JSON_SCHEMA.md:
 * - LLM config MUST be in workflow.llm section (not root level)
 * - TTS tuning config MUST be in workflow.tts section (not root level)
 * - STT config is environment-based only (not in agent JSON)
 * - RAG config is database-backed (via rag_config_id FK)
 * - Only auto_hangup remains at root level
 */
export const workflowConfigSchema = workflowConfigSchemaBase.refine(
  (data) => {
    // Validation: initial_node must exist in nodes
    const initialNode = data.workflow.initial_node;
    const nodeIds = data.workflow.nodes.map((node) => node.id);
    return nodeIds.includes(initialNode);
  },
  {
    message: 'Initial node must exist in the nodes array',
    path: ['workflow', 'initial_node'],
  }
).refine(
  (data) => {
    // Validation: all node IDs must be unique
    const nodeIds = data.workflow.nodes.map((node) => node.id);
    const uniqueNodeIds = new Set(nodeIds);
    return nodeIds.length === uniqueNodeIds.size;
  },
  {
    message: 'All node IDs must be unique',
    path: ['workflow', 'nodes'],
  }
).refine(
  (data) => {
    // Validation: all transition targets must be valid node IDs
    const nodeIds = new Set(data.workflow.nodes.map((node) => node.id));
    for (const node of data.workflow.nodes) {
      if (node.transitions) {
        for (const transition of node.transitions) {
          if (!nodeIds.has(transition.target)) {
            return false;
          }
        }
      }
    }
    return true;
  },
  {
    message: 'All transition targets must be valid node IDs',
    path: ['workflow', 'nodes'],
  }
).refine(
  (data) => {
    // Validation: must have at least one end_call node
    const hasEndCallNode = data.workflow.nodes.some((node) => node.type === 'end_call');
    return hasEndCallNode;
  },
  {
    message: 'Workflow must have at least one end_call node',
    path: ['workflow', 'nodes'],
  }
).refine(
  (data: Record<string, unknown>) => {
    // Validation: tts at root level is deprecated - should be in workflow.tts
    // Allow empty object or just {enabled: boolean} for backwards compatibility
    if (data.tts && typeof data.tts === 'object') {
      const ttsKeys = Object.keys(data.tts as object);
      // Only reject if tts has more than just 'enabled' (full config at wrong level)
      if (ttsKeys.length > 1 || (ttsKeys.length === 1 && ttsKeys[0] !== 'enabled')) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'TTS configuration must be inside workflow.tts section, not at root level. See AGENT_JSON_SCHEMA.md for correct structure.',
    path: ['tts'],
  }
).refine(
  (data: Record<string, unknown>) => {
    // Validation: llm at root level is not allowed - must be in workflow.llm
    if (data.llm && typeof data.llm === 'object' && Object.keys(data.llm as object).length > 0) {
      return false;
    }
    return true;
  },
  {
    message: 'LLM configuration must be inside workflow.llm section, not at root level. See AGENT_JSON_SCHEMA.md for correct structure.',
    path: ['llm'],
  }
).refine(
  (data: Record<string, unknown>) => {
    // Validation: stt at root level is deprecated - STT is environment-based only
    if (data.stt && typeof data.stt === 'object' && Object.keys(data.stt as object).length > 0) {
      return false;
    }
    return true;
  },
  {
    message: 'STT configuration is environment-based only (DEEPGRAM_MODEL, AUDIO_SAMPLE_RATE). Remove stt from agent config. See AGENT_JSON_SCHEMA.md.',
    path: ['stt'],
  }
).refine(
  (data: Record<string, unknown>) => {
    // Validation: rag at root level is deprecated - RAG is database-backed
    if (data.rag && typeof data.rag === 'object' && Object.keys(data.rag as object).length > 0) {
      return false;
    }
    return true;
  },
  {
    message: 'RAG configuration is database-backed via rag_config_id. Remove rag from agent config. See AGENT_JSON_SCHEMA.md.',
    path: ['rag'],
  }
);

export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;
export type WorkflowNode = z.infer<typeof nodeSchema>;
export type StandardNode = z.infer<typeof standardNodeSchema>;
export type RetrieveVariableNode = z.infer<typeof retrieveVariableNodeSchema>;
export type EndCallNode = z.infer<typeof endCallNodeSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type LlmOverride = z.infer<typeof llmOverrideSchema>;
export type RagOverride = z.infer<typeof ragConfigSchema>;
export type TtsConfig = z.infer<typeof ttsConfigSchema>;

// ========================================
// Validation Helpers
// ========================================

/**
 * Validation result with structured errors and warnings
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
}

export interface ConfigValidationIssue {
  path: string[];
  message: string;
  code: string;
}

/**
 * Validates agent configuration and returns detailed errors and warnings
 * This provides more helpful feedback than just Zod validation
 */
export function validateAgentConfig(config: unknown): ConfigValidationResult {
  const errors: ConfigValidationIssue[] = [];
  const warnings: ConfigValidationIssue[] = [];

  // First, run Zod validation
  const zodResult = workflowConfigSchema.safeParse(config);

  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      errors.push({
        path: issue.path.map(String),
        message: issue.message,
        code: issue.code,
      });
    }
  }

  // Additional semantic checks (warnings and errors not covered by Zod)
  if (typeof config === 'object' && config !== null) {
    const cfg = config as Record<string, unknown>;

    // Check for misplaced tts (warning if only 'enabled', error if full config)
    if (cfg.tts && typeof cfg.tts === 'object') {
      const ttsKeys = Object.keys(cfg.tts as object);
      if (ttsKeys.length === 1 && ttsKeys[0] === 'enabled') {
        // Just enabled flag at root - warn but allow
        warnings.push({
          path: ['tts'],
          message: 'Root-level tts.enabled is deprecated. Move TTS config to workflow.tts section.',
          code: 'deprecated_field',
        });
      }
    }

    // Check if workflow.tts is missing when TTS should be configured
    const workflow = cfg.workflow as Record<string, unknown> | undefined;
    if (workflow && !workflow.tts && cfg.tts) {
      warnings.push({
        path: ['workflow', 'tts'],
        message: 'TTS configuration should be in workflow.tts, not at root level.',
        code: 'misplaced_config',
      });
    }

    // Check for standard nodes missing prompt
    if (workflow?.nodes && Array.isArray(workflow.nodes)) {
      for (let i = 0; i < workflow.nodes.length; i++) {
        const node = workflow.nodes[i] as Record<string, unknown>;
        if (node.type === 'standard' || !node.type) {
          const hasPrompt = !!node.system_prompt || !!node.static_text;
          if (!hasPrompt) {
            errors.push({
              path: ['workflow', 'nodes', String(i)],
              message: `Node '${node.id || `index ${i}`}' must have either system_prompt or static_text`,
              code: 'missing_prompt',
            });
          }
        }
      }
    }

    // Check for intent transitions without intents definition
    if (workflow?.nodes && Array.isArray(workflow.nodes)) {
      for (let i = 0; i < workflow.nodes.length; i++) {
        const node = workflow.nodes[i] as Record<string, unknown>;
        const transitions = node.transitions as Array<{ condition: string }> | undefined;
        if (transitions) {
          const hasIntentTransition = transitions.some(t =>
            typeof t.condition === 'string' && t.condition.startsWith('intent:')
          );
          if (hasIntentTransition && !node.intents) {
            errors.push({
              path: ['workflow', 'nodes', String(i), 'intents'],
              message: `Node '${node.id || `index ${i}`}' has intent-based transitions but no intents defined`,
              code: 'missing_intents',
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formats validation result into a human-readable error message
 */
export function formatValidationErrors(result: ConfigValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('Validation Errors:');
    for (const error of result.errors) {
      const path = error.path.length > 0 ? error.path.join('.') : 'root';
      messages.push(`  - [${path}] ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    messages.push('Warnings:');
    for (const warning of result.warnings) {
      const path = warning.path.length > 0 ? warning.path.join('.') : 'root';
      messages.push(`  - [${path}] ${warning.message}`);
    }
  }

  return messages.join('\n');
}
