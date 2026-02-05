'use client';

import { useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
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
  Panel,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Wand2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Keyboard,
  MessageSquare,
  Database,
  PhoneOff,
  ArrowDownToLine,
  ArrowRightToLine,
  ArrowRightLeft,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import type { WorkflowNodeData } from './utils/json-converter';
import { workflowToNodes, nodesToWorkflow, validateWorkflowGraph } from './utils/json-converter';
import { getLayoutedNodes } from './utils/auto-layout';
import type { WorkflowConfig } from '@/lib/validations/agents';
import { PropertiesPanel } from './panels/properties-panel';
import { useAgentDraft } from '../contexts/agent-draft-context';

interface WorkflowEditorLayoutProps {
  initialConfig?: WorkflowConfig;
  onSave?: (config: Partial<WorkflowConfig>) => void | Promise<void>;
  agentId?: string;
}

// Safe hook to get draft context (returns null if not in provider)
function useOptionalAgentDraft() {
  try {
    return useAgentDraft();
  } catch {
    return null;
  }
}

function WorkflowEditorContent({ initialConfig, agentId }: WorkflowEditorLayoutProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isInteractive, setIsInteractive] = useState(true);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Get draft context (optional - component can work without it)
  const draftContext = useOptionalAgentDraft();

  // Track initial state for dirty detection
  const initialStateRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  // Initialize nodes and edges from config with auto-layout
  // If there's a draft, restore from draft instead
  useEffect(() => {
    if (isInitializedRef.current) return;

    if (initialConfig) {
      // Check if we have a draft to restore
      if (draftContext?.workflowDraft) {
        const draftConfig = draftContext.workflowDraft.config as WorkflowConfig;
        const { nodes: draftNodes, edges: draftEdges } = workflowToNodes(draftConfig);
        const layoutedNodes = getLayoutedNodes(draftNodes, draftEdges, {
          direction: layoutDirection,
          nodeWidth: 280,
          nodeHeight: 180,
        });
        setNodes(layoutedNodes);
        setEdges(draftEdges);
        // Store initial state from server for dirty comparison
        const serverConfig = nodesToWorkflow(
          workflowToNodes(initialConfig).nodes,
          workflowToNodes(initialConfig).edges,
          initialConfig
        );
        initialStateRef.current = JSON.stringify(serverConfig);
      } else {
        const { nodes: initialNodes, edges: initialEdges } = workflowToNodes(initialConfig);

        // Apply auto-layout immediately for better initial presentation
        const layoutedNodes = getLayoutedNodes(initialNodes, initialEdges, {
          direction: layoutDirection,
          nodeWidth: 280,
          nodeHeight: 180,
        });

        setNodes(layoutedNodes);
        setEdges(initialEdges);

        // Store initial state for dirty comparison
        const currentConfig = nodesToWorkflow(layoutedNodes, initialEdges, initialConfig);
        initialStateRef.current = JSON.stringify(currentConfig);
      }
      isInitializedRef.current = true;
    }
  }, [initialConfig, setNodes, setEdges, draftContext?.workflowDraft, layoutDirection]);

  // Sync edges to node.data.transitions whenever edges change
  // This ensures node labels and properties panel stay in sync with canvas
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        // Build transitions from current edges for this node
        const nodeEdges = edges.filter((e) => e.source === node.id);
        const transitions = nodeEdges.map((e) => ({
          target: e.target,
          condition: e.data?.condition || e.label?.toString() || 'always',
          priority: e.data?.priority || 0,
        }));

        // Compare with current transitions to avoid unnecessary updates
        const currentTransitions = node.data.transitions || [];
        const isSame =
          transitions.length === currentTransitions.length &&
          transitions.every((t, i) => {
            const curr = currentTransitions[i];
            return (
              curr &&
              t.target === curr.target &&
              t.condition === curr.condition &&
              t.priority === curr.priority
            );
          });

        if (isSame) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            transitions,
          },
        };
      })
    );
  }, [edges, setNodes]);

  // Sync current state to draft context and track dirty state
  // Use a ref for draftContext to avoid circular updates
  const draftContextRef = useRef(draftContext);
  useEffect(() => {
    draftContextRef.current = draftContext;
  }, [draftContext]);

  useEffect(() => {
    if (!isInitializedRef.current || !initialConfig || nodes.length === 0) return;

    // Build current config from nodes and edges
    const currentConfig = nodesToWorkflow(nodes, edges, initialConfig);
    const currentState = JSON.stringify(currentConfig);

    // Check if dirty (different from initial state)
    const isDirty = currentState !== initialStateRef.current;

    // Update draft context if available
    if (draftContextRef.current) {
      draftContextRef.current.setIsWorkflowDirty(isDirty);
      if (isDirty) {
        draftContextRef.current.setWorkflowDraft({
          config: currentConfig,
          serializedState: currentState,
        });
      } else {
        // Clear draft if back to initial state
        draftContextRef.current.setWorkflowDraft(null);
      }
    }
  }, [nodes, edges, initialConfig]);

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      setSelectedNode(node);
      setSelectedEdge(null); // Deselect edge when selecting node
    },
    []
  );

  // Handle edge selection
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge);
      setSelectedNode(null); // Deselect node when selecting edge
    },
    []
  );

  // Handle pane click (canvas background)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle connection creation
  // Note: The useEffect above will sync the new edge to node.data.transitions
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: Edge = {
        id: `${connection.source}-${connection.target}-${edges.length}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
        type: 'deletable',
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
  const handleAutoLayout = useCallback((direction?: 'TB' | 'LR') => {
    const dir = direction ?? layoutDirection;
    const layoutedNodes = getLayoutedNodes(nodes, edges, {
      direction: dir,
      nodeWidth: 280,
      nodeHeight: 180,
    });
    setNodes(layoutedNodes);
    toast.success(`${dir === 'TB' ? 'Vertical' : 'Horizontal'} layout applied`);
  }, [nodes, edges, setNodes, layoutDirection]);

  // Toggle layout direction and re-apply layout
  const handleToggleDirection = useCallback(() => {
    const newDirection = layoutDirection === 'TB' ? 'LR' : 'TB';
    setLayoutDirection(newDirection);
    handleAutoLayout(newDirection);
  }, [layoutDirection, handleAutoLayout]);

  // Generate unique node ID
  const generateNodeId = useCallback((type: string) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${type}_${timestamp}_${random}`;
  }, []);

  // Handle drag over (required for drop to work)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop to create new node
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeId = generateNodeId(nodeType);

      // Create new node with default data based on type
      const newNode: Node<WorkflowNodeData> = {
        id: nodeId,
        type: getReactFlowNodeType(nodeType),
        position,
        data: getDefaultNodeData(nodeId, nodeType),
      };

      setNodes((nds) => nds.concat(newNode));
      toast.success(`Added ${nodeType} node`);
    },
    [screenToFlowPosition, generateNodeId, setNodes]
  );

  // Handle node deletion
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );

      // Close properties panel if deleted node was selected
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }

      toast.success('Node deleted');
    },
    [setNodes, setEdges, selectedNode]
  );

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

      // Sync transitions from panel to edges
      if (updates.transitions !== undefined) {
        const newTransitions = updates.transitions || [];

        setEdges((eds) => {
          // Remove existing edges from this node
          const otherEdges = eds.filter((e) => e.source !== nodeId);

          // Create new edges from the updated transitions
          const newEdges: Edge[] = newTransitions.map((transition, idx) => ({
            id: `${nodeId}-${transition.target}-${idx}`,
            source: nodeId,
            target: transition.target,
            type: 'deletable',
            label: transition.condition,
            animated: (transition.priority ?? 0) > 5,
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
          }));

          return [...otherEdges, ...newEdges];
        });
      }
    },
    [setNodes, setEdges]
  );

  // Calculate validation counts
  const validationCounts = useMemo(() => {
    if (!validationResult) return null;
    return {
      errors: validationResult.errors.length,
      warnings: 0, // We can add warnings later
    };
  }, [validationResult]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input (except for Ctrl/Cmd shortcuts)
      const isTyping =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement;

      // Show shortcuts dialog (? key)
      if (event.key === '?' && !isTyping) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // Delete selected node or edge (Delete or Backspace)
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping) {
        event.preventDefault();
        if (selectedNode) {
          handleDeleteNode(selectedNode.id);
        } else if (selectedEdge) {
          setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
          setSelectedEdge(null);
          toast.success('Connection deleted');
        }
      }

      // Note: Ctrl+S removed - use "Save All Changes" button in page header

      // Toggle layout direction (Ctrl/Cmd + Shift + L)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'l') {
        event.preventDefault();
        handleToggleDirection();
        return;
      }

      // Auto layout (Ctrl/Cmd + L)
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        handleAutoLayout();
      }

      // Deselect node or edge (Escape)
      if (event.key === 'Escape') {
        event.preventDefault();
        if (shortcutsOpen) {
          setShortcutsOpen(false);
        } else if (selectedNode) {
          setSelectedNode(null);
        } else if (selectedEdge) {
          setSelectedEdge(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, shortcutsOpen, handleDeleteNode, handleAutoLayout, handleToggleDirection, setEdges]);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Toolbar */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleAutoLayout()}>
              <Wand2 className="mr-2 h-4 w-4" />
              Auto Layout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleDirection}
              title={`Switch to ${layoutDirection === 'TB' ? 'horizontal' : 'vertical'} layout`}
            >
              {layoutDirection === 'TB' ? (
                <ArrowRightToLine className="mr-2 h-4 w-4" />
              ) : (
                <ArrowDownToLine className="mr-2 h-4 w-4" />
              )}
              {layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleValidate}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Validate
            </Button>
            <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Keyboard className="mr-2 h-4 w-4" />
                  Shortcuts
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Keyboard Shortcuts</DialogTitle>
                  <DialogDescription>
                    Speed up your workflow with these keyboard shortcuts
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="font-medium">Auto Layout</div>
                    <div className="text-muted-foreground font-mono">Ctrl/⌘ + L</div>

                    <div className="font-medium">Toggle Layout Direction</div>
                    <div className="text-muted-foreground font-mono">Ctrl/⌘ + Shift + L</div>

                    <div className="font-medium">Delete Node/Connection</div>
                    <div className="text-muted-foreground font-mono">Delete / Backspace</div>

                    <div className="font-medium">Deselect</div>
                    <div className="text-muted-foreground font-mono">Escape</div>

                    <div className="font-medium">Show Shortcuts</div>
                    <div className="text-muted-foreground font-mono">?</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use &quot;Save All Changes&quot; button in the page header to save.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
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

          {/* Save button removed - use "Save All Changes" in page header to save all tabs together */}
        </div>
      </div>

      {/* Main Content: 3-Panel Layout */}
      <div ref={reactFlowWrapper} className="flex flex-1 overflow-hidden">
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
                    icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
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
                    icon={<Database className="h-5 w-5 text-amber-500" />}
                    label="Extract Variables"
                    description="Extract data from conversation"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Integration
                </h4>
                <div className="space-y-2">
                  <NodePaletteItem
                    type="api_call"
                    icon={<Globe className="h-5 w-5 text-green-500" />}
                    label="API Call"
                    description="Make HTTP API requests"
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
                    icon={<PhoneOff className="h-5 w-5 text-red-500" />}
                    label="End Call"
                    description="Terminate the call"
                  />
                  <NodePaletteItem
                    type="agent_transfer"
                    icon={<ArrowRightLeft className="h-5 w-5 text-cyan-500" />}
                    label="Agent Transfer"
                    description="Transfer to another agent"
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
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={isInteractive}
            nodesConnectable={isInteractive}
            elementsSelectable={isInteractive}
            edgesUpdatable={isInteractive}
            edgesFocusable={isInteractive}
            panOnDrag={isInteractive}
            zoomOnScroll={isInteractive}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls showInteractive onInteractiveChange={setIsInteractive} />
            <MiniMap
              className="!bg-card !border !border-border"
              pannable={isInteractive}
              zoomable={isInteractive}
              nodeColor={(node) => {
                if (node.type === 'standardNode') return '#a855f7';
                if (node.type === 'retrieveVariableNode') return '#f59e0b';
                if (node.type === 'endCallNode') return '#ef4444';
                if (node.type === 'agentTransferNode') return '#06b6d4';
                if (node.type === 'apiCallNode') return '#22c55e';
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
        {rightPanelOpen ? (
          <div className="w-[360px] border-l bg-card/30 overflow-hidden transition-all duration-200">
            <PropertiesPanel
              selectedNode={selectedNode}
              allNodes={nodes}
              onClose={() => setRightPanelOpen(false)}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              currentAgentId={agentId}
            />
          </div>
        ) : (
          <div className="w-10 border-l bg-card/30 flex items-start pt-2 justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setRightPanelOpen(true)}
              title="Open Properties Panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
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

// Wrapper component with ReactFlowProvider
export function WorkflowEditorLayout(props: WorkflowEditorLayoutProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent {...props} />
    </ReactFlowProvider>
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
  icon: ReactNode;
  label: string;
  description: string;
}) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-move"
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">{description}</div>
        </div>
      </div>
    </div>
  );
}

// Helper function to map node type to ReactFlow node type
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
    case 'api_call':
      return 'apiCallNode';
    default:
      return 'standardNode';
  }
}

