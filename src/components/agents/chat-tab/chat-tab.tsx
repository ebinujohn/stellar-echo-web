'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, AlertCircle, X } from 'lucide-react';
import { useChatSession } from '../contexts/chat-session-context';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ChatEmptyState } from './chat-empty-state';

interface ChatTabProps {
  hasActiveVersion: boolean;
}

export function ChatTab({ hasActiveVersion }: ChatTabProps) {
  const {
    state,
    startSession,
    sendMessage,
    endSession,
    resetSession,
    isConnecting,
    isSending,
    isEnding,
    canSend,
  } = useChatSession();

  const { status, messages, currentNodeId, currentNodeName, error, agentConfigVersion, isActiveVersion } = state;

  // Show error if no active version
  if (!hasActiveVersion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Test Agent Chat
          </CardTitle>
          <CardDescription>
            Test your agent configuration with text-based conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This agent has no active version. Please activate a version to test
              the chat functionality.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show empty state for idle, connecting, ended, or error
  if (status !== 'active') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Test Agent Chat
          </CardTitle>
          <CardDescription>
            Test your agent configuration with text-based conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatEmptyState
            status={status}
            error={error}
            onStart={startSession}
            onReset={resetSession}
            isLoading={isConnecting}
            sessionSummary={
              status === 'ended'
                ? {
                    messageCount: messages.length,
                    nodeId: currentNodeId,
                    nodeName: currentNodeName,
                    collectedData: state.collectedData,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  // Active session - show chat interface
  return (
    <Card className="flex flex-col h-[700px]">
      {/* Header */}
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Test Agent Chat
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                Session Active
              </Badge>
              {(currentNodeName || currentNodeId) && (
                <Badge variant="outline" className="text-xs" title={currentNodeId || undefined}>
                  📍 {currentNodeName || currentNodeId}
                </Badge>
              )}
              {agentConfigVersion && (
                <Badge variant="outline" className="text-xs">
                  v{agentConfigVersion}{isActiveVersion ? '' : ' (test)'}
                </Badge>
              )}
              <span className="text-xs">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={endSession}
            disabled={isEnding}
          >
            <X className="h-4 w-4 mr-1" />
            End Session
          </Button>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardHeader>

      {/* Messages area */}
      <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
        <div className="flex-1 min-h-0 mb-4">
          <ChatMessages messages={messages} isTyping={isSending} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0">
          <ChatInput
            onSend={sendMessage}
            disabled={!canSend}
            placeholder={
              isSending ? 'Waiting for response...' : 'Type a message...'
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
