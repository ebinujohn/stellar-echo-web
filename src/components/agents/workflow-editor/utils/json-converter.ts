import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import type { WorkflowConfig, WorkflowNode as ConfigNode, Transition } from '@/lib/validations/agents';

/**
 * Extended config node type that includes position metadata and all possible node fields.
 * This is needed because the discriminated union WorkflowNode doesn't expose all fields at once.
 */
interface ExtendedConfigNode extends Omit<ConfigNode, 'transitions'> {
  _metadata?: { position?: { x: number; y: number } };
  system_prompt?: string;
  static_text?: string;
  variables?: Array<{
    variable_name: string;
    extraction_prompt: string;
    default_value?: string | null;
  }>;
  variable_name?: string;
  extraction_prompt?: string;
  default_value?: string | null;
  interruptions_enabled?: boolean | null;
  transitions?: Transition[];
  actions?: {
    on_entry?: string[];
    on_exit?: string[];
  };
  rag?: {
    enabled?: boolean;
    search_mode?: string;
    top_k?: number;
    rrf_k?: number;
    vector_weight?: number;
    fts_weight?: number;
  };
  llm_override?: {
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
    service_tier?: 'auto' | 'default' | 'flex';
  };
  intents?: Record<string, {
    description: string;
    examples?: string[];
  }>;
  intent_config?: {
    confidence_threshold?: number;
    context_scope?: 'node' | 'conversation';
    context_messages?: number;
  };
  target_agent_id?: string;
  transfer_context?: boolean;
  transfer_message?: string;
}

/**
 * Extended ReactFlow node data with position metadata
 */
export interface WorkflowNodeData {
  id: string;
  type: 'standard' | 'retrieve_variable' | 'end_call' | 'agent_transfer';
  name: string;
  system_prompt?: string;
  static_text?: string;
  variables?: Array<{
    variable_name: string;
    extraction_prompt: string;
    default_value?: string | null;
  }>;
  variable_name?: string;
  extraction_prompt?: string;
  default_value?: string | null;
  interruptions_enabled?: boolean | null;
  transitions?: Array<{
    condition: string;
    target: string;
    priority?: number;
  }>;
  actions?: {
    on_entry?: string[];
    on_exit?: string[];
  };
  rag?: {
    enabled?: boolean;
    search_mode?: string;
    top_k?: number;
    rrf_k?: number;
    vector_weight?: number;
    fts_weight?: number;
  };
  llm_override?: {
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
    service_tier?: 'auto' | 'default' | 'flex';
  };
  // Intent-based transitions (for standard nodes)
  intents?: Record<string, {
    description: string;
    examples?: string[];
  }>;
  intent_config?: {
    confidence_threshold?: number;
    context_scope?: 'node' | 'conversation';
    context_messages?: number;
  };
  // Agent transfer fields (for agent_transfer nodes)
  target_agent_id?: string;
  transfer_context?: boolean;
  transfer_message?: string;
}

/**
 * Extended workflow type to include llm and tts sections that may not be in base type
 */
interface ExtendedWorkflow {
  initial_node: string;
  global_prompt?: string;
  history_window?: number;
  max_transitions?: number;
  interruption_settings?: {
    enabled?: boolean;
    delay_ms?: number;
    resume_prompt?: string;
  };
  recording?: { enabled?: boolean };
  llm?: {
    enabled?: boolean;
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
    service_tier?: 'auto' | 'default' | 'flex';
  };
  tts?: {
    enabled?: boolean;
    voice_name?: string;
    voice_id?: string;
    model?: string;
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
    enable_ssml_parsing?: boolean;
    pronunciation_dictionaries_enabled?: boolean;
    pronunciation_dictionary_ids?: string[];
    aggregate_sentences?: boolean;
  };
  // Global intents - workflow-wide intent definitions
  global_intents?: Record<
    string,
    {
      description: string;
      examples?: string[];
      target_node: string;
      priority?: number;
      active_from_nodes?: string[] | null;
      excluded_from_nodes?: string[] | null;
    }
  >;
  global_intent_config?: {
    enabled?: boolean;
    confidence_threshold?: number;
    context_messages?: number;
  };
  // Post-call analysis configuration
  post_call_analysis?: {
    enabled?: boolean;
    questions?: Array<{
      name: string;
      description?: string;
      type?: 'string' | 'number' | 'enum' | 'boolean';
      choices?: Array<{ value: string; label?: string }>;
      required?: boolean;
    }>;
    additional_instructions?: string;
  };
  nodes: ExtendedConfigNode[];
}

/**
 * Convert workflow config JSON to ReactFlow nodes and edges
 */
