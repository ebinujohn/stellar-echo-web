'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Save } from 'lucide-react';
import type { WorkflowNodeData } from '../../utils/json-converter';

interface StandardNodeFormProps {
  nodeData: WorkflowNodeData;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
}

export function StandardNodeForm({ nodeData, onUpdate }: StandardNodeFormProps) {
  const [name, setName] = useState(nodeData.name || '');
  const [mode, setMode] = useState<'static' | 'llm'>(
    nodeData.static_text ? 'static' : 'llm'
  );
  const [staticText, setStaticText] = useState(nodeData.static_text || '');
  const [systemPrompt, setSystemPrompt] = useState(nodeData.system_prompt || '');
  const [interruptionsEnabled, setInterruptionsEnabled] = useState(
    nodeData.interruptions_enabled ?? true
  );
  const [transitions, setTransitions] = useState(
    nodeData.transitions || []
  );
  const [onEntryActions, setOnEntryActions] = useState<string[]>(
    nodeData.actions?.on_entry || []
  );
  const [onExitActions, setOnExitActions] = useState<string[]>(
    nodeData.actions?.on_exit || []
  );

  // Apply changes immediately
  useEffect(() => {
    const updates: Partial<WorkflowNodeData> = {
      name,
      interruptions_enabled: interruptionsEnabled,
      transitions,
      actions: {
        on_entry: onEntryActions.length > 0 ? onEntryActions : undefined,
        on_exit: onExitActions.length > 0 ? onExitActions : undefined,
      },
    };

    if (mode === 'static') {
      updates.static_text = staticText;
      updates.system_prompt = undefined;
    } else {
      updates.static_text = undefined;
      updates.system_prompt = systemPrompt;
    }

    onUpdate(updates);
  }, [
    name,
    mode,
    staticText,
    systemPrompt,
    interruptionsEnabled,
    transitions,
    onEntryActions,
    onExitActions,
    onUpdate,
  ]);

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

  const addOnEntryAction = () => {
    setOnEntryActions([...onEntryActions, '']);
  };

  const updateOnEntryAction = (index: number, value: string) => {
    const newActions = [...onEntryActions];
    newActions[index] = value;
    setOnEntryActions(newActions);
  };

  const removeOnEntryAction = (index: number) => {
    setOnEntryActions(onEntryActions.filter((_, i) => i !== index));
  };

  const addOnExitAction = () => {
    setOnExitActions([...onExitActions, '']);
  };

  const updateOnExitAction = (index: number, value: string) => {
    const newActions = [...onExitActions];
    newActions[index] = value;
    setOnExitActions(newActions);
  };

  const removeOnExitAction = (index: number) => {
    setOnExitActions(onExitActions.filter((_, i) => i !== index));
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

        {/* Mode Selection */}
        <div className="space-y-4">
          <Label>Node Mode</Label>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'static' | 'llm')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="static" id="mode-static" />
              <Label htmlFor="mode-static" className="font-normal cursor-pointer">
                Static Text
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="llm" id="mode-llm" />
              <Label htmlFor="mode-llm" className="font-normal cursor-pointer">
                LLM-Powered
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Content Editor */}
        {mode === 'static' ? (
          <div className="space-y-2">
            <Label htmlFor="static-text">Static Text</Label>
            <Textarea
              id="static-text"
              value={staticText}
              onChange={(e) => setStaticText(e.target.value)}
              placeholder="Enter the text to speak..."
              className="min-h-[150px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This text will be spoken exactly as written without LLM processing.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter the system instructions..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Defines the AI's behavior and role in this conversation step.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Interruptions */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Interruptions Enabled</Label>
            <p className="text-xs text-muted-foreground">
              Allow user to interrupt while this node is speaking
            </p>
          </div>
          <Switch
            checked={interruptionsEnabled}
            onCheckedChange={setInterruptionsEnabled}
          />
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
                      placeholder="always, timeout:10, contains:keyword"
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

        <Separator />

        {/* Actions */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>On Entry Actions ({onEntryActions.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addOnEntryAction}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {onEntryActions.length > 0 ? (
              <div className="space-y-2">
                {onEntryActions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={action}
                      onChange={(e) => updateOnEntryAction(index, e.target.value)}
                      placeholder="Action name or webhook URL"
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeOnEntryAction(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2 border rounded-lg border-dashed">
                No on-entry actions defined
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>On Exit Actions ({onExitActions.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addOnExitAction}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {onExitActions.length > 0 ? (
              <div className="space-y-2">
                {onExitActions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={action}
                      onChange={(e) => updateOnExitAction(index, e.target.value)}
                      placeholder="Action name or webhook URL"
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeOnExitAction(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2 border rounded-lg border-dashed">
                No on-exit actions defined
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
