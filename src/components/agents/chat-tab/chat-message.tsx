'use client';

import { Bot, User, AlertCircle, MapPin, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TextChatMessage, TextChatTransition } from '@/types';

interface ChatMessageProps {
  message: TextChatMessage;
  showTransitions?: boolean;
}

/**
 * Format a timestamp for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Display transition chain as a compact inline flow
 */
function TransitionChain({ transitions }: { transitions: TextChatTransition[] }) {
  if (transitions.length === 0) return null;

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <GitBranch className="h-3 w-3 mt-0.5 flex-shrink-0" />
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {transitions.map((t, i) => {
          const from = t.fromNodeName || t.fromNode;
          const to = t.toNodeName || t.toNode;
          return (
            <span key={i} className="inline-flex items-center">
              {i === 0 && (
                <>
                  <span className="font-medium">{from}</span>
                  <span className="mx-1">→</span>
                </>
              )}
              <span className="font-medium">{to}</span>
              {t.condition && (
                <span className="text-muted-foreground/70 ml-1">({t.condition})</span>
              )}
              {i < transitions.length - 1 && <span className="mx-1">→</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function ChatMessage({ message, showTransitions = true }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';

  const Icon = isAssistant ? Bot : User;
  const bgClass = isAssistant ? 'bg-primary/5' : 'bg-muted/50';

  // Prefer node name over node ID for display
  const nodeDisplay = message.nodeName || message.nodeId;
  const hasTransitions = message.transitions && message.transitions.length > 0;

  return (
    <div
      className={cn(
        'flex gap-4 p-4 rounded-lg',
        bgClass,
        isError && 'border border-destructive/30',
        isSending && 'opacity-70'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            isAssistant
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            {isAssistant ? 'Agent' : 'You'}
          </span>
          <div className="flex items-center gap-2">
            {/* Error indicator */}
            {isError && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Failed
              </span>
            )}

            {/* Sending indicator */}
            {isSending && (
              <span className="text-xs text-muted-foreground">Sending...</span>
            )}

            {/* Latency */}
            {message.latencyMs && (
              <span className="text-xs text-muted-foreground">
                {message.latencyMs}ms
              </span>
            )}

            {/* Timestamp */}
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>

        {/* Message content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Metadata section */}
        <div className="space-y-2 pt-2">
          {/* Current node badge (shown when no transitions) */}
          {nodeDisplay && !hasTransitions && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <MapPin className="h-3 w-3" />
                {nodeDisplay}
              </Badge>
            </div>
          )}

          {/* Transition chain - displayed as inline text flow */}
          {showTransitions && hasTransitions && (
            <TransitionChain transitions={message.transitions!} />
          )}

          {/* Extracted variables */}
          {message.extractedVariables &&
            Object.keys(message.extractedVariables).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.entries(message.extractedVariables).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
