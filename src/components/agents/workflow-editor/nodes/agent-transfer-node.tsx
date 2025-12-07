import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowRightLeft, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNodeData } from '../utils/json-converter';
import { cn } from '@/lib/utils';

export const AgentTransferNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => {
  const hasTargetAgent = !!data.target_agent_id;
  const isValid = hasTargetAgent;

  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card shadow-md transition-all',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary/20'
          : isValid
            ? 'border-cyan-500/50 hover:border-cyan-500'
            : 'border-destructive',
        'w-[280px]'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-background"
      />

      {/* Header */}
      <div className="border-b border-border bg-cyan-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-cyan-500" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{data.name}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{data.id}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-500">
            Agent Transfer
          </Badge>
          {data.transfer_context && (
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Context
            </Badge>
          )}
        </div>

        {/* Target Agent Display */}
        {hasTargetAgent ? (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Target:</span>{' '}
            <span className="font-mono">{data.target_agent_id?.slice(0, 8)}...</span>
          </div>
        ) : (
          <div className="text-xs text-destructive">
            No target agent selected
          </div>
        )}

        {/* Transfer Message Preview */}
        {data.transfer_message && (
          <div className="text-xs text-muted-foreground line-clamp-2 italic">
            &ldquo;{data.transfer_message}&rdquo;
          </div>
        )}

        {!hasTargetAgent && (
          <div className="text-xs text-muted-foreground">
            Select a target agent in the properties panel.
          </div>
        )}
      </div>

      {/* No output handle - this is a terminal-like node */}
    </div>
  );
});

AgentTransferNode.displayName = 'AgentTransferNode';
