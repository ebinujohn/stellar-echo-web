'use client';

import { MessageSquare, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { TextChatSessionStatus } from '@/types';

interface ChatEmptyStateProps {
  status: TextChatSessionStatus;
  error?: string | null;
  onStart: () => void;
  onReset: () => void;
  isLoading?: boolean;
  sessionSummary?: {
    messageCount: number;
    nodeId: string | null;
    nodeName: string | null;
    collectedData: Record<string, string>;
  };
}

export function ChatEmptyState({
  status,
  error,
  onStart,
  onReset,
  isLoading = false,
  sessionSummary,
}: ChatEmptyStateProps) {
  // Idle state - ready to start
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>

        <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>

        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Test your agent configuration with a text-based conversation. The agent
          will respond based on your workflow and LLM settings.
        </p>

        <Button onClick={onStart} disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chat Session
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Using the currently active agent version
        </p>
      </div>
    );
  }

  // Connecting state
  if (status === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        </div>

        <h3 className="text-lg font-semibold mb-2">Connecting...</h3>

        <p className="text-sm text-muted-foreground">
          Starting chat session with your agent
        </p>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Alert variant="destructive" className="max-w-md mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Start Chat</AlertTitle>
          <AlertDescription>
            {error || 'An unexpected error occurred. Please try again.'}
          </AlertDescription>
        </Alert>

        <Button onClick={onStart} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            'Try Again'
          )}
        </Button>
      </div>
    );
  }

  // Ended state
  if (status === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-green-500/10 p-4 mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>

        <h3 className="text-lg font-semibold mb-2">Session Ended</h3>

        <p className="text-sm text-muted-foreground mb-4">
          The chat session has ended.
        </p>

        {/* Session summary */}
        {sessionSummary && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 w-full max-w-md">
            <h4 className="text-sm font-medium mb-3">Session Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages</span>
                <span>{sessionSummary.messageCount}</span>
              </div>
              {(sessionSummary.nodeName || sessionSummary.nodeId) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Final Node</span>
                  <Badge variant="secondary" title={sessionSummary.nodeId || undefined}>
                    {sessionSummary.nodeName || sessionSummary.nodeId}
                  </Badge>
                </div>
              )}
              {Object.keys(sessionSummary.collectedData).length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-xs">
                    Collected Data
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(sessionSummary.collectedData).map(
                      ([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Button onClick={onReset} disabled={isLoading}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Start New Chat
        </Button>
      </div>
    );
  }

  // Fallback
  return null;
}
