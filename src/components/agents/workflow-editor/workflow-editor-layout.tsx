'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { nodeTypes } from './nodes';
import type { WorkflowNodeData } from './utils/json-converter';
import { workflowToNodes, nodesToWorkflow, validateWorkflowGraph } from './utils/json-converter';
import { getLayoutedNodes } from './utils/auto-layout';
import type { WorkflowConfig } from '@/lib/validations/agents';
import { PropertiesPanel } from './panels/properties-panel';

interface WorkflowEditorLayoutProps {
  initialConfig?: WorkflowConfig;
  onSave?: (config: Partial<WorkflowConfig>) => void | Promise<void>;
}

export function WorkflowEditorLayout({ initialConfig, onSave }: WorkflowEditorLayoutProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);

  // Initialize nodes and edges from config with auto-layout
  useEffect(() => {
    if (initialConfig) {
      const { nodes: initialNodes, edges: initialEdges } = workflowToNodes(initialConfig);

      // Apply auto-layout immediately for better initial presentation
      const layoutedNodes = getLayoutedNodes(initialNodes, initialEdges, {
        direction: 'TB',
        nodeWidth: 280,
        nodeHeight: 180,
      });

      setNodes(layoutedNodes);
      setEdges(initialEdges);
    }
  }, [initialConfig, setNodes, setEdges]);

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      setSelectedNode(node);
    },
    []
  );

  // Handle connection creation
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: Edge = {
        id: `${connection.source}-${connection.target}-${edges.length}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
        type: 'smoothstep',
        label: 'always',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 2,
        },
        data: {
          condition: 'always',
          priority: 0,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [edges.length, setEdges]
  );

  // Handle validation
  const handleValidate = useCallback(() => {
    const result = validateWorkflowGraph(nodes, edges);
    setValidationResult(result);

    if (result.valid) {
      toast.success('Workflow is valid!');
    } else {
      toast.error(`Found ${result.errors.length} validation error(s)`);
    }
  }, [nodes, edges]);

  // Handle auto-layout
  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = getLayoutedNodes(nodes, edges, {
      direction: 'TB',
      nodeWidth: 280,
      nodeHeight: 180,
    });
    setNodes(layoutedNodes);
    toast.success('Layout applied');
  }, [nodes, edges, setNodes]);

  // Handle node updates from properties panel
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            };
          }
          return node;
        })
      );

      // Update selected node state
      setSelectedNode((prev) => {
        if (prev && prev.id === nodeId) {
          return {
            ...prev,
            data: {
              ...prev.data,
              ...updates,
            },
          };
        }
        return prev;
      });
    },
    [setNodes]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    // Validate first
    const result = validateWorkflowGraph(nodes, edges);
    if (!result.valid) {
      toast.error('Cannot save: workflow has validation errors');
      setValidationResult(result);
      return;
    }

    setIsSaving(true);
    try {
      const updatedConfig = nodesToWorkflow(nodes, edges, initialConfig);
      await onSave(updatedConfig);
      toast.success('Workflow saved successfully');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, initialConfig, onSave]);

  // Calculate validation counts
  const validationCounts = useMemo(() => {
    if (!validationResult) return null;
    return {
      errors: validationResult.errors.length,
      warnings: 0, // We can add warnings later
    };
  }, [validationResult]);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Toolbar */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAutoLayout}>
              <Wand2 className="mr-2 h-4 w-4" />
              Auto Layout
            </Button>
            <Button variant="outline" size="sm" onClick={handleValidate}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Validate
            </Button>
            {validationCounts && (
              <div className="flex items-center gap-2 text-sm">
                {validationCounts.errors > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {validationCounts.errors} error{validationCounts.errors !== 1 ? 's' : ''}
                  </span>
                )}
                {validationCounts.errors === 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Valid
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Workflow'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Node Palette */}
        <div className="w-[280px] border-r bg-card/30 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-3">Node Palette</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Drag nodes onto the canvas to build your workflow
              </p>
            </div>

            <Separator />

            {/* Node Categories */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Conversation
                </h4>
                <div className="space-y-2">
                  <NodePaletteItem
                    type="standard"
                    icon="💬"
                    label="Standard Node"
                    description="LLM-powered conversation or static text"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Data
                </h4>
                <div className="space-y-2">
                  <NodePaletteItem
                    type="retrieve_variable"
                    icon="📋"
                    label="Extract Variables"
                    description="Extract data from conversation"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Control Flow
                </h4>
                <div className="space-y-2">
                  <NodePaletteItem
                    type="end_call"
                    icon="🛑"
                    label="End Call"
                    description="Terminate the call"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: ReactFlow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap
              className="!bg-card !border !border-border"
              nodeColor={(node) => {
                if (node.type === 'standardNode') return '#a855f7';
                if (node.type === 'retrieveVariableNode') return '#f59e0b';
                if (node.type === 'endCallNode') return '#ef4444';
                return '#64748b';
              }}
            />
            <Panel position="top-center" className="!m-0 !top-2">
              <Card className="px-3 py-1.5 text-sm text-muted-foreground">
                {nodes.length} node{nodes.length !== 1 ? 's' : ''}, {edges.length} connection
                {edges.length !== 1 ? 's' : ''}
              </Card>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Sidebar: Properties Panel */}
        <div
          className={`transition-all duration-200 border-l bg-card/30 overflow-hidden ${
            rightPanelOpen ? 'w-[360px]' : 'w-0'
          }`}
        >
          {rightPanelOpen && (
            <PropertiesPanel
              selectedNode={selectedNode}
              onClose={() => setRightPanelOpen(false)}
              onUpdateNode={handleUpdateNode}
            />
          )}
        </div>

        {/* Toggle button for right panel when closed */}
        {!rightPanelOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={() => setRightPanelOpen(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Validation Errors Panel */}
      {validationResult && !validationResult.valid && (
        <div className="border-t bg-destructive/10 p-4">
          <div className="space-y-2">
            <div className="font-medium text-sm text-destructive">Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
              {validationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Node Palette Item Component
function NodePaletteItem({
  type,
  icon,
  label,
  description,
}: {
  type: string;
  icon: string;
  label: string;
  description: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-move">
      <div className="flex items-start gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">{description}</div>
        </div>
      </div>
    </div>
  );
}
