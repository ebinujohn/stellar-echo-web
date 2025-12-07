'use client';

import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import { ChevronDown, ChevronRight, Plus, X, AlertCircle } from 'lucide-react';
import { useAgents } from '@/lib/hooks/use-agents';
import type { WorkflowNodeData } from '../../utils/json-converter';

interface AgentTransferNodeFormProps {
  nodeData: WorkflowNodeData;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
  currentAgentId?: string;
}

export function AgentTransferNodeForm({
  nodeData,
  onUpdate,
  currentAgentId,
}: AgentTransferNodeFormProps) {
  const [name, setName] = useState(nodeData.name || '');
  const [targetAgentId, setTargetAgentId] = useState(nodeData.target_agent_id || '');
  const [transferContext, setTransferContext] = useState(nodeData.transfer_context || false);
  const [transferMessage, setTransferMessage] = useState(nodeData.transfer_message || '');
  const [onEntryActions, setOnEntryActions] = useState<string[]>(
    nodeData.actions?.on_entry || []
  );
  const [newAction, setNewAction] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);

  // Fetch agents for dropdown
  const { data: agents, isLoading: agentsLoading } = useAgents();

  // Filter out current agent from dropdown
  const availableAgents = useMemo(() => {
    if (!agents) return [];
    return agents.filter((agent) => agent.id !== currentAgentId);
  }, [agents, currentAgentId]);

  // Get selected agent name for display
  const selectedAgentName = useMemo(() => {
    if (!targetAgentId || !agents) return null;
    const agent = agents.find((a) => a.id === targetAgentId);
    return agent?.name || null;
  }, [targetAgentId, agents]);

  // Apply changes immediately
  useEffect(() => {
    onUpdate({
      name,
      target_agent_id: targetAgentId || undefined,
      transfer_context: transferContext,
      transfer_message: transferMessage || undefined,
      actions: onEntryActions.length > 0 ? { on_entry: onEntryActions } : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, targetAgentId, transferContext, transferMessage, onEntryActions]);

  const handleAddAction = () => {
    if (newAction.trim()) {
      setOnEntryActions([...onEntryActions, newAction.trim()]);
      setNewAction('');
    }
  };

  const handleRemoveAction = (index: number) => {
    setOnEntryActions(onEntryActions.filter((_, i) => i !== index));
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

        {/* Target Agent Selection */}
        <div className="space-y-4">
          <div className="text-sm font-medium">Agent Transfer Settings</div>

          <div>
            <Label htmlFor="target-agent">Target Agent *</Label>
            <Select value={targetAgentId} onValueChange={setTargetAgentId}>
              <SelectTrigger id="target-agent" className="mt-1.5">
                <SelectValue placeholder="Select an agent to transfer to" />
              </SelectTrigger>
              <SelectContent>
                {agentsLoading ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    Loading agents...
                  </div>
                ) : availableAgents.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    No other agents available for transfer
                  </div>
                ) : (
                  availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex flex-col">
                        <span>{agent.name}</span>
                        {agent.description && (
                          <span className="text-xs text-muted-foreground">
                            {agent.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!targetAgentId && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                Required: Select a target agent
              </div>
            )}
            {selectedAgentName && (
              <div className="mt-1.5 text-xs text-muted-foreground">
                Selected: <span className="font-medium">{selectedAgentName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label
                htmlFor="transfer-context"
                className="text-sm font-medium cursor-pointer"
              >
                Transfer Conversation Context
              </Label>
              <p className="text-xs text-muted-foreground">
                Pass conversation history to the new agent.
              </p>
            </div>
            <Switch
              id="transfer-context"
              checked={transferContext}
              onCheckedChange={(checked: boolean) => setTransferContext(checked)}
            />
          </div>

          <div>
            <Label htmlFor="transfer-message">Transfer Message (Optional)</Label>
            <Textarea
              id="transfer-message"
              value={transferMessage}
              onChange={(e) => setTransferMessage(e.target.value)}
              placeholder="Message spoken during the transfer handoff..."
              className="mt-1.5"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              This message will be spoken to the user during the transfer.
            </p>
          </div>
        </div>

        <Separator />

        {/* Actions Section */}
        <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-accent/50 rounded-lg px-2 -mx-2">
            {actionsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">On Entry Actions</span>
            {onEntryActions.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {onEntryActions.length}
              </Badge>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <p className="text-xs text-muted-foreground">
              Actions executed when this node is entered. Format: type:value
            </p>

            {/* Existing Actions */}
            {onEntryActions.length > 0 && (
              <div className="space-y-2">
                {onEntryActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <code className="flex-1 text-xs font-mono">{action}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveAction(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Action */}
            <div className="flex gap-2">
              <Input
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="e.g., log:Transfer initiated"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAction();
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddAction}
                disabled={!newAction.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Examples:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>log:Transferring to specialist</li>
                <li>webhook:https://api.example.com/transfer</li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Info Box */}
        <div className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 p-3">
          <p className="text-xs text-cyan-700 dark:text-cyan-400">
            <strong>Agent Transfer Node:</strong> This node transfers the call to another
            agent within the same tenant. The transfer is a &ldquo;warm handoff&rdquo; - the connection
            is maintained while the workflow is swapped. Variables are always transferred;
            conversation history is optional.
          </p>
        </div>
      </div>
    </div>
  );
}
