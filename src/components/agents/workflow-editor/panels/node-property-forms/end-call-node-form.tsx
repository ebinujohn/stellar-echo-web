'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkflowNodeData } from '../../utils/json-converter';

interface EndCallNodeFormProps {
  nodeData: WorkflowNodeData;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
}

export function EndCallNodeForm({ nodeData, onUpdate }: EndCallNodeFormProps) {
  const [name, setName] = useState(nodeData.name || '');

  // Apply changes immediately
  useEffect(() => {
    onUpdate({ name });
  }, [name, onUpdate]);

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

        {/* Info */}
        <div className="space-y-2">
          <div className="text-sm font-medium">End Call Node</div>
          <p className="text-xs text-muted-foreground">
            This is a terminal node. When the workflow reaches this node, the call will
            be ended immediately. No transitions are needed.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> End call nodes do not support transitions or actions.
            They immediately terminate the call flow.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
