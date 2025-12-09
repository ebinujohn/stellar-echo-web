'use client';

import { useState, useCallback, memo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import { Plus, Trash2, ChevronDown, ChevronRight, Brain } from 'lucide-react';

// ========================================
// Types
// ========================================

interface Intent {
  description: string;
  examples?: string[];
}

interface IntentConfig {
  confidence_threshold?: number;
  context_scope?: 'node' | 'conversation';
  context_messages?: number;
}

interface IntentEditorProps {
  intents: Record<string, Intent>;
  intentConfig: IntentConfig;
  onIntentsChange: (intents: Record<string, Intent>) => void;
  onIntentConfigChange: (config: IntentConfig) => void;
}

// ========================================
// Single Intent Card Component
// ========================================

interface IntentCardProps {
  intentId: string;
  intent: Intent;
  onUpdate: (newId: string, newIntent: Intent) => void;
  onDelete: () => void;
}

/**
 * Memoized single intent card that manages its own local state.
 * Only syncs to parent on blur to prevent re-renders on every keystroke.
 */
const IntentCard = memo(function IntentCard({
  intentId,
  intent,
  onUpdate,
  onDelete,
}: IntentCardProps) {
  // Local state for all fields - prevents re-renders on every keystroke
  const [localId, setLocalId] = useState(intentId);
  const [localDescription, setLocalDescription] = useState(intent.description);
  const [localExamples, setLocalExamples] = useState(intent.examples?.join('\n') || '');

  // Parse examples: split by newline, trim only on save, filter empty
  // Must be defined before callbacks that use it
  const parseExamples = useCallback((text: string): string[] | undefined => {
    const examples = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return examples.length > 0 ? examples : undefined;
  }, []);

  // Sync ID to parent on blur
  const handleIdBlur = useCallback(() => {
    const newId = localId.replace(/\s+/g, '_').toLowerCase() || intentId;
    if (newId !== intentId) {
      onUpdate(newId, { description: localDescription, examples: parseExamples(localExamples) });
    }
  }, [localId, intentId, localDescription, localExamples, onUpdate, parseExamples]);

  // Sync description to parent on blur
  const handleDescriptionBlur = useCallback(() => {
    onUpdate(localId, { description: localDescription, examples: parseExamples(localExamples) });
  }, [localId, localDescription, localExamples, onUpdate, parseExamples]);

  // Sync examples to parent on blur
  const handleExamplesBlur = useCallback(() => {
    onUpdate(localId, { description: localDescription, examples: parseExamples(localExamples) });
  }, [localId, localDescription, localExamples, onUpdate, parseExamples]);

  return (
    <div className="p-3 border rounded-lg space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-mono">
          {intentId}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div>
        <Label className="text-xs">Intent ID</Label>
        <Input
          value={localId}
          onChange={(e) => setLocalId(e.target.value)}
          onBlur={handleIdBlur}
          placeholder="wants_help"
          className="mt-1.5 h-8 text-sm font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use snake_case (e.g., wants_basics, needs_support)
        </p>
      </div>

      <div>
        <Label className="text-xs">Description *</Label>
        <Textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="User wants to learn the basics..."
          className="mt-1.5 text-sm min-h-[60px]"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Describe when this intent should match
        </p>
      </div>

      <div>
        <Label className="text-xs">Examples (Optional)</Label>
        <Textarea
          value={localExamples}
          onChange={(e) => setLocalExamples(e.target.value)}
          onBlur={handleExamplesBlur}
          placeholder={"I want to start with basics\nTell me the fundamentals\nLet's begin from scratch"}
          className="mt-1.5 text-sm min-h-[60px] font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">
          One example per line. Helps LLM understand the intent.
        </p>
      </div>
    </div>
  );
});

// ========================================
// Intent Config Component
// ========================================

interface IntentConfigEditorProps {
  config: IntentConfig;
  onChange: (config: IntentConfig) => void;
}

const IntentConfigEditor = memo(function IntentConfigEditor({
  config,
  onChange,
}: IntentConfigEditorProps) {
  return (
    <div className="p-3 border rounded-lg bg-muted/50 space-y-3">
      <Label className="text-xs font-medium">Intent Classification Settings</Label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Confidence Threshold</Label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={config.confidence_threshold ?? 0.7}
            onChange={(e) =>
              onChange({
                ...config,
                confidence_threshold: parseFloat(e.target.value) || 0.7,
              })
            }
            className="h-8 mt-1.5"
          />
        </div>

        <div>
          <Label className="text-xs">Context Scope</Label>
          <Select
            value={config.context_scope || 'node'}
            onValueChange={(value) =>
              onChange({
                ...config,
                context_scope: value as 'node' | 'conversation',
              })
            }
          >
            <SelectTrigger className="h-8 mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="node">Node (current only)</SelectItem>
              <SelectItem value="conversation">Conversation (with history)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {config.context_scope === 'conversation' && (
        <div>
          <Label className="text-xs">Context Messages</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={config.context_messages ?? 5}
            onChange={(e) =>
              onChange({
                ...config,
                context_messages: parseInt(e.target.value) || 5,
              })
            }
            className="h-8 mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Number of previous messages to include
          </p>
        </div>
      )}
    </div>
  );
});

// ========================================
// Main Intent Editor Component
// ========================================

export function IntentEditor({
  intents,
  intentConfig,
  onIntentsChange,
  onIntentConfigChange,
}: IntentEditorProps) {
  const [isOpen, setIsOpen] = useState(Object.keys(intents).length > 0);

  // Convert intents object to array with stable indices
  const intentEntries = Object.entries(intents);

  // Add new intent
  const handleAddIntent = useCallback(() => {
    const newId = `intent_${Object.keys(intents).length + 1}`;
    onIntentsChange({ ...intents, [newId]: { description: '', examples: [] } });
    setIsOpen(true);
  }, [intents, onIntentsChange]);

  // Update single intent (called on blur from IntentCard)
  const handleUpdateIntent = useCallback(
    (oldId: string, newId: string, newIntent: Intent) => {
      const newIntents = { ...intents };
      if (oldId !== newId) {
        // ID changed - delete old, add new
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <Label
              className="cursor-pointer"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Brain className="h-4 w-4 inline mr-2" />
              Intents ({intentEntries.length})
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddIntent}
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        <CollapsibleContent className="space-y-3 mt-4">
          {intentEntries.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
              <p>No intents defined.</p>
              <p className="text-xs mt-1">
                Add intents to use Intent Match transitions.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Define intents for LLM-based classification. Use these in
                transitions with &quot;Intent Match&quot; condition.
              </p>
              {intentEntries.map(([intentId, intent], index) => (
                <IntentCard
                  // Use index as key for stability - intentId changes shouldn't cause unmount
                  key={index}
                  intentId={intentId}
                  intent={intent}
                  onUpdate={(newId, newIntent) =>
                    handleUpdateIntent(intentId, newId, newIntent)
                  }
                  onDelete={() => handleDeleteIntent(intentId)}
                />
              ))}

              <IntentConfigEditor
                config={intentConfig}
                onChange={onIntentConfigChange}
              />
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
