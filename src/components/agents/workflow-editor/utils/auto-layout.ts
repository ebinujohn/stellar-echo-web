import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import type { WorkflowNodeData } from './json-converter';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  ranksep?: number;
  nodesep?: number;
}

/**
 * Apply Dagre auto-layout algorithm to workflow nodes
 */
export function getLayoutedNodes(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node<WorkflowNodeData>[] {
  const {
    direction = 'TB',
    nodeWidth: _nodeWidth = 340,
    nodeHeight: _nodeHeight = 180,
    ranksep = 350,  // Increased for better vertical spacing with inline transitions
    nodesep = 280,  // Increased for better horizontal spacing with wider nodes
  } = options;
  // Note: nodeWidth/nodeHeight defaults provided for API but actual dimensions come from getNodeDimensions
  void _nodeWidth;
  void _nodeHeight;

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph configuration with generous spacing for readability
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep,
    nodesep,
    edgesep: 120,   // Edge separation for cleaner routing
    marginx: 120,   // Canvas margin
    marginy: 120,   // Canvas margin
  });

  // Add nodes to dagre graph with proper dimensions per node type
  nodes.forEach((node) => {
    const dimensions = getNodeDimensions(node.type || 'standardNode', node.data);
    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Map dagre positions back to ReactFlow nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = getNodeDimensions(node.type || 'standardNode', node.data);

    // Calculate position (dagre uses center, ReactFlow uses top-left)
    const x = nodeWithPosition.x - dimensions.width / 2;
    const y = nodeWithPosition.y - dimensions.height / 2;

    return {
      ...node,
      position: { x, y },
    };
  });

  return layoutedNodes;
}

/**
 * Get dimensions for different node types, dynamically based on content
 */
export function getNodeDimensions(
  nodeType: string,
  nodeData?: WorkflowNodeData
): { width: number; height: number } {
  const transitionCount = nodeData?.transitions?.length || 0;

  // Transition section height: header (24px) + rows (24px each, max visible 5) + expand button (20px if needed)
  const visibleTransitions = Math.min(transitionCount, 5);
  const transitionSectionHeight = transitionCount > 0
    ? 24 + (visibleTransitions * 24) + (transitionCount > 5 ? 20 : 0)
    : 0;

  switch (nodeType) {
    case 'standardNode':
      // Header (44px) + padding (24px) + badges (28px) + content line-clamp-4 (~72px) + transitions
      return { width: 340, height: 168 + transitionSectionHeight };
    case 'retrieveVariableNode':
      // Header (44px) + padding (24px) + badge (28px) + variables section (~60px) + transitions
      return { width: 340, height: 156 + transitionSectionHeight };
    case 'endCallNode':
      return { width: 220, height: 140 };
    case 'agentTransferNode':
      return { width: 280, height: 180 };
    case 'apiCallNode':
      // Header (44px) + padding (24px) + method badge (28px) + URL (20px) + extractions (20px) + transitions
      return { width: 340, height: 156 + transitionSectionHeight };
    default:
      return { width: 340, height: 168 + transitionSectionHeight };
  }
}

/**
 * Fit workflow to viewport
 */
export function fitNodesToViewport(
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 50
): { zoom: number; x: number; y: number } {
  if (nodes.length === 0) {
    return { zoom: 1, x: 0, y: 0 };
  }

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const nodeWithData = node as Node<WorkflowNodeData>;
    const { width = 340, height = 180 } = getNodeDimensions(
      node.type || 'standardNode',
      nodeWithData.data
    );
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  // Calculate zoom to fit
  const zoomX = (viewportWidth - padding * 2) / width;
  const zoomY = (viewportHeight - padding * 2) / height;
  const zoom = Math.min(zoomX, zoomY, 1); // Max zoom is 1

  // Calculate center offset
  const x = (viewportWidth - width * zoom) / 2 - minX * zoom;
  const y = (viewportHeight - height * zoom) / 2 - minY * zoom;

  return { zoom, x, y };
}

/**
 * Align nodes horizontally or vertically
 */
export function alignNodes(
  nodes: Node[],
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
): Node[] {
  if (nodes.length === 0) return nodes;

  const positions = nodes.map((n) => n.position);

  switch (alignment) {
    case 'left': {
      const minX = Math.min(...positions.map((p) => p.x));
      return nodes.map((node) => ({
        ...node,
        position: { ...node.position, x: minX },
      }));
    }
    case 'center': {
      const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      return nodes.map((node) => ({
        ...node,
        position: { ...node.position, x: avgX },
      }));
    }
    case 'right': {
      const maxX = Math.max(...positions.map((p) => p.x));
      return nodes.map((node) => ({
        ...node,
        position: { ...node.position, x: maxX },
      }));
    }
    case 'top': {
      const minY = Math.min(...positions.map((p) => p.y));
      return nodes.map((node) => ({
        ...node,
        position: { ...node.position, y: minY },
      }));
    }
    case 'middle': {
      const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
      return nodes.map((node) => ({
        ...node,
        position: { ...node.position, y: avgY },
      }));
    }
    case 'bottom': {
      const maxY = Math.max(...positions.map((p) => p.y));
      return nodes.map((node) => ({
        ...node,
        position: { ...node.position, y: maxY },
      }));
    }
    default:
      return nodes;
  }
}

/**
 * Distribute nodes evenly
 */
export function distributeNodes(
  nodes: Node[],
  direction: 'horizontal' | 'vertical',
  spacing: number = 100
): Node[] {
  if (nodes.length < 2) return nodes;

  const sorted = [...nodes].sort((a, b) => {
    if (direction === 'horizontal') {
      return a.position.x - b.position.x;
    } else {
      return a.position.y - b.position.y;
    }
  });

  return sorted.map((node, index) => ({
    ...node,
    position: {
      ...node.position,
      [direction === 'horizontal' ? 'x' : 'y']: index * spacing,
    },
  }));
}