// Helper function to create default node data based on type
function getDefaultNodeData(id: string, type: string): WorkflowNodeData {
  switch (type) {
    case 'standard':
      return {
        id,
        type: 'standard',
        name: 'New Standard Node',
        system_prompt: 'You are a helpful AI assistant.',
        interruptions_enabled: true,
      };
    case 'retrieve_variable':
      return {
        id,
        type: 'retrieve_variable',
        name: 'New Variable Node',
        variables: [],
      };
    case 'end_call':
      return {
        id,
        type: 'end_call',
        name: 'End Call',
      };
    case 'agent_transfer':
      return {
        id,
        type: 'agent_transfer',
        name: 'Transfer to Agent',
        target_agent_id: '',
        transfer_context: false,
        transfer_message: '',
      };
    case 'api_call':
      return {
        id,
        type: 'api_call',
        name: 'New API Call',
        static_text: '',
        api_call: {
          method: 'GET',
          url: '',
          headers: {},
          timeout_seconds: 30,
          retry: {
            max_retries: 2,
            initial_delay_ms: 500,
            max_delay_ms: 5000,
            backoff_multiplier: 2.0,
          },
          response_extraction: [],
        },
      };
    default:
      return {
        id,
        type: 'standard',
        name: 'New Node',
      };
  }
}
