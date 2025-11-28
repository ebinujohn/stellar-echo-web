'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import type {
  TextChatMessage,
  TextChatSessionState,
  CreateTextChatSessionResponse,
  SendTextChatMessageResponse,
} from '@/types';

/**
 * Storage key prefix for persisting chat sessions
 */
const STORAGE_KEY_PREFIX = 'chat-session-';

/**
 * Context value interface for chat session management
 */
interface ChatSessionContextValue {
  // Session state
  state: TextChatSessionState;

  // Session actions
  startSession: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  endSession: () => Promise<void>;
  resetSession: () => void;

  // Loading states
  isConnecting: boolean;
  isSending: boolean;
  isEnding: boolean;

  // Computed
  canSend: boolean;
}

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

interface ChatSessionProviderProps {
  children: ReactNode;
  agentId: string;
}

/**
 * Initial session state
 */
const initialState: TextChatSessionState = {
  sessionId: null,
  conversationId: null,
  messages: [],
  currentNodeId: null,
  currentNodeName: null,
  status: 'idle',
  error: null,
  turnNumber: 0,
  collectedData: {},
  agentConfigVersion: null,
  isActiveVersion: null,
};

/**
 * Load session state from sessionStorage
 */
function loadSessionFromStorage(agentId: string): TextChatSessionState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${agentId}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Rehydrate Date objects in messages
    if (parsed.messages) {
      parsed.messages = parsed.messages.map(
        (msg: TextChatMessage & { timestamp: string | Date }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })
      );
    }

    // If session was active, set status to active (will be verified on first action)
    if (parsed.sessionId && parsed.status === 'active') {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Save session state to sessionStorage
 */
function saveSessionToStorage(agentId: string, state: TextChatSessionState) {
  if (typeof window === 'undefined') return;

  try {
    // Only save if there's an active session
    if (state.sessionId && state.status === 'active') {
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${agentId}`,
        JSON.stringify(state)
      );
    } else {
      // Clear storage if session is not active
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${agentId}`);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear session from sessionStorage
 */
function clearSessionFromStorage(agentId: string) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${agentId}`);
  } catch {
    // Ignore storage errors
  }
}

export function ChatSessionProvider({
  children,
  agentId,
}: ChatSessionProviderProps) {
  // Session state
  const [state, setState] = useState<TextChatSessionState>(initialState);

  // Loading states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Track if we've initialized from storage
  const initializedRef = useRef(false);

  // Initialize from storage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const stored = loadSessionFromStorage(agentId);
    if (stored) {
      setState(stored);
    }
  }, [agentId]);

  // Save to storage when state changes
  useEffect(() => {
    if (initializedRef.current) {
      saveSessionToStorage(agentId, state);
    }
  }, [agentId, state]);

  /**
   * Start a new chat session
   */
  const startSession = useCallback(async () => {
    setIsConnecting(true);
    setState((s) => ({ ...s, status: 'connecting', error: null }));

    try {
      const response = await fetch(`/api/agents/${agentId}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start chat session');
      }

      const { data } = (await response.json()) as {
        data: CreateTextChatSessionResponse;
      };

      // Initialize messages with initial message if present
      const messages: TextChatMessage[] = [];
      if (data.initialMessage) {
        messages.push({
          id: `msg-${Date.now()}-initial`,
          role: 'assistant',
          content: data.initialMessage,
          timestamp: new Date(data.createdAt),
          nodeId: data.nodeId,
          nodeName: data.nodeName,
          transitions: data.transitions,
          status: 'sent',
        });
      }

      setState({
        sessionId: data.sessionId,
        conversationId: data.conversationId,
        messages,
        currentNodeId: data.nodeId,
        currentNodeName: data.nodeName,
        status: 'active',
        error: null,
        turnNumber: 0,
        collectedData: {},
        agentConfigVersion: data.agentConfigVersion,
        isActiveVersion: data.isActiveVersion,
      });
    } catch (error) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start chat',
      }));
    } finally {
      setIsConnecting(false);
    }
  }, [agentId]);

  /**
   * Send a message in the active session
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!state.sessionId || state.status !== 'active') return;

      // Create optimistic user message
      const userMessageId = `msg-${Date.now()}-user`;
      const userMessage: TextChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: new Date(),
        status: 'sending',
      };

      // Add user message optimistically
      setState((s) => ({
        ...s,
        messages: [...s.messages, userMessage],
        error: null,
      }));

      setIsSending(true);

      try {
        const response = await fetch(
          `/api/agents/${agentId}/chat/sessions/${state.sessionId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();

          // Handle session expired
          if (response.status === 410 || errorData.code === 'SESSION_EXPIRED') {
            setState((s) => ({
              ...s,
              status: 'ended',
              error: 'Session has expired. Please start a new chat.',
              messages: s.messages.map((m) =>
                m.id === userMessageId ? { ...m, status: 'error' as const } : m
              ),
            }));
            clearSessionFromStorage(agentId);
            return;
          }

          throw new Error(errorData.error || 'Failed to send message');
        }

        const { data } = (await response.json()) as {
          data: SendTextChatMessageResponse;
        };

        // Create assistant message with full transition chain
        const assistantMessage: TextChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          nodeId: data.nodeId,
          nodeName: data.nodeName,
          transitions: data.transitions,
          extractedVariables: data.extractedVariables,
          latencyMs: data.latencyMs,
          status: 'sent',
        };

        setState((s) => ({
          ...s,
          messages: [
            ...s.messages.map((m) =>
              m.id === userMessageId ? { ...m, status: 'sent' as const } : m
            ),
            assistantMessage,
          ],
          currentNodeId: data.nodeId,
          currentNodeName: data.nodeName,
          turnNumber: data.turnNumber,
          status: data.sessionEnded ? 'ended' : 'active',
          collectedData: data.extractedVariables
            ? { ...s.collectedData, ...data.extractedVariables }
            : s.collectedData,
        }));

        // Clear storage if session ended
        if (data.sessionEnded) {
          clearSessionFromStorage(agentId);
        }
      } catch (error) {
        // Mark user message as error
        setState((s) => ({
          ...s,
          error: error instanceof Error ? error.message : 'Failed to send message',
          messages: s.messages.map((m) =>
            m.id === userMessageId ? { ...m, status: 'error' as const } : m
          ),
        }));
      } finally {
        setIsSending(false);
      }
    },
    [agentId, state.sessionId, state.status]
  );

  /**
   * End the current session
   */
  const endSession = useCallback(async () => {
    if (!state.sessionId) return;

    setIsEnding(true);

    try {
      await fetch(
        `/api/agents/${agentId}/chat/sessions/${state.sessionId}`,
        { method: 'DELETE' }
      );

      setState((s) => ({
        ...s,
        status: 'ended',
        error: null,
      }));

      clearSessionFromStorage(agentId);
    } catch {
      // Even if the API call fails, end the session locally
      setState((s) => ({
        ...s,
        status: 'ended',
        error: null,
      }));

      clearSessionFromStorage(agentId);
    } finally {
      setIsEnding(false);
    }
  }, [agentId, state.sessionId]);

  /**
   * Reset the session to initial state
   */
  const resetSession = useCallback(() => {
    setState(initialState);
    clearSessionFromStorage(agentId);
  }, [agentId]);

  // Computed values
  const canSend = state.status === 'active' && !isSending;

  const value: ChatSessionContextValue = {
    state,
    startSession,
    sendMessage,
    endSession,
    resetSession,
    isConnecting,
    isSending,
    isEnding,
    canSend,
  };

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}

/**
 * Hook to access the chat session context
 */
export function useChatSession() {
  const context = useContext(ChatSessionContext);
  if (!context) {
    throw new Error('useChatSession must be used within a ChatSessionProvider');
  }
  return context;
}
