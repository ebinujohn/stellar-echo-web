import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNodeData } from '../utils/json-converter';
import { cn } from '@/lib/utils';

export const RetrieveVariableNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => {
  const hasBatchMode = data.variables && data.variables.length > 0;
  const hasLegacyMode = data.variable_name && data.extraction_prompt;
  const isValid = hasBatchMode || hasLegacyMode;

  const variableNames = hasBatchMode
    ? data.variables!.map((v) => v.variable_name)
    : hasLegacyMode
      ? [data.variable_name!]
      : [];

  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card shadow-md transition-all',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary/20'
          : isValid
            ? 'border-amber-500/50 hover:border-amber-500'
            : 'border-destructive',
        'w-[280px]'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-background"
      />

      {/* Header */}
      <div className="border-b border-border bg-amber-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-amber-500" />
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
        <Badge variant="outline" className="text-xs">
          Extract Variables
        </Badge>

        {variableNames.length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">
              Extracting {variableNames.length} variable{variableNames.length !== 1 ? 's' : ''}:
            </div>
            <div className="flex flex-wrap gap-1">
              {variableNames.slice(0, 4).map((varName) => (
                <Badge key={varName} variant="secondary" className="text-xs font-mono">
                  {varName}
                </Badge>
              ))}
              {variableNames.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{variableNames.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-destructive">
            No variables configured
          </div>
        )}

        {data.transitions && data.transitions.length > 0 && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            {data.transitions.length} transition{data.transitions.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-background"
      />
    </div>
  );
});

RetrieveVariableNode.displayName = 'RetrieveVariableNode';
