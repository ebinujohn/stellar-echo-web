import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import type { WorkflowConfig, WorkflowNode as ConfigNode } from '@/lib/validations/agents';

/**
 * Extended ReactFlow node data with position metadata
 */
export interface WorkflowNodeData {
  id: string;
  type: 'standard' | 'retrieve_variable' | 'end_call';
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
    // Get stored position or calculate default position
    const position = getNodePosition(node, index, config.workflow.nodes.length);

    // Create ReactFlow node
    const reactFlowNode: Node<WorkflowNodeData> = {
      id: node.id,
      type: getReactFlowNodeType(node.type || 'standard'),
      position,
      data: {
        id: node.id,
        type: node.type || 'standard',
        name: node.name,
        system_prompt: (node as any).system_prompt,
        static_text: (node as any).static_text,
        variables: (node as any).variables,
        variable_name: (node as any).variable_name,
        extraction_prompt: (node as any).extraction_prompt,
        default_value: (node as any).default_value,
        interruptions_enabled: (node as any).interruptions_enabled,
        transitions: (node as any).transitions,
        actions: (node as any).actions,
        rag: (node as any).rag,
        llm_override: (node as any).llm_override,
        intents: (node as any).intents,
        intent_config: (node as any).intent_config,
      },
    };

    nodes.push(reactFlowNode);

    // Create edges from transitions
    const nodeTransitions = (node as any).transitions;
    if (nodeTransitions && Array.isArray(nodeTransitions)) {
      nodeTransitions.forEach((transition, transIdx) => {
        edges.push({
          id: `${node.id}-${transition.target}-${transIdx}`,
          source: node.id,
          target: transition.target,
          label: transition.condition,
          type: 'deletable',
          animated: transition.priority && transition.priority > 5,
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
  const configNodes: ConfigNode[] = [];

  // Convert ReactFlow nodes to config nodes
  nodes.forEach((node) => {
    const data = node.data;

    // Build transitions from edges
    const transitions = edges
      .filter((edge) => edge.source === node.id)
      .map((edge) => ({
        condition: edge.data?.condition || edge.label?.toString() || 'always',
        target: edge.target,
        priority: edge.data?.priority || 0,
      }));

    // Build config node based on type
    let configNode: any = {
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
    ...(existingConfig && (existingConfig.workflow as any)?.llm && {
      llm: (existingConfig.workflow as any).llm,
    }),
    // Preserve TTS config (lives in workflow.tts per AGENT_JSON_SCHEMA.md)
    ...(existingConfig && (existingConfig.workflow as any)?.tts && {
      tts: (existingConfig.workflow as any).tts,
    }),
    nodes: configNodes,
  };

  return {
    ...existingConfig,
    workflow: workflow as any,
  };
}

/**
 * Get node position (from metadata if stored, otherwise calculate default)
 */
function getNodePosition(
  node: ConfigNode,
  index: number,
  totalNodes: number
): { x: number; y: number } {
  // Check if position is stored in node metadata
  const metadata = (node as any)._metadata;
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

  return {
    valid: errors.length === 0,
    errors,
  };
}
