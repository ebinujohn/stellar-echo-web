'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2 } from 'lucide-react';
import type { WorkflowNodeData } from '../../utils/json-converter';

interface RetrieveVariableNodeFormProps {
  nodeData: WorkflowNodeData;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
}

export function RetrieveVariableNodeForm({
  nodeData,
  onUpdate,
}: RetrieveVariableNodeFormProps) {
  const [name, setName] = useState(nodeData.name || '');
  const [variables, setVariables] = useState(nodeData.variables || []);
  const [transitions, setTransitions] = useState(nodeData.transitions || []);

  // Apply changes immediately
  useEffect(() => {
    onUpdate({
      name,
      variables,
      transitions,
    });
  }, [name, variables, transitions, onUpdate]);

  const addVariable = () => {
    setVariables([
      ...variables,
      {
        variable_name: '',
        extraction_prompt: '',
        default_value: null,
      },
    ]);
  };

  const updateVariable = (
    index: number,
    updates: Partial<{
      variable_name: string;
      extraction_prompt: string;
      default_value: string | null;
    }>
  ) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    setVariables(newVariables);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const addTransition = () => {
    setTransitions([
      ...transitions,
      {
        target: '',
        condition: 'always',
        priority: transitions.length,
      },
    ]);
  };

  const updateTransition = (index: number, updates: any) => {
    const newTransitions = [...transitions];
    newTransitions[index] = { ...newTransitions[index], ...updates };
    setTransitions(newTransitions);
  };

  const removeTransition = (index: number) => {
    setTransitions(transitions.filter((_, i) => i !== index));
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="node-name">Node Name</Label>
            <Input
              id="node-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter node name"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Node ID</Label>
            <div className="text-sm text-muted-foreground font-mono mt-1.5">
              {nodeData.id}
            </div>
          </div>
        </div>

        <Separator />

        {/* Variables */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Variables ({variables.length})</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addVariable}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          {variables.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
              No variables defined. Add at least one.
            </div>
          ) : (
            <div className="space-y-3">
              {variables.map((variable, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg space-y-3 bg-card"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Variable {index + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeVariable(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Variable Name</Label>
                    <Input
                      value={variable.variable_name}
                      onChange={(e) =>
                        updateVariable(index, { variable_name: e.target.value })
                      }
                      placeholder="customer_name"
                      className="mt-1.5 h-8 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Extraction Prompt</Label>
                    <Textarea
                      value={variable.extraction_prompt}
                      onChange={(e) =>
                        updateVariable(index, { extraction_prompt: e.target.value })
                      }
                      placeholder="Describe what to extract from the conversation..."
                      className="mt-1.5 text-sm min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Instructions for the LLM on how to extract this variable
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs">Default Value (Optional)</Label>
                    <Input
                      value={variable.default_value || ''}
                      onChange={(e) =>
                        updateVariable(index, {
                          default_value: e.target.value || null,
                        })
                      }
                      placeholder="Default if extraction fails"
                      className="mt-1.5 h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Transitions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Transitions ({transitions.length})</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addTransition}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          {transitions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
              No transitions defined. Add at least one.
            </div>
          ) : (
            <div className="space-y-3">
              {transitions.map((transition, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg space-y-3 bg-card"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Transition {index + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeTransition(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Target Node</Label>
                    <Input
                      value={transition.target}
                      onChange={(e) =>
                        updateTransition(index, { target: e.target.value })
                      }
                      placeholder="Node ID"
                      className="mt-1.5 h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Condition</Label>
                    <Input
                      value={transition.condition}
                      onChange={(e) =>
                        updateTransition(index, { condition: e.target.value })
                      }
                      placeholder="always, success, failure"
                      className="mt-1.5 h-8 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Input
                      type="number"
                      value={transition.priority}
                      onChange={(e) =>
                        updateTransition(index, {
                          priority: parseInt(e.target.value) || 0,
                        })
                      }
                      className="mt-1.5 h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
