import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Globe, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNodeData } from '../utils/json-converter';
import { cn } from '@/lib/utils';

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  POST: 'bg-green-500/20 text-green-600 border-green-500/30',
  PUT: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  PATCH: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  DELETE: 'bg-red-500/20 text-red-600 border-red-500/30',
};

export const ApiCallNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => {
  const apiCall = data.api_call;
  const hasUrl = !!apiCall?.url;
  const method = apiCall?.method || 'GET';
  const extractionCount = apiCall?.response_extraction?.length || 0;
  const transitionCount = data.transitions?.length || 0;

  // Truncate URL for display
  const displayUrl = apiCall?.url
    ? apiCall.url.length > 35
      ? `${apiCall.url.substring(0, 35)}...`
      : apiCall.url
    : 'No URL configured';

  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card shadow-md transition-all',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary/20'
          : hasUrl
            ? 'border-green-500/50 hover:border-green-500'
            : 'border-destructive',
        'w-[280px]'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-background"
      />

      {/* Header */}
      <div className="border-b border-border bg-green-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-green-500" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{data.name}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{data.id}</div>
          </div>
          {!hasUrl && (
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Method Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn('text-xs font-mono', HTTP_METHOD_COLORS[method] || '')}
          >
            {method}
          </Badge>
          <Badge variant="outline" className="text-xs">
            API Call
          </Badge>
        </div>

        {/* URL Preview */}
        <div className="text-xs text-muted-foreground font-mono truncate">
          {displayUrl}
        </div>

        {/* Info Badges */}
        <div className="flex items-center gap-2 pt-1 border-t">
          {extractionCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {extractionCount} extraction{extractionCount !== 1 ? 's' : ''}
            </div>
          )}
          {transitionCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {transitionCount} transition{transitionCount !== 1 ? 's' : ''}
            </div>
          )}
          {extractionCount === 0 && transitionCount === 0 && (
            <div className="text-xs text-muted-foreground">
              No extractions or transitions
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-background"
      />
    </div>
  );
});

ApiCallNode.displayName = 'ApiCallNode';
