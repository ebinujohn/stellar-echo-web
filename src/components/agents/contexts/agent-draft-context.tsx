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
import type { WorkflowConfig } from '@/lib/validations/agents';

/**
 * Draft state for TTS tuning parameters (configured per-agent)
 */
export interface TtsDraft {
  model: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  enableSsmlParsing: boolean;
  pronunciationDictionariesEnabled: boolean;
  pronunciationDictionaryIds: string;
}

/**
 * Draft state for RAG tuning parameters (configured per-agent)
 * These override the base RAG config's settings when ragOverrideEnabled is true
 */
export interface RagDraft {
  searchMode: 'vector' | 'fts' | 'hybrid';
  topK: number;
  rrfK: number;
  vectorWeight: number;
  ftsWeight: number;
}

/**
 * Draft state for the Settings form
 */
export interface SettingsDraft {
  globalPrompt: string;
  llmEnabled: boolean;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  llmServiceTier: string;
  ttsEnabled: boolean;
  tts: TtsDraft; // TTS tuning parameters
  ragEnabled: boolean;
  ragConfigId: string | null;
  ragOverrideEnabled: boolean; // Whether to override RAG config settings
  rag: RagDraft; // RAG tuning parameters (when ragOverrideEnabled is true)
  voiceConfigId: string | null;
  autoHangupEnabled: boolean;
}

/**
 * Draft state for the Workflow editor
 */
export interface WorkflowDraft {
  config: Partial<WorkflowConfig>;
  // Store the serialized state to detect changes
  serializedState: string;
}

interface AgentDraftContextValue {
  // Workflow draft state
  workflowDraft: WorkflowDraft | null;
  setWorkflowDraft: (draft: WorkflowDraft | null) => void;
  isWorkflowDirty: boolean;
  setIsWorkflowDirty: (dirty: boolean) => void;

  // Settings draft state
  settingsDraft: SettingsDraft | null;
  setSettingsDraft: (draft: SettingsDraft | null) => void;
  isSettingsDirty: boolean;
  setIsSettingsDirty: (dirty: boolean) => void;

  // Combined dirty state
  isDirty: boolean;

  // Clear all drafts (after save or discard)
  clearAllDrafts: () => void;
  clearWorkflowDraft: () => void;
  clearSettingsDraft: () => void;

  // Base version ID to detect when server data changes
  baseVersionId: string | null;
  setBaseVersionId: (id: string | null) => void;
}

const AgentDraftContext = createContext<AgentDraftContextValue | null>(null);

interface AgentDraftProviderProps {
  children: ReactNode;
  initialVersionId?: string | null;
}

export function AgentDraftProvider({ children, initialVersionId }: AgentDraftProviderProps) {
  // Workflow state
  const [workflowDraft, setWorkflowDraft] = useState<WorkflowDraft | null>(null);
  const [isWorkflowDirty, setIsWorkflowDirty] = useState(false);

  // Settings state
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);

  // Base version tracking - use ref to track previous value
  const [baseVersionId, setBaseVersionIdState] = useState<string | null>(initialVersionId || null);
  const previousVersionIdRef = useRef<string | null>(initialVersionId || null);

  // Custom setter that clears drafts when version changes externally
  const setBaseVersionId = useCallback((newVersionId: string | null) => {
    if (newVersionId && previousVersionIdRef.current && newVersionId !== previousVersionIdRef.current) {
      // Version changed externally (e.g., activated different version), clear all drafts
      setWorkflowDraft(null);
      setIsWorkflowDirty(false);
      setSettingsDraft(null);
      setIsSettingsDirty(false);
    }
    previousVersionIdRef.current = newVersionId;
    setBaseVersionIdState(newVersionId);
  }, []);

  const clearAllDrafts = useCallback(() => {
    setWorkflowDraft(null);
    setIsWorkflowDirty(false);
    setSettingsDraft(null);
    setIsSettingsDirty(false);
  }, []);

  const clearWorkflowDraft = useCallback(() => {
    setWorkflowDraft(null);
    setIsWorkflowDirty(false);
  }, []);

  const clearSettingsDraft = useCallback(() => {
    setSettingsDraft(null);
    setIsSettingsDirty(false);
  }, []);

  const isDirty = isWorkflowDirty || isSettingsDirty;

  const value: AgentDraftContextValue = {
    workflowDraft,
    setWorkflowDraft,
    isWorkflowDirty,
    setIsWorkflowDirty,
    settingsDraft,
    setSettingsDraft,
    isSettingsDirty,
    setIsSettingsDirty,
    isDirty,
    clearAllDrafts,
    clearWorkflowDraft,
    clearSettingsDraft,
    baseVersionId,
    setBaseVersionId,
  };

  return (
    <AgentDraftContext.Provider value={value}>
      {children}
    </AgentDraftContext.Provider>
  );
}

export function useAgentDraft() {
  const context = useContext(AgentDraftContext);
  if (!context) {
    throw new Error('useAgentDraft must be used within an AgentDraftProvider');
  }
  return context;
}

/**
 * Hook to handle beforeunload warning for unsaved changes
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but this is required
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
