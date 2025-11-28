'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatMessage } from './chat-message';
import type { TextChatMessage } from '@/types';

interface ChatMessagesProps {
  messages: TextChatMessage[];
  isTyping?: boolean;
}

/**
 * Loading skeleton for messages
 */
function MessageSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

/**
 * Typing indicator component
 */
function TypingIndicator() {
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-primary/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" />
        </div>
      </div>
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground">Agent is typing...</span>
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isTyping = false }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <ScrollArea className="h-full pr-4" ref={scrollRef}>
      <div className="space-y-4 pb-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isTyping && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

/**
 * Loading state for messages
 */
export function ChatMessagesLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}
