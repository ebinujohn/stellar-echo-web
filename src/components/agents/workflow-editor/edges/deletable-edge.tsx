'use client';

import { useCallback, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from 'reactflow';
import { X } from 'lucide-react';

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  source,
  target,
}: EdgeProps) {
  const { setEdges, getEdges } = useReactFlow();

  // Calculate offset for parallel edges
  const edgeOffset = useMemo(() => {
    const edges = getEdges();
    const parallelEdges = edges.filter(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
    );

    if (parallelEdges.length <= 1) return 0;

    const edgeIndex = parallelEdges.findIndex((e) => e.id === id);
    const totalEdges = parallelEdges.length;

    // Center the group of parallel edges
    const offset = (edgeIndex - (totalEdges - 1) / 2) * 30;
    return offset;
  }, [id, source, target, getEdges]);

  // Apply offset to control points for parallel edges
  const [edgePath, labelX, labelY] = useMemo(() => {
    if (edgeOffset === 0) {
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
    }

    // Calculate perpendicular offset direction
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Perpendicular vector (normalized)
    const perpX = -dy / length;
    const perpY = dx / length;

    // Apply offset perpendicular to the edge
    const offsetX = perpX * edgeOffset;
    const offsetY = perpY * edgeOffset;

    return getBezierPath({
      sourceX: sourceX + offsetX,
      sourceY: sourceY + offsetY,
      sourcePosition,
      targetX: targetX + offsetX,
      targetY: targetY + offsetY,
      targetPosition,
    });
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, edgeOffset]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setEdges((edges) => edges.filter((edge) => edge.id !== id));
    },
    [id, setEdges]
  );

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1"
        >
          {label && (
            <div className="px-2 py-0.5 bg-background border border-border rounded text-xs text-muted-foreground">
              {label}
            </div>
          )}
          <button
            className="w-5 h-5 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md"
            onClick={onEdgeClick}
            title="Delete connection"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
