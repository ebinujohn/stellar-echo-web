'use client';

import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransitionHandleRowProps {
  transitions: Array<{
    condition: string;
    target: string;
    priority?: number;
  }>;
  color: string; // e.g. 'purple', 'amber', 'green'
}

const MAX_VISIBLE = 5;

export const TransitionHandleRow = memo(({ transitions, color }: TransitionHandleRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const { getNodes } = useReactFlow();

  if (!transitions || transitions.length === 0) {
    return null;
  }

  const visibleTransitions = expanded
    ? transitions
    : transitions.slice(0, MAX_VISIBLE);
  const hiddenCount = transitions.length - MAX_VISIBLE;

  // Look up node names for targets
  const allNodes = getNodes();
  const nodeNameMap = new Map(allNodes.map((n) => [n.id, n.data?.name || n.id]));

  const handleColor = getHandleColorClass(color);

  return (
    <div className="border-t border-border mt-1 pt-1.5">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 px-1">
        Transitions
      </div>
      <div className="space-y-0.5 relative">
        {visibleTransitions.map((transition, index) => {
          const targetName = nodeNameMap.get(transition.target) || transition.target;
          const truncatedCondition =
            transition.condition.length > 28
              ? transition.condition.substring(0, 28) + '...'
              : transition.condition;
          const truncatedTarget =
            targetName.length > 16 ? targetName.substring(0, 16) + '...' : targetName;

          return (
            <div
              key={`transition-${index}`}
              className="flex items-center gap-1 px-1 py-0.5 rounded text-[11px] hover:bg-accent/50 transition-colors group relative"
            >
              <ChevronRight className={cn('h-3 w-3 flex-shrink-0', `text-${color}-500`)} />
              <span className="truncate flex-1 text-muted-foreground" title={transition.condition}>
                {truncatedCondition}
              </span>
              <span
                className={cn(
                  'text-[10px] px-1 py-0 rounded bg-muted text-muted-foreground font-mono truncate max-w-[80px]'
                )}
                title={targetName}
              >
                {truncatedTarget}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={`transition-${index}`}
                className={cn(
                  '!w-2.5 !h-2.5 !border-2 !border-background !right-[-13px]',
                  handleColor
                )}
                style={{ top: '50%' }}
              />
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && !expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="w-full text-[10px] text-muted-foreground hover:text-foreground py-0.5 flex items-center justify-center gap-0.5 transition-colors"
        >
          <ChevronDown className="h-3 w-3" />
          +{hiddenCount} more
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="w-full text-[10px] text-muted-foreground hover:text-foreground py-0.5 flex items-center justify-center gap-0.5 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
});

TransitionHandleRow.displayName = 'TransitionHandleRow';

function getHandleColorClass(color: string): string {
  switch (color) {
    case 'purple':
      return '!bg-purple-500';
    case 'amber':
      return '!bg-amber-500';
    case 'green':
      return '!bg-green-500';
    case 'cyan':
      return '!bg-cyan-500';
    case 'red':
      return '!bg-red-500';
    default:
      return '!bg-primary';
  }
}
