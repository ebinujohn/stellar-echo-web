'use client';

import { useCallback } from 'react';
import { Node } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { WorkflowNodeData } from '../utils/json-converter';
import { StandardNodeForm } from './node-property-forms/standard-node-form';
import { RetrieveVariableNodeForm } from './node-property-forms/retrieve-variable-node-form';
import { EndCallNodeForm } from './node-property-forms/end-call-node-form';

interface PropertiesPanelProps {
  selectedNode: Node<WorkflowNodeData> | null;
  allNodes: Node<WorkflowNodeData>[];
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
}

export function PropertiesPanel({
  selectedNode,
  allNodes,
  onClose,
  onUpdateNode,
  onDeleteNode,
}: PropertiesPanelProps) {
  // Memoize the update handler to prevent infinite loops
  const handleUpdate = useCallback(
    (updates: Partial<WorkflowNodeData>) => {
      if (selectedNode) {
        onUpdateNode(selectedNode.id, updates);
      }
    },
    [selectedNode, onUpdateNode]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(() => {
    if (selectedNode && confirm(`Delete node "${selectedNode.data.name}"?`)) {
      onDeleteNode(selectedNode.id);
    }
  }, [selectedNode, onDeleteNode]);

  if (!selectedNode) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Properties</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="mb-4" />
        <div className="text-sm text-muted-foreground text-center py-8">
          Select a node to view and edit its properties
        </div>
      </div>
    );
  }

  const renderForm = () => {
    const nodeType = selectedNode.data.type;
    // Get available target nodes (exclude current node)
    const availableTargetNodes = allNodes
      .filter((n) => n.id !== selectedNode.id)
      .map((n) => ({ id: n.data.id, name: n.data.name }));

    switch (nodeType) {
      case 'standard':
        return (
          <StandardNodeForm
            key={selectedNode.id}
            nodeData={selectedNode.data}
            onUpdate={handleUpdate}
            availableTargetNodes={availableTargetNodes}
          />
        );
      case 'retrieve_variable':
        return (
          <RetrieveVariableNodeForm
            key={selectedNode.id}
            nodeData={selectedNode.data}
            onUpdate={handleUpdate}
            availableTargetNodes={availableTargetNodes}
          />
        );
      case 'end_call':
        return <EndCallNodeForm key={selectedNode.id} nodeData={selectedNode.data} onUpdate={handleUpdate} />;
      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Unknown node type: {nodeType}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">Properties</h3>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {selectedNode.data.type.replace('_', ' ')} Node
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete Node
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">{renderForm()}</div>
    </div>
  );
}
