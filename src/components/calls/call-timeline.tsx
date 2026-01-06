'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageSquare,
  ArrowRight,
  Circle,
  AlertTriangle,
  Workflow,
  Database,
  Variable,
  Search,
  Hash,
  Clock,
  User,
  Bot,
} from 'lucide-react';
import { useCallDebug } from '@/lib/hooks/use-call-detail';
import { formatDateTime, formatTime, formatLatency, formatNumber } from '@/lib/utils/formatters';
import type {
  CallDebugTransition,
  CallDebugMessage,
  CallDebugRagRetrieval,
  CallDebugInterruption,
} from '@/lib/external-apis/admin-api';

interface CallTimelineProps {
  callId: string;
}

// Unified timeline event for chronological display
interface TimelineEvent {
  id: string;
  type: 'message' | 'transition' | 'interruption';
  timestamp: Date;
  data: CallDebugMessage | CallDebugTransition | CallDebugInterruption;
}

function getEventColor(type: string, role?: string) {
  if (type === 'message') {
    return role === 'user' ? 'text-blue-500' : 'text-green-500';
  }
  if (type === 'transition') {
    return 'text-purple-500';
  }
  if (type === 'interruption') {
    return 'text-yellow-500';
  }
  return 'text-gray-500';
}

function EventIcon({ type, role }: { type: string; role?: string }) {
  if (type === 'message') {
    return role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;
  }
  if (type === 'transition') {
    return <ArrowRight className="h-4 w-4" />;
  }
  if (type === 'interruption') {
    return <AlertTriangle className="h-4 w-4" />;
  }
  return <Circle className="h-4 w-4" />;
}

function TimelineEventItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const role = event.type === 'message' ? (event.data as CallDebugMessage).role : undefined;
  const colorClass = getEventColor(event.type, role);

  return (
    <div className="flex gap-4 pb-6 relative">
      {/* Timeline line */}
      {!isLast && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}

      {/* Icon */}
      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${colorClass}`}>
        <EventIcon type={event.type} role={role} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {event.type === 'message' ? role : event.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>
          </div>
        </div>

        {event.type === 'message' && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {(event.data as CallDebugMessage).turn_number !== null && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Turn {(event.data as CallDebugMessage).turn_number}
                  </span>
                )}
                {(event.data as CallDebugMessage).node_id && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {(event.data as CallDebugMessage).node_id}
                  </Badge>
                )}
              </div>
              {(event.data as CallDebugMessage).was_interrupted && (
                <Badge variant="destructive" className="text-xs">
                  Interrupted
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {(event.data as CallDebugMessage).content}
            </p>
          </div>
        )}

        {event.type === 'transition' && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 flex-wrap">
              {((event.data as CallDebugTransition).from_node_name || (event.data as CallDebugTransition).from_node_id) && (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {(event.data as CallDebugTransition).from_node_name || (event.data as CallDebugTransition).from_node_id}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </>
              )}
              <Badge variant="secondary" className="font-mono text-xs">
                {(event.data as CallDebugTransition).to_node_name || (event.data as CallDebugTransition).to_node_id || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {(event.data as CallDebugTransition).turn_number !== null && (
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Turn {(event.data as CallDebugTransition).turn_number}
                </span>
              )}
              {(event.data as CallDebugTransition).reason && (
                <span>Reason: {(event.data as CallDebugTransition).reason}</span>
              )}
            </div>
            {(event.data as CallDebugTransition).condition && (
              <div className="mt-1 text-xs text-muted-foreground">
                Condition: <code className="bg-muted px-1 rounded">{(event.data as CallDebugTransition).condition}</code>
              </div>
            )}
          </div>
        )}

        {event.type === 'interruption' && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-yellow-600">User Interruption</span>
              {(event.data as CallDebugInterruption).turn_number !== null && (
                <Badge variant="outline" className="text-xs">
                  Turn {(event.data as CallDebugInterruption).turn_number}
                </Badge>
              )}
              {(event.data as CallDebugInterruption).node_id && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {(event.data as CallDebugInterruption).node_id}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RagRetrievalsSection({ retrievals }: { retrievals: CallDebugRagRetrieval[] }) {
  if (retrievals.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No RAG queries during this call</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Query</TableHead>
          <TableHead className="w-24">Mode</TableHead>
          <TableHead className="w-20">Results</TableHead>
          <TableHead className="w-24">Latency</TableHead>
          <TableHead className="w-32">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {retrievals.map((retrieval, index) => (
          <TableRow key={`${retrieval.sequence}-${index}`}>
            <TableCell className="font-mono text-muted-foreground">
              {retrieval.sequence}
            </TableCell>
            <TableCell>
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm">
                  {retrieval.query || <span className="text-muted-foreground italic">No query text</span>}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {retrieval.search_mode}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {retrieval.chunks_retrieved} chunks
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">
              {formatLatency(retrieval.processing_time_ms)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDateTime(retrieval.timestamp)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function VariablesSection({ variables }: { variables: Record<string, string> }) {
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No variables extracted during this call</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Variable Name</TableHead>
          <TableHead>Extracted Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([name, value]) => (
          <TableRow key={name}>
            <TableCell>
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {name}
              </code>
            </TableCell>
            <TableCell>
              <span className="text-sm font-medium">
                {value || <span className="text-muted-foreground italic">Empty</span>}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CallTimeline({ callId }: CallTimelineProps) {
  const { data: debugTrace, isLoading, error } = useCallDebug(callId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-24 flex-1" />
            </div>
          ))}
        </div>
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

  if (!debugTrace) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No timeline data available for this call.</p>
      </div>
    );
  }

  // Build unified timeline from messages, transitions, and interruptions
  const timeline: TimelineEvent[] = [];

  // Add messages
  debugTrace.messages.forEach((msg, index) => {
    timeline.push({
      id: `msg-${msg.sequence}-${index}`,
      type: 'message',
      timestamp: new Date(msg.timestamp),
      data: msg,
    });
  });

  // Add transitions
  debugTrace.transitions.forEach((t, index) => {
    timeline.push({
      id: `trans-${t.sequence}-${index}`,
      type: 'transition',
      timestamp: new Date(t.timestamp),
      data: t,
    });
  });

  // Add interruptions
  debugTrace.interruptions.forEach((i, index) => {
    timeline.push({
      id: `int-${i.sequence}-${index}`,
      type: 'interruption',
      timestamp: new Date(i.timestamp),
      data: i,
    });
  });

  // Sort by timestamp
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate average RAG latency
  const avgRagLatency = debugTrace.rag_retrievals.length > 0
    ? debugTrace.rag_retrievals.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / debugTrace.rag_retrievals.length
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Call Summary</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Messages"
            value={formatNumber(debugTrace.total_messages)}
            description={`${debugTrace.total_turns} turns`}
            icon={MessageSquare}
          />
          <SummaryCard
            title="Workflow Transitions"
            value={formatNumber(debugTrace.total_transitions)}
            description={debugTrace.initial_node_id && debugTrace.final_node_id
              ? `${debugTrace.initial_node_id} → ${debugTrace.final_node_id}`
              : undefined}
            icon={Workflow}
          />
          <SummaryCard
            title="RAG Queries"
            value={formatNumber(debugTrace.total_rag_queries)}
            description={avgRagLatency !== null ? `Avg ${formatLatency(avgRagLatency)}` : undefined}
            icon={Database}
          />
          <SummaryCard
            title="Interruptions"
            value={formatNumber(debugTrace.total_interruptions)}
            icon={AlertTriangle}
          />
        </div>
      </div>

      {/* Chronological Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Conversation Timeline
          </CardTitle>
          <CardDescription>
            {timeline.length} events in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No timeline events found for this call.</p>
            </div>
          ) : (
            <div className="relative">
              {timeline.map((event, index) => (
                <TimelineEventItem
                  key={event.id}
                  event={event}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RAG Retrievals */}
      {debugTrace.total_rag_queries > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              RAG Retrievals
            </CardTitle>
            <CardDescription>
              Knowledge base queries executed during the call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RagRetrievalsSection retrievals={debugTrace.rag_retrievals} />
          </CardContent>
        </Card>
      )}

      {/* Extracted Variables */}
      {Object.keys(debugTrace.variables).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Variable className="h-5 w-5" />
              Extracted Variables
            </CardTitle>
            <CardDescription>
              Data extracted from the conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariablesSection variables={debugTrace.variables} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
