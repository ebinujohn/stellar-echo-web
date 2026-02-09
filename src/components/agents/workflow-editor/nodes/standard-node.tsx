import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNodeData } from '../utils/json-converter';
import { cn } from '@/lib/utils';
import { TransitionHandleRow } from './transition-handle-row';

export const StandardNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => {
  const hasStaticText = !!data.static_text;
  const hasSystemPrompt = !!data.system_prompt;
  const isValid = (hasStaticText && !hasSystemPrompt) || (!hasStaticText && hasSystemPrompt);

  const previewText = data.static_text || data.system_prompt || 'No content';

  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card shadow-md transition-all border-t-[3px]',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary/20 border-t-primary'
          : isValid
            ? 'border-purple-500/50 hover:border-purple-500 border-t-purple-500'
            : 'border-destructive border-t-destructive',
        'w-[340px]'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-background"
      />

      {/* Header */}
      <div className="border-b border-border bg-purple-500/20 px-3 py-2">
        <div className="flex items-center gap-2">
          {hasStaticText ? (
            <FileText className="h-4 w-4 text-purple-500" />
          ) : (
            <MessageSquare className="h-4 w-4 text-purple-500" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{data.name}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{data.id}</div>
          </div>
          {!isValid && (
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {hasStaticText ? 'Static Text' : 'LLM Prompt'}
          </Badge>
          {data.interruptions_enabled !== undefined && data.interruptions_enabled !== null && (
            <Badge variant="secondary" className="text-xs">
              {data.interruptions_enabled ? 'Interruptible' : 'No Interrupt'}
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground line-clamp-4">
          {previewText}
        </div>

        {/* Inline Transitions with per-transition handles */}
        <TransitionHandleRow transitions={data.transitions || []} color="purple" />
      </div>
    </div>
  );
});

StandardNode.displayName = 'StandardNode';
