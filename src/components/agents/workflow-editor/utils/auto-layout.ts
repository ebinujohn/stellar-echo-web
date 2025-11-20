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
    nodeWidth = 250,
    nodeHeight = 150,
    ranksep = 100,
    nodesep = 80,
  } = options;

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph configuration
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep,
    nodesep,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
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

    // Calculate position (dagre uses center, ReactFlow uses top-left)
    const x = nodeWithPosition.x - nodeWidth / 2;
    const y = nodeWithPosition.y - nodeHeight / 2;

    return {
      ...node,
      position: { x, y },
    };
  });

  return layoutedNodes;
}

/**
 * Get dimensions for different node types
 */
export function getNodeDimensions(nodeType: string): { width: number; height: number } {
  switch (nodeType) {
    case 'standardNode':
      return { width: 280, height: 180 };
    case 'retrieveVariableNode':
      return { width: 280, height: 200 };
    case 'endCallNode':
      return { width: 200, height: 120 };
    default:
      return { width: 250, height: 150 };
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
    const { width = 250, height = 150 } = getNodeDimensions(node.type || 'standardNode');
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
