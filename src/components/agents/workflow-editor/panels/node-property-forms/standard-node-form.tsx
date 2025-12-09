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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronRight, Database, Cpu } from 'lucide-react';
import type { WorkflowNodeData } from '../../utils/json-converter';
import { useLlmModelsDropdown } from '@/lib/hooks/use-llm-configs';
import { useActionTypes } from '@/lib/hooks/use-workflow-config-types';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { TransitionConditionEditor } from './transition-condition-editor';
import { IntentEditor } from './intent-editor';

interface TargetNodeOption {
  id: string;
  name: string;
}

interface StandardNodeFormProps {
  nodeData: WorkflowNodeData;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
  availableTargetNodes: TargetNodeOption[];
}

export function StandardNodeForm({ nodeData, onUpdate, availableTargetNodes }: StandardNodeFormProps) {
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

  // RAG Override Settings
  // Track if user has touched RAG settings (to know when to save)
  const [ragTouched, setRagTouched] = useState(
    nodeData.rag !== undefined && nodeData.rag !== null
  );
  // Override enabled controls showing/saving tuning params (off by default)
  const [ragOverrideEnabled, setRagOverrideEnabled] = useState(
    // Only enable if existing config has tuning params (more than just enabled)
    nodeData.rag !== undefined &&
    nodeData.rag !== null &&
    (nodeData.rag.search_mode !== undefined || nodeData.rag.top_k !== undefined)
  );
  const [ragEnabled, setRagEnabled] = useState(nodeData.rag?.enabled ?? false);
  const [ragSearchMode, setRagSearchMode] = useState(nodeData.rag?.search_mode || 'hybrid');
  const [ragTopK, setRagTopK] = useState(nodeData.rag?.top_k ?? 5);
  const [ragRrfK, setRagRrfK] = useState(nodeData.rag?.rrf_k ?? 60);
  const [ragVectorWeight, setRagVectorWeight] = useState(nodeData.rag?.vector_weight ?? 0.6);
  const [ragFtsWeight, setRagFtsWeight] = useState(nodeData.rag?.fts_weight ?? 0.4);
  const [ragCollapsibleOpen, setRagCollapsibleOpen] = useState(false);

  // LLM Override Settings
  const [llmOverrideEnabled, setLlmOverrideEnabled] = useState(
    nodeData.llm_override !== undefined && nodeData.llm_override !== null
  );
  const [llmModelName, setLlmModelName] = useState(nodeData.llm_override?.model_name || '');
  const [llmTemperature, setLlmTemperature] = useState(nodeData.llm_override?.temperature ?? 1.0);
  const [llmMaxTokens, setLlmMaxTokens] = useState(nodeData.llm_override?.max_tokens ?? 150);
  const [llmServiceTier, setLlmServiceTier] = useState(nodeData.llm_override?.service_tier || 'auto');
  const [llmCollapsibleOpen, setLlmCollapsibleOpen] = useState(false);

  // Intent-based transitions
  const [intents, setIntents] = useState<Record<string, { description: string; examples?: string[] }>>(
    nodeData.intents || {}
  );
  const [intentConfig, setIntentConfig] = useState(nodeData.intent_config || {});

  // Fetch available LLM models
  const { data: llmModels = [] } = useLlmModelsDropdown();

  // Fetch workflow config types for autocomplete
  const { data: actionTypes = [], isLoading: actionsLoading } = useActionTypes();

  const actionSuggestions = actionTypes.map((a) => ({
    value: a.value,
    displayName: a.displayName,
    description: a.description,
    examples: a.examples,
    isPatternBased: a.isPatternBased,
  }));

  // Apply changes immediately
  // Note: onUpdate is intentionally excluded from deps to prevent infinite loops
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

    // Add RAG configuration if user has touched RAG settings
    if (ragTouched) {
      if (ragOverrideEnabled) {
        // Include full tuning params when override is enabled
        updates.rag = {
          enabled: ragEnabled,
          search_mode: ragSearchMode,
          top_k: ragTopK,
          rrf_k: ragRrfK,
          vector_weight: ragVectorWeight,
          fts_weight: ragFtsWeight,
        };
      } else {
        // Only save basic enabled state when override is off
        updates.rag = {
          enabled: ragEnabled,
        };
      }
    } else {
      updates.rag = undefined;
    }

    // Add LLM configuration if override is enabled
    if (llmOverrideEnabled) {
      updates.llm_override = {
        model_name: llmModelName || undefined,
        temperature: llmTemperature,
        max_tokens: llmMaxTokens,
        service_tier: llmServiceTier as 'auto' | 'default' | 'flex',
      };
    } else {
      updates.llm_override = undefined;
    }

    // Add intents if any are defined
    if (Object.keys(intents).length > 0) {
      updates.intents = intents;
      updates.intent_config = Object.keys(intentConfig).length > 0 ? intentConfig : undefined;
    } else {
      updates.intents = undefined;
      updates.intent_config = undefined;
    }

    onUpdate(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    mode,
    staticText,
    systemPrompt,
    interruptionsEnabled,
    transitions,
    onEntryActions,
    onExitActions,
    ragTouched,
    ragOverrideEnabled,
    ragEnabled,
    ragSearchMode,
    ragTopK,
    ragRrfK,
    ragVectorWeight,
    ragFtsWeight,
    llmOverrideEnabled,
    llmModelName,
    llmTemperature,
    llmMaxTokens,
    llmServiceTier,
    intents,
    intentConfig,
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

  const updateTransition = (index: number, updates: Partial<{ target: string; condition: string; priority: number }>) => {
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
    <div className="h-full overflow-y-auto [scrollbar-gutter:stable]">
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
                Defines the AI&apos;s behavior and role in this conversation step.
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
                    <Select
                      value={transition.target}
                      onValueChange={(value) =>
                        updateTransition(index, { target: value })
                      }
                    >
                      <SelectTrigger className="mt-1.5 h-8 text-sm">
                        <SelectValue placeholder="Select target node" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargetNodes.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name} ({node.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <TransitionConditionEditor
                    condition={transition.condition}
                    onChange={(value) =>
                      updateTransition(index, { condition: value })
                    }
                    nodeType="standard"
                    availableIntents={Object.keys(intents)}
                  />

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

        {/* Intents for Intent-Based Transitions */}
        <IntentEditor
          intents={intents}
          intentConfig={intentConfig}
          onIntentsChange={setIntents}
          onIntentConfigChange={setIntentConfig}
        />

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
                    <AutocompleteInput
                      suggestions={actionSuggestions}
                      value={action}
                      onChange={(value) => updateOnEntryAction(index, value)}
                      placeholder="log:message, webhook:url, hangup"
                      className="h-8 text-sm flex-1"
                      isLoading={actionsLoading}
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
                    <AutocompleteInput
                      suggestions={actionSuggestions}
                      value={action}
                      onChange={(value) => updateOnExitAction(index, value)}
                      placeholder="log:message, webhook:url, hangup"
                      className="h-8 text-sm flex-1"
                      isLoading={actionsLoading}
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

        <Separator />

        {/* RAG Configuration */}
        <div className="space-y-4">
          <Collapsible open={ragCollapsibleOpen} onOpenChange={setRagCollapsibleOpen}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    {ragCollapsibleOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Label className="cursor-pointer" onClick={() => setRagCollapsibleOpen(!ragCollapsibleOpen)}>
                  <Database className="h-4 w-4 inline mr-2" />
                  Enable RAG
                </Label>
              </div>
              <Switch
                checked={ragEnabled}
                onCheckedChange={(checked) => {
                  setRagEnabled(checked);
                  // Mark RAG settings as touched to save the state
                  setRagTouched(true);
                }}
              />
            </div>

            <CollapsibleContent className="space-y-4 mt-4">
              <div className="p-3 border rounded-lg bg-muted/50 space-y-4">
                <p className="text-xs text-muted-foreground">
                  {ragEnabled
                    ? 'RAG is enabled for this node. Toggle Override Settings below to customize search parameters.'
                    : 'RAG is disabled for this node. Toggle the switch to enable knowledge base retrieval.'}
                </p>

                {/* RAG Override Toggle - only show when RAG is enabled */}
                {ragEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Override Settings</Label>
                        <p className="text-xs text-muted-foreground">
                          Customize search parameters for this node
                        </p>
                      </div>
                      <Switch
                        checked={ragOverrideEnabled}
                        onCheckedChange={setRagOverrideEnabled}
                      />
                    </div>

                    {/* RAG Tuning Options - only show when override is enabled */}
                    {ragOverrideEnabled && (
                      <>
                        <Separator />

                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Search Mode</Label>
                            <Select value={ragSearchMode} onValueChange={setRagSearchMode}>
                              <SelectTrigger className="h-8 mt-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vector">Vector (Semantic)</SelectItem>
                                <SelectItem value="fts">FTS (Keyword)</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Top K Results</Label>
                            <Input
                              type="number"
                              min="1"
                              max="50"
                              value={ragTopK}
                              onChange={(e) => setRagTopK(parseInt(e.target.value) || 5)}
                              className="h-8 mt-1.5"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Number of chunks (1-50)
                            </p>
                          </div>
                        </div>

                        {ragSearchMode === 'hybrid' && (
                          <>
                            <Separator />
                            <div className="text-xs font-medium">Hybrid Search Weights</div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">RRF K</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="200"
                                  value={ragRrfK}
                                  onChange={(e) => setRagRrfK(parseInt(e.target.value) || 60)}
                                  className="h-8 mt-1.5"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Vector Weight</Label>
                                <Input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max="1"
                                  value={ragVectorWeight}
                                  onChange={(e) => setRagVectorWeight(parseFloat(e.target.value) || 0.6)}
                                  className="h-8 mt-1.5"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">FTS Weight</Label>
                                <Input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max="1"
                                  value={ragFtsWeight}
                                  onChange={(e) => setRagFtsWeight(parseFloat(e.target.value) || 0.4)}
                                  className="h-8 mt-1.5"
                                />
                              </div>
                            </div>

                            {/* Weight validation warning */}
                            {Math.abs((ragVectorWeight + ragFtsWeight) - 1.0) > 0.01 && (
                              <div className="rounded border border-yellow-500/50 bg-yellow-500/10 p-2">
                                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                                  <strong>Warning:</strong> Weights should sum to 1.0. Current: {(ragVectorWeight + ragFtsWeight).toFixed(2)}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <Separator />

        {/* LLM Override Configuration */}
        <div className="space-y-4">
          <Collapsible open={llmCollapsibleOpen} onOpenChange={setLlmCollapsibleOpen}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    {llmCollapsibleOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Label className="cursor-pointer" onClick={() => setLlmCollapsibleOpen(!llmCollapsibleOpen)}>
                  <Cpu className="h-4 w-4 inline mr-2" />
                  LLM Overrides
                </Label>
              </div>
              <Switch
                checked={llmOverrideEnabled}
                onCheckedChange={setLlmOverrideEnabled}
              />
            </div>

            <CollapsibleContent className="space-y-4 mt-4">
              {llmOverrideEnabled && (
                <>
                  <div className="p-3 border rounded-lg bg-muted/50 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Override global LLM settings for this node only. Useful for different complexity levels.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Model</Label>
                        <Select
                          value={llmModelName || '__global_default__'}
                          onValueChange={(value) => setLlmModelName(value === '__global_default__' ? '' : value)}
                        >
                          <SelectTrigger className="h-8 mt-1.5">
                            <SelectValue placeholder="Use global default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__global_default__">Use global default</SelectItem>
                            {llmModels.map((model) => (
                              <SelectItem key={model.modelName} value={model.modelName}>
                                {model.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty to use agent&apos;s default model
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs">Temperature ({llmTemperature.toFixed(2)})</Label>
                        <Input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={llmTemperature}
                          onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
                          className="h-8 mt-1.5"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Deterministic (0.0)</span>
                          <span>Creative (2.0)</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Max Tokens</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10000"
                          value={llmMaxTokens}
                          onChange={(e) => setLlmMaxTokens(parseInt(e.target.value) || 150)}
                          className="h-8 mt-1.5"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum response length (1-10000)
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs">Service Tier</Label>
                        <Select value={llmServiceTier} onValueChange={(value) => setLlmServiceTier(value as 'auto' | 'default' | 'flex')}>
                          <SelectTrigger className="h-8 mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto (OpenAI manages)</SelectItem>
                            <SelectItem value="default">Default (Standard tier)</SelectItem>
                            <SelectItem value="flex">Flex (Cost optimization)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
