'use client';

import { useState, useCallback, memo, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
import { Plus, Trash2, ChevronDown, ChevronRight, Brain, Settings2 } from 'lucide-react';
import type { GlobalIntentDraft, GlobalIntentConfigDraft } from './contexts/agent-draft-context';

// ========================================
// Types
// ========================================

interface AvailableNode {
  id: string;
  name: string;
}

interface GlobalIntentsEditorProps {
  intents: Record<string, GlobalIntentDraft>;
  config: GlobalIntentConfigDraft;
  availableNodes: AvailableNode[];
  onIntentsChange: (intents: Record<string, GlobalIntentDraft>) => void;
  onConfigChange: (config: GlobalIntentConfigDraft) => void;
}

// ========================================
// Node Multi-Select Component
// ========================================

interface NodeMultiSelectProps {
  label: string;
  description: string;
  selectedNodes: string[] | null;
  availableNodes: AvailableNode[];
  onChange: (nodes: string[] | null) => void;
}

function NodeMultiSelect({
  label,
  description,
  selectedNodes,
  availableNodes,
  onChange,
}: NodeMultiSelectProps) {
  const selectedSet = useMemo(() => new Set(selectedNodes || []), [selectedNodes]);

  const handleToggle = useCallback(
    (nodeId: string) => {
      const newSet = new Set(selectedSet);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      onChange(newSet.size > 0 ? Array.from(newSet) : null);
    },
    [selectedSet, onChange]
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {availableNodes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No nodes available</p>
        ) : (
          availableNodes.map((node) => (
            <Badge
              key={node.id}
              variant={selectedSet.has(node.id) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => handleToggle(node.id)}
            >
              {node.name || node.id}
            </Badge>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ========================================
// Global Intent Card Component
// ========================================

interface GlobalIntentCardProps {
  intentId: string;
  intent: GlobalIntentDraft;
  availableNodes: AvailableNode[];
  onUpdate: (newId: string, newIntent: GlobalIntentDraft) => void;
  onDelete: () => void;
}

const GlobalIntentCard = memo(function GlobalIntentCard({
  intentId,
  intent,
  availableNodes,
  onUpdate,
  onDelete,
}: GlobalIntentCardProps) {
  // Local state for all fields
  const [localId, setLocalId] = useState(intentId);
  const [localDescription, setLocalDescription] = useState(intent.description);
  const [localExamples, setLocalExamples] = useState(intent.examples.join('\n'));
  const [localTargetNode, setLocalTargetNode] = useState(intent.targetNode);
  const [localPriority, setLocalPriority] = useState(intent.priority);
  const [localActiveFromNodes, setLocalActiveFromNodes] = useState<string[] | null>(
    intent.activeFromNodes
  );
  const [localExcludedFromNodes, setLocalExcludedFromNodes] = useState<string[] | null>(
    intent.excludedFromNodes
  );
  const [showAdvanced, setShowAdvanced] = useState(
    !!(intent.activeFromNodes?.length || intent.excludedFromNodes?.length)
  );

  // Parse examples: split by newline, trim, filter empty
  const parseExamples = useCallback((text: string): string[] => {
    return text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  // Sync to parent
  const syncToParent = useCallback(() => {
    const newId = localId.replace(/\s+/g, '_').toLowerCase() || intentId;
    onUpdate(newId, {
      description: localDescription,
      examples: parseExamples(localExamples),
      targetNode: localTargetNode,
      priority: localPriority,
      activeFromNodes: localActiveFromNodes,
      excludedFromNodes: localExcludedFromNodes,
    });
  }, [
    localId,
    intentId,
    localDescription,
    localExamples,
    localTargetNode,
    localPriority,
    localActiveFromNodes,
    localExcludedFromNodes,
    onUpdate,
    parseExamples,
  ]);

  // Handle ID blur
  const handleIdBlur = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  // Handle description blur
  const handleDescriptionBlur = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  // Handle examples blur
  const handleExamplesBlur = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  // Handle target node change (immediate sync)
  const handleTargetNodeChange = useCallback(
    (value: string) => {
      setLocalTargetNode(value);
      onUpdate(localId.replace(/\s+/g, '_').toLowerCase() || intentId, {
        description: localDescription,
        examples: parseExamples(localExamples),
        targetNode: value,
        priority: localPriority,
        activeFromNodes: localActiveFromNodes,
        excludedFromNodes: localExcludedFromNodes,
      });
    },
    [
      localId,
      intentId,
      localDescription,
      localExamples,
      localPriority,
      localActiveFromNodes,
      localExcludedFromNodes,
      onUpdate,
      parseExamples,
    ]
  );

  // Handle priority blur
  const handlePriorityBlur = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  // Handle node list changes (immediate sync)
  const handleActiveFromNodesChange = useCallback(
    (nodes: string[] | null) => {
      setLocalActiveFromNodes(nodes);
      onUpdate(localId.replace(/\s+/g, '_').toLowerCase() || intentId, {
        description: localDescription,
        examples: parseExamples(localExamples),
        targetNode: localTargetNode,
        priority: localPriority,
        activeFromNodes: nodes,
        excludedFromNodes: localExcludedFromNodes,
      });
    },
    [
      localId,
      intentId,
      localDescription,
      localExamples,
      localTargetNode,
      localPriority,
      localExcludedFromNodes,
      onUpdate,
      parseExamples,
    ]
  );

  const handleExcludedFromNodesChange = useCallback(
    (nodes: string[] | null) => {
      setLocalExcludedFromNodes(nodes);
      onUpdate(localId.replace(/\s+/g, '_').toLowerCase() || intentId, {
        description: localDescription,
        examples: parseExamples(localExamples),
        targetNode: localTargetNode,
        priority: localPriority,
        activeFromNodes: localActiveFromNodes,
        excludedFromNodes: nodes,
      });
    },
    [
      localId,
      intentId,
      localDescription,
      localExamples,
      localTargetNode,
      localPriority,
      localActiveFromNodes,
      onUpdate,
      parseExamples,
    ]
  );

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="font-mono text-xs">
          {intentId}
        </Badge>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Intent ID</Label>
          <Input
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            onBlur={handleIdBlur}
            placeholder="appointment_topic"
            className="mt-1.5 h-8 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">Use snake_case (e.g., wants_billing)</p>
        </div>

        <div>
          <Label className="text-xs">Target Node *</Label>
          <Select value={localTargetNode} onValueChange={handleTargetNodeChange}>
            <SelectTrigger className="mt-1.5 h-8">
              <SelectValue placeholder="Select target node" />
            </SelectTrigger>
            <SelectContent>
              {availableNodes.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {node.name || node.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">Node to transition to when matched</p>
        </div>
      </div>

      <div>
        <Label className="text-xs">Description *</Label>
        <Textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="User wants to discuss appointments or scheduling..."
          className="mt-1.5 min-h-[60px] text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Clear description of when this intent should match
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Priority</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={localPriority}
            onChange={(e) => setLocalPriority(parseInt(e.target.value) || 0)}
            onBlur={handlePriorityBlur}
            className="mt-1.5 h-8 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">Higher priority wins when multiple match</p>
        </div>

        <div>
          <Label className="text-xs">Examples</Label>
          <Textarea
            value={localExamples}
            onChange={(e) => setLocalExamples(e.target.value)}
            onBlur={handleExamplesBlur}
            placeholder="appointment&#10;schedule&#10;what to bring"
            className="mt-1.5 min-h-[60px] font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">One example per line</p>
        </div>
      </div>

      {/* Advanced Section */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-auto p-0">
            {showAdvanced ? (
              <ChevronDown className="mr-1 h-3 w-3" />
            ) : (
              <ChevronRight className="mr-1 h-3 w-3" />
            )}
            <span className="text-xs">Advanced</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3">
          <NodeMultiSelect
            label="Active From Nodes"
            description="Only evaluate this intent when in these nodes (whitelist). Leave empty for all nodes."
            selectedNodes={localActiveFromNodes}
            availableNodes={availableNodes}
            onChange={handleActiveFromNodesChange}
          />

          <NodeMultiSelect
            label="Excluded From Nodes"
            description="Never evaluate this intent when in these nodes (blacklist)."
            selectedNodes={localExcludedFromNodes}
            availableNodes={availableNodes}
            onChange={handleExcludedFromNodesChange}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

// ========================================
// Global Intent Config Component
// ========================================

interface GlobalIntentConfigEditorProps {
  config: GlobalIntentConfigDraft;
  onChange: (config: GlobalIntentConfigDraft) => void;
}

const GlobalIntentConfigEditor = memo(function GlobalIntentConfigEditor({
  config,
  onChange,
}: GlobalIntentConfigEditorProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/50 p-3">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4" />
        <Label className="text-xs font-medium">Classification Settings</Label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Confidence Threshold</Label>
          <span className="text-xs text-muted-foreground">
            {(config.confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          value={[config.confidenceThreshold]}
          onValueChange={([value]) => onChange({ ...config, confidenceThreshold: value })}
          min={0}
          max={1}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground">
          Minimum confidence (0-100%) required to trigger an intent
        </p>
      </div>

      <div>
        <Label className="text-xs">Context Messages</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={config.contextMessages}
          onChange={(e) =>
            onChange({ ...config, contextMessages: parseInt(e.target.value) || 4 })
          }
          className="mt-1.5 h-8"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Number of previous messages to include in classification context
        </p>
      </div>
    </div>
  );
});

// ========================================
// Main Component
// ========================================

export function GlobalIntentsEditor({
  intents,
  config,
  availableNodes,
  onIntentsChange,
  onConfigChange,
}: GlobalIntentsEditorProps) {
  const [isOpen, setIsOpen] = useState(Object.keys(intents).length > 0 || config.enabled);

  const intentEntries = Object.entries(intents);

  // Toggle enabled state
  const handleEnabledChange = useCallback(
    (enabled: boolean) => {
      onConfigChange({ ...config, enabled });
    },
    [config, onConfigChange]
  );

  // Add new intent
  const handleAddIntent = useCallback(() => {
    const newId = `intent_${Object.keys(intents).length + 1}`;
    onIntentsChange({
      ...intents,
      [newId]: {
        description: '',
        examples: [],
        targetNode: '',
        priority: 0,
        activeFromNodes: null,
        excludedFromNodes: null,
      },
    });
    setIsOpen(true);
  }, [intents, onIntentsChange]);

  // Update intent
  const handleUpdateIntent = useCallback(
    (oldId: string, newId: string, newIntent: GlobalIntentDraft) => {
      const newIntents = { ...intents };
      if (oldId !== newId) {
        delete newIntents[oldId];
      }
      newIntents[newId] = newIntent;
      onIntentsChange(newIntents);
    },
    [intents, onIntentsChange]
  );

  // Delete intent
  const handleDeleteIntent = useCallback(
    (intentId: string) => {
      const newIntents = { ...intents };
      delete newIntents[intentId];
      onIntentsChange(newIntents);
    },
    [intents, onIntentsChange]
  );

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Enable Global Intents</Label>
          <p className="text-sm text-muted-foreground">
            Evaluate intents on every user input before node-level transitions
          </p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={handleEnabledChange} />
      </div>

      {config.enabled && (
        <>
          {/* Config Section */}
          <GlobalIntentConfigEditor config={config} onChange={onConfigChange} />

          {/* Intents Section */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-auto p-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Label className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                  <Brain className="mr-2 inline h-4 w-4" />
                  Intents ({intentEntries.length})
                </Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddIntent}
                className="h-8"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Intent
              </Button>
            </div>

            <CollapsibleContent className="mt-4 space-y-3">
              {intentEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed py-4 text-center">
                  <p className="text-sm text-muted-foreground">No global intents defined.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add intents that can trigger from any node in the workflow.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Global intents are evaluated on every user input before node-level transitions.
                    First matching intent (with confidence above threshold) triggers a transition.
                  </p>
                  {intentEntries.map(([intentId, intent], index) => (
                    <GlobalIntentCard
                      key={index}
                      intentId={intentId}
                      intent={intent}
                      availableNodes={availableNodes}
                      onUpdate={(newId, newIntent) => handleUpdateIntent(intentId, newId, newIntent)}
                      onDelete={() => handleDeleteIntent(intentId)}
                    />
                  ))}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
