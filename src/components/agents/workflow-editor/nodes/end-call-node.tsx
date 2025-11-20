import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PhoneOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNodeData } from '../utils/json-converter';
import { cn } from '@/lib/utils';

export const EndCallNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card shadow-md transition-all',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary/20'
          : 'border-red-500/50 hover:border-red-500',
        'w-[220px]'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-background"
      />

      {/* Header */}
      <div className="border-b border-border bg-red-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <PhoneOff className="h-4 w-4 text-red-500" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{data.name}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{data.id}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <Badge variant="outline" className="text-xs border-red-500/50 text-red-500">
          End Call
        </Badge>

        <div className="text-xs text-muted-foreground">
          Call will be terminated when this node is reached.
        </div>
      </div>

      {/* No output handle - this is a terminal node */}
    </div>
  );
});

EndCallNode.displayName = 'EndCallNode';
