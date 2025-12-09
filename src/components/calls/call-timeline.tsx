'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  ArrowRight,
  FileText,
  Circle,
  Zap,
} from 'lucide-react';
import { useCallTimeline } from '@/lib/hooks/use-call-detail';
import { formatTime } from '@/lib/utils/formatters';
import type { TimelineEvent } from '@/lib/db/queries/call-details';

interface CallTimelineProps {
  callId: string;
}

function getEventColor(type: string) {
  switch (type) {
    case 'message':
      return 'text-blue-500';
    case 'transition':
      return 'text-purple-500';
    case 'transcript':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}

// Icon components mapped by event type to avoid creating during render
const EventIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4" />;
    case 'transition':
      return <ArrowRight className="h-4 w-4" />;
    case 'transcript':
      return <FileText className="h-4 w-4" />;
    default:
      return <Circle className="h-4 w-4" />;
  }
};

function TimelineEventItem({ event }: { event: TimelineEvent }) {
  const colorClass = getEventColor(event.type);

  return (
    <div className="flex gap-4 pb-6 relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />

      {/* Icon */}
      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${colorClass}`}>
        <EventIcon type={event.type} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {event.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>
          </div>
        </div>

        {event.type === 'message' && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium capitalize">{String(event.data.role)}</span>
              {event.data.latencyMs && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  {Number(event.data.latencyMs)}ms
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{String(event.data.content)}</p>
            {event.data.tokensUsed && (
              <div className="mt-2 text-xs text-muted-foreground">
                Tokens: {Number(event.data.tokensUsed)}
              </div>
            )}
          </div>
        )}

        {event.type === 'transition' && (
          <div className="rounded-lg border bg-card p-3">
            <div className="text-sm">
              {event.data.fromState && (
                <>
                  <span className="font-medium">{String(event.data.fromState)}</span>
                  {' → '}
                </>
              )}
              <span className="font-medium">{String(event.data.toState)}</span>
            </div>
            {event.data.reason && (
              <p className="text-xs text-muted-foreground mt-1">{String(event.data.reason)}</p>
            )}
          </div>
        )}

        {event.type === 'transcript' && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium capitalize">{String(event.data.speaker)}</span>
              {event.data.confidence && (
                <span className="text-xs text-muted-foreground">
                  {(Number(event.data.confidence) * 100).toFixed(0)}% confidence
                </span>
              )}
            </div>
            <p className="text-sm">{String(event.data.text)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CallTimeline({ callId }: CallTimelineProps) {
  const { data: timeline, isLoading, error } = useCallTimeline(callId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-24 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading timeline: {error.message}</p>
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No timeline events found for this call.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        {timeline.length} events in chronological order
      </div>
      <div className="relative">
        {timeline.map((event) => (
          <TimelineEventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