export function workflowToNodes(config: WorkflowConfig): {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<WorkflowNodeData>[] = [];
  const edges: Edge[] = [];

  config.workflow.nodes.forEach((node, index) => {
    // Cast to extended type to access all possible fields
    const extNode = node as ExtendedConfigNode;

    // Get stored position or calculate default position
    const position = getNodePosition(extNode, index, config.workflow.nodes.length);

    // Create ReactFlow node
    const reactFlowNode: Node<WorkflowNodeData> = {
      id: node.id,
      type: getReactFlowNodeType(node.type || 'standard'),
      position,
      data: {
        id: node.id,
        type: node.type || 'standard',
        name: node.name,
        system_prompt: extNode.system_prompt,
        static_text: extNode.static_text,
        variables: extNode.variables,
        variable_name: extNode.variable_name,
        extraction_prompt: extNode.extraction_prompt,
        default_value: extNode.default_value,
        interruptions_enabled: extNode.interruptions_enabled,
        transitions: extNode.transitions,
        actions: extNode.actions,
        rag: extNode.rag,
        llm_override: extNode.llm_override,
        intents: extNode.intents,
        intent_config: extNode.intent_config,
        // Agent transfer fields
        target_agent_id: extNode.target_agent_id,
        transfer_context: extNode.transfer_context,
        transfer_message: extNode.transfer_message,
      },
    };

    nodes.push(reactFlowNode);

    // Create edges from transitions
    const nodeTransitions = extNode.transitions;
    if (nodeTransitions && Array.isArray(nodeTransitions)) {
      nodeTransitions.forEach((transition, transIdx) => {
        edges.push({
          id: `${node.id}-${transition.target}-${transIdx}`,
          source: node.id,
          target: transition.target,
          label: transition.condition,
          type: 'deletable',
          animated: !!(transition.priority && transition.priority > 5),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: {
            strokeWidth: 2,
          },
          data: {
            condition: transition.condition,
            priority: transition.priority || 0,
          },
        });
      });
    }
  });

  return { nodes, edges };
}

/**
 * Convert ReactFlow nodes and edges back to workflow config JSON
 */
export function nodesToWorkflow(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  existingConfig?: WorkflowConfig
): Partial<WorkflowConfig> {
  const configNodes: ExtendedConfigNode[] = [];

  // Convert ReactFlow nodes to config nodes
  nodes.forEach((node) => {
    const data = node.data;

    // Build transitions from edges
    const transitions: Transition[] = edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => ({
        condition: (edge.data?.condition as string) || edge.label?.toString() || 'always',
        target: edge.target,
        priority: (edge.data?.priority as number) || 0,
      }));

    // Build config node based on type
    let configNode: ExtendedConfigNode = {
      id: data.id,
      type: data.type,
      name: data.name,
    };

    if (data.type === 'standard') {
      configNode = {
        ...configNode,
        ...(data.system_prompt && { system_prompt: data.system_prompt }),
        ...(data.static_text && { static_text: data.static_text }),
        ...(data.interruptions_enabled !== undefined && data.interruptions_enabled !== null && {
          interruptions_enabled: data.interruptions_enabled,
        }),
        ...(transitions.length > 0 && { transitions }),
        ...(data.actions && { actions: data.actions }),
        ...(data.rag && { rag: data.rag }),
        ...(data.llm_override && { llm_override: data.llm_override }),
        ...(data.intents && Object.keys(data.intents).length > 0 && { intents: data.intents }),
        ...(data.intent_config && { intent_config: data.intent_config }),
      };
    } else if (data.type === 'retrieve_variable') {
      configNode = {
        ...configNode,
        ...(data.variables && { variables: data.variables }),
        ...(data.variable_name && { variable_name: data.variable_name }),
        ...(data.extraction_prompt && { extraction_prompt: data.extraction_prompt }),
        ...(data.default_value !== undefined && { default_value: data.default_value }),
        ...(transitions.length > 0 && { transitions }),
        ...(data.actions && { actions: data.actions }),
      };
    } else if (data.type === 'end_call') {
      // End call nodes only have id, type, and name
      configNode = {
        id: data.id,
        type: 'end_call',
        name: data.name,
      };
    } else if (data.type === 'agent_transfer') {
      // Agent transfer nodes - transfer to another agent
      configNode = {
        id: data.id,
        type: 'agent_transfer',
        name: data.name,
        target_agent_id: data.target_agent_id,
        ...(data.transfer_context && { transfer_context: data.transfer_context }),
        ...(data.transfer_message && { transfer_message: data.transfer_message }),
        ...(data.actions?.on_entry?.length && { actions: { on_entry: data.actions.on_entry } }),
      };
    }

    configNodes.push(configNode);
  });

  // Return updated workflow config
  const workflow = {
    initial_node: existingConfig?.workflow.initial_node || configNodes[0]?.id || 'start',
    ...(existingConfig?.workflow.global_prompt && {
      global_prompt: existingConfig.workflow.global_prompt,
    }),
    ...(existingConfig?.workflow.history_window !== undefined && {
      history_window: existingConfig.workflow.history_window,
    }),
    ...(existingConfig?.workflow.max_transitions && {
      max_transitions: existingConfig.workflow.max_transitions,
    }),
    ...(existingConfig?.workflow.interruption_settings && {
      interruption_settings: existingConfig.workflow.interruption_settings,
    }),
    ...(existingConfig?.workflow.recording && {
      recording: existingConfig.workflow.recording,
    }),
    // Preserve LLM config (lives in workflow.llm per AGENT_JSON_SCHEMA.md)
    ...(() => {
      const extWorkflow = existingConfig?.workflow as ExtendedWorkflow | undefined;
      return extWorkflow?.llm ? { llm: extWorkflow.llm } : {};
    })(),
    // Preserve TTS config (lives in workflow.tts per AGENT_JSON_SCHEMA.md)
    ...(() => {
      const extWorkflow = existingConfig?.workflow as ExtendedWorkflow | undefined;
      return extWorkflow?.tts ? { tts: extWorkflow.tts } : {};
    })(),
    // Preserve Global Intents config
    ...(() => {
      const extWorkflow = existingConfig?.workflow as ExtendedWorkflow | undefined;
      return extWorkflow?.global_intents ? { global_intents: extWorkflow.global_intents } : {};
    })(),
    ...(() => {
      const extWorkflow = existingConfig?.workflow as ExtendedWorkflow | undefined;
      return extWorkflow?.global_intent_config
        ? { global_intent_config: extWorkflow.global_intent_config }
        : {};
    })(),
    // Preserve Post-Call Analysis config
    ...(() => {
      const extWorkflow = existingConfig?.workflow as ExtendedWorkflow | undefined;
      return extWorkflow?.post_call_analysis
        ? { post_call_analysis: extWorkflow.post_call_analysis }
        : {};
    })(),
    nodes: configNodes,
  };

  return {
    ...existingConfig,
    workflow: workflow as unknown as WorkflowConfig['workflow'],
  };
}

/**
 * Get node position (from metadata if stored, otherwise calculate default)
 */
function getNodePosition(
  node: ExtendedConfigNode,
  index: number,
  totalNodes: number
): { x: number; y: number } {
  // Check if position is stored in node metadata
  const metadata = node._metadata;
  if (metadata?.position) {
    return metadata.position;
  }

  // Calculate default grid position with better spacing
  // Note: Auto-layout should be applied after conversion for optimal placement
  const columns = Math.ceil(Math.sqrt(totalNodes));
  const row = Math.floor(index / columns);
  const col = index % columns;

  return {
    x: col * 400 + 100,  // Increased spacing from 300 to 400
    y: row * 300 + 100,  // Increased spacing from 200 to 300
  };
}

/**
 * Map config node type to ReactFlow node type
 */
function getReactFlowNodeType(type: string): string {
  switch (type) {
    case 'standard':
      return 'standardNode';
    case 'retrieve_variable':
      return 'retrieveVariableNode';
    case 'end_call':
      return 'endCallNode';
    case 'agent_transfer':
      return 'agentTransferNode';
    default:
      return 'standardNode';
  }
}

/**
 * Validate that the workflow graph is valid
 */
export function validateWorkflowGraph(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that all nodes have unique IDs
  const nodeIds = nodes.map((n) => n.id);
  const uniqueIds = new Set(nodeIds);
  if (nodeIds.length !== uniqueIds.size) {
    errors.push('Duplicate node IDs found');
  }

  // Check that all edge targets exist
  edges.forEach((edge) => {
    if (!nodeIds.includes(edge.source)) {
      errors.push(`Edge source "${edge.source}" not found`);
    }
    if (!nodeIds.includes(edge.target)) {
      errors.push(`Edge target "${edge.target}" not found`);
    }
  });

  // Check that there's at least one end_call node
  const hasEndCall = nodes.some((node) => node.data.type === 'end_call');
  if (!hasEndCall) {
    errors.push('Workflow must have at least one end_call node');
  }

  // Check that standard nodes have either system_prompt or static_text
  nodes.forEach((node) => {
    if (node.data.type === 'standard') {
      const hasPrompt = !!node.data.system_prompt;
      const hasStatic = !!node.data.static_text;
      if (!hasPrompt && !hasStatic) {
        errors.push(`Node "${node.id}" must have either system_prompt or static_text`);
      }
      if (hasPrompt && hasStatic) {
        errors.push(`Node "${node.id}" cannot have both system_prompt and static_text`);
      }
    }
  });

  // Check that retrieve_variable nodes have required fields
  nodes.forEach((node) => {
    if (node.data.type === 'retrieve_variable') {
      const hasBatchMode = node.data.variables && node.data.variables.length > 0;
      const hasLegacyMode = node.data.variable_name && node.data.extraction_prompt;
      if (!hasBatchMode && !hasLegacyMode) {
        errors.push(
          `Node "${node.id}" must have either variables array or variable_name + extraction_prompt`
        );
      }
    }
  });

  // Check that agent_transfer nodes have target_agent_id
  nodes.forEach((node) => {
    if (node.data.type === 'agent_transfer') {
      if (!node.data.target_agent_id) {
        errors.push(`Agent transfer node "${node.id}" must have a target agent selected`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
