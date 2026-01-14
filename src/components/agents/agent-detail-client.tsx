'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Settings,
  Activity,
  Phone,
  PhoneOutgoing,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  FileCode,
  Save,
  Database,
  MessageSquare,
} from 'lucide-react';
import { useAgent, useCreateVersion, useAgentVersions } from '@/lib/hooks/use-agents';
import { ApiError } from '@/lib/hooks/factories/create-api-hooks';
import { useAgentPhoneConfigs } from '@/lib/hooks/use-phone-configs';
import { useVoiceConfig } from '@/lib/hooks/use-voice-configs';
import { formatDateTime, formatPhoneNumber } from '@/lib/utils/formatters';
import { DeleteAgentDialog } from './dialogs/delete-agent-dialog';
import { InitiateCallDialog } from './dialogs/initiate-call-dialog';
import { UnsavedChangesDialog, UnsavedChangesAction } from './dialogs/unsaved-changes-dialog';
import { SaveVersionDialog } from './dialogs/save-version-dialog';
import { WorkflowEditorLayout } from './workflow-editor/workflow-editor-layout';
import { SettingsForm } from './settings-form';
import { VersionsTab } from './versions-tab';
import { RagQueryTab } from './rag-query-tab';
import { ChatTab } from './chat-tab';
import { ChatSessionProvider } from './contexts/chat-session-context';
import { AgentDraftProvider, useAgentDraft, useUnsavedChangesWarning } from './contexts/agent-draft-context';
import { toast } from 'sonner';

interface AgentDetailClientProps {
  agentId: string;
}

// Type for agent active version with all expected properties
interface AgentActiveVersion {
  id: string;
  version: number;
  configJson: {
    workflow?: {
      llm?: {
        enabled?: boolean;
        model_name?: string;
        temperature?: number;
        max_tokens?: number;
      };
      tts?: {
        enabled?: boolean;
      };
      nodes?: unknown[];
    };
    tts?: {
      enabled?: boolean;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  globalPrompt: string | null;
  ragEnabled: boolean;
  ragConfigId: string | null;
  voiceConfigId: string | null;
  createdAt: Date;
}

// Inner component that uses the context
function AgentDetailContent({ agentId }: AgentDetailClientProps) {
  const router = useRouter();
  const { data: agent, isLoading, error } = useAgent(agentId);
  const { data: phoneConfigs } = useAgentPhoneConfigs(agentId);

  // Get voice config ID from active version
  const voiceConfigId = (agent?.activeVersion as AgentActiveVersion | undefined)?.voiceConfigId;
  const { data: voiceConfig } = useVoiceConfig(voiceConfigId || '');

  // Get versions for RAG Query tab
  const { data: versions } = useAgentVersions(agentId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [initiateCallDialogOpen, setInitiateCallDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const createVersion = useCreateVersion();

  // Unsaved changes dialog state
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const isSavingFromDialog = false; // Currently not used but kept for UnsavedChangesDialog prop

  // Save version dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogContext, setSaveDialogContext] = useState<{
    type: 'workflow' | 'settings' | 'combined';
    config?: Record<string, unknown>;
    ragEnabled?: boolean;
    ragConfigId?: string | null;
    voiceConfigId?: string | null;
    globalPrompt?: string | null;
    navigateAfterSave?: string; // URL to navigate to after successful save
  } | null>(null);

  // Ref to track if we should allow navigation (after user confirms)
  const allowNavigationRef = useRef(false);

  // Get draft context
  const {
    isDirty,
    isWorkflowDirty,
    isSettingsDirty,
    workflowDraft,
    settingsDraft,
    clearAllDrafts,
    clearWorkflowDraft,
    clearSettingsDraft,
    setBaseVersionId,
  } = useAgentDraft();

  // Update base version ID when agent data changes
  useEffect(() => {
    if (agent?.activeVersion?.id) {
      setBaseVersionId(agent.activeVersion.id);
    }
  }, [agent?.activeVersion?.id, setBaseVersionId]);

  // Browser beforeunload warning
  useUnsavedChangesWarning(isDirty);

  // Simple tab change - no dialog, just switch tabs (state is preserved in context)
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
  }, []);

  // Global navigation interception for SPA navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // If navigation was explicitly allowed (user clicked "Discard"), let it through
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return;
      }

      // Only intercept when there are unsaved changes
      if (!isDirty) return;

      // Find the closest anchor tag
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      // Get the href
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Only intercept internal navigation (starts with /)
      if (!href.startsWith('/')) return;

      // Don't intercept navigation within the current agent page
      if (href.startsWith(`/agents/${agentId}`)) return;

      // Intercept the navigation
      e.preventDefault();
      e.stopPropagation();
      setPendingNavigation(href);
      setUnsavedDialogOpen(true);
    };

    // Add listener with capture to intercept before navigation
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty, agentId]);

  // Combined save that includes navigation after save
  const handleCombinedSaveWithNavigation = useCallback((navigateTo: string | null) => {
    if (!agent?.activeVersion) return;

    interface ActiveVersionType {
      configJson: Record<string, unknown>;
      globalPrompt: string | null;
      ragEnabled: boolean;
      ragConfigId: string | null;
      voiceConfigId: string | null;
    }
    const activeVersion = agent.activeVersion as ActiveVersionType;
    let configJson = activeVersion.configJson;
    let globalPrompt = activeVersion.globalPrompt;
    let ragEnabled = activeVersion.ragEnabled;
    let ragConfigId = activeVersion.ragConfigId;
    let voiceConfigId = activeVersion.voiceConfigId;

    // Apply workflow draft changes if dirty
    if (isWorkflowDirty && workflowDraft?.config) {
      configJson = workflowDraft.config;
    }

    // Apply settings draft changes if dirty
    if (isSettingsDirty && settingsDraft) {
      const llmConfig = {
        enabled: settingsDraft.llmEnabled,
        model_name: settingsDraft.llmModel,
        temperature: settingsDraft.llmTemperature,
        max_tokens: settingsDraft.llmMaxTokens,
        service_tier: settingsDraft.llmServiceTier,
      };

      const ttsConfig = {
        enabled: settingsDraft.ttsEnabled,
        model: settingsDraft.tts.model,
        stability: settingsDraft.tts.stability,
        similarity_boost: settingsDraft.tts.similarityBoost,
        style: settingsDraft.tts.style,
        use_speaker_boost: settingsDraft.tts.useSpeakerBoost,
        enable_ssml_parsing: settingsDraft.tts.enableSsmlParsing,
        pronunciation_dictionaries_enabled: settingsDraft.tts.pronunciationDictionariesEnabled,
        pronunciation_dictionary_ids: settingsDraft.tts.pronunciationDictionaryIds
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean),
        aggregate_sentences: settingsDraft.tts.aggregateSentences,
      };

      const currentWorkflow = typeof configJson.workflow === 'object' && configJson.workflow !== null
        ? configJson.workflow as Record<string, unknown>
        : {};
      configJson = {
        ...configJson,
        workflow: {
          ...currentWorkflow,
          llm: llmConfig,
          tts: ttsConfig,
        },
        tts: undefined,
        stt: undefined,
        llm: undefined,
        rag: undefined,
        auto_hangup: { enabled: settingsDraft.autoHangupEnabled },
      };

      globalPrompt = settingsDraft.globalPrompt;
      ragEnabled = settingsDraft.ragEnabled;
      ragConfigId = settingsDraft.ragConfigId;
      voiceConfigId = settingsDraft.voiceConfigId;
    }

    setSaveDialogContext({
      type: 'combined',
      config: configJson,
      ragEnabled,
      ragConfigId,
      voiceConfigId,
      globalPrompt,
      navigateAfterSave: navigateTo || undefined,
    });
    setSaveDialogOpen(true);
  }, [agent, isWorkflowDirty, workflowDraft, isSettingsDirty, settingsDraft]);

  // Handle unsaved changes dialog action
  const handleUnsavedAction = useCallback(
    async (action: UnsavedChangesAction) => {
      if (action === 'cancel') {
        setUnsavedDialogOpen(false);
        setPendingNavigation(null);
        return;
      }

      if (action === 'discard') {
        // Clear all drafts and navigate
        clearAllDrafts();
        setUnsavedDialogOpen(false);
        if (pendingNavigation) {
          // Allow navigation through and trigger it
          allowNavigationRef.current = true;
          router.push(pendingNavigation);
          setPendingNavigation(null);
        }
        return;
      }

      if (action === 'save') {
        // Close unsaved dialog and open save notes dialog with navigation context
        setUnsavedDialogOpen(false);
        // Trigger combined save which will open the notes dialog
        // Pass the pending navigation to continue after save
        handleCombinedSaveWithNavigation(pendingNavigation);
        setPendingNavigation(null);
      }
    },
    [pendingNavigation, router, clearAllDrafts, handleCombinedSaveWithNavigation]
  );

  // Handler for settings form - opens dialog to get notes, then saves
  // voiceConfigId is FK to voice_configs table (voice selection)
  // TTS tuning params are in configJson.workflow.tts
  const handleSettingsSave = async (
    config: Record<string, unknown>,
    ragEnabled?: boolean,
    ragConfigId?: string | null,
    voiceConfigId?: string | null,
    globalPrompt?: string | null
  ) => {
    // Store context and open dialog
    setSaveDialogContext({
      type: 'settings',
      config,
      ragEnabled,
      ragConfigId,
      voiceConfigId,
      globalPrompt,
    });
    setSaveDialogOpen(true);
  };

  // Handler for workflow editor - opens dialog to get notes, then saves
  // voiceConfigId is FK to voice_configs table (voice selection)
  const handleWorkflowSave = async (config: Record<string, unknown>) => {
    // Store context and open dialog
    const activeVersion = agent?.activeVersion as {
      ragEnabled?: boolean;
      ragConfigId?: string | null;
      voiceConfigId?: string | null;
      globalPrompt?: string | null;
    } | null;
    setSaveDialogContext({
      type: 'workflow',
      config,
      ragEnabled: activeVersion?.ragEnabled,
      ragConfigId: activeVersion?.ragConfigId,
      voiceConfigId: activeVersion?.voiceConfigId,
      globalPrompt: activeVersion?.globalPrompt,
    });
    setSaveDialogOpen(true);
  };

  // Combined save handler - opens dialog to get notes, then saves ALL tabs with changes
  // voiceConfigId is FK to voice_configs table (voice selection)
  const handleCombinedSave = async () => {
    if (!agent?.activeVersion) return;

    interface ActiveVersionType {
      configJson: Record<string, unknown>;
      globalPrompt: string | null;
      ragEnabled: boolean;
      ragConfigId: string | null;
      voiceConfigId: string | null;
    }
    const activeVersion = agent.activeVersion as ActiveVersionType;
    let configJson = activeVersion.configJson;
    let globalPrompt = activeVersion.globalPrompt;
    let ragEnabled = activeVersion.ragEnabled;
    let ragConfigId = activeVersion.ragConfigId;
    let voiceConfigId = activeVersion.voiceConfigId;

    // Apply workflow draft changes if dirty
    if (isWorkflowDirty && workflowDraft?.config) {
      configJson = workflowDraft.config;
    }

    // Apply settings draft changes if dirty
    if (isSettingsDirty && settingsDraft) {
      const llmConfig = {
        enabled: settingsDraft.llmEnabled,
        model_name: settingsDraft.llmModel,
        temperature: settingsDraft.llmTemperature,
        max_tokens: settingsDraft.llmMaxTokens,
        service_tier: settingsDraft.llmServiceTier,
      };

      // Build TTS config from draft - tuning params in workflow.tts per AGENT_JSON_SCHEMA.md
      // Note: voice_name is NOT included - voice selection is via voiceConfigId FK
      const ttsConfig = {
        enabled: settingsDraft.ttsEnabled,
        model: settingsDraft.tts.model,
        stability: settingsDraft.tts.stability,
        similarity_boost: settingsDraft.tts.similarityBoost,
        style: settingsDraft.tts.style,
        use_speaker_boost: settingsDraft.tts.useSpeakerBoost,
        enable_ssml_parsing: settingsDraft.tts.enableSsmlParsing,
        pronunciation_dictionaries_enabled: settingsDraft.tts.pronunciationDictionariesEnabled,
        pronunciation_dictionary_ids: settingsDraft.tts.pronunciationDictionaryIds
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean),
        aggregate_sentences: settingsDraft.tts.aggregateSentences,
      };

      const existingWorkflow = configJson.workflow || {};
      configJson = {
        ...configJson,
        workflow: {
          ...existingWorkflow,
          // Note: global_prompt goes to DB column, not workflow JSON
          llm: llmConfig,
          tts: ttsConfig, // TTS tuning params inside workflow per AGENT_JSON_SCHEMA.md
        },
        // Remove deprecated root-level fields
        tts: undefined,
        stt: undefined,
        llm: undefined,
        rag: undefined,
        auto_hangup: { enabled: settingsDraft.autoHangupEnabled },
      };

      globalPrompt = settingsDraft.globalPrompt;
      ragEnabled = settingsDraft.ragEnabled;
      ragConfigId = settingsDraft.ragConfigId;
      voiceConfigId = settingsDraft.voiceConfigId;
    }

    // Store context and open dialog
    setSaveDialogContext({
      type: 'combined',
      config: configJson,
      ragEnabled,
      ragConfigId,
      voiceConfigId,
      globalPrompt,
    });
    setSaveDialogOpen(true);
  };

  // Handler that performs the actual save with user-provided notes
  const handleSaveWithNotes = async (notes: string) => {
    if (!saveDialogContext) return;

    const navigateTo = saveDialogContext.navigateAfterSave;

    try {
      await createVersion.mutateAsync({
        agentId,
        configJson: saveDialogContext.config || {},
        notes,
        globalPrompt: saveDialogContext.globalPrompt,
        ragEnabled: saveDialogContext.ragEnabled,
        ragConfigId: saveDialogContext.ragConfigId,
        voiceConfigId: saveDialogContext.voiceConfigId,
        autoActivate: true, // Auto-activate so changes are immediately visible
      });

      // Clear appropriate drafts based on save type
      if (saveDialogContext.type === 'workflow') {
        clearWorkflowDraft();
        toast.success('Workflow saved and activated');
      } else if (saveDialogContext.type === 'settings') {
        clearSettingsDraft();
        toast.success('Settings saved and activated');
      } else {
        clearAllDrafts();
        toast.success('Changes saved and activated');
      }

      setSaveDialogOpen(false);
      setSaveDialogContext(null);

      // Navigate if we were saving before navigating away
      if (navigateTo) {
        allowNavigationRef.current = true;
        router.push(navigateTo);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.getFullMessage()
          : 'Failed to save changes';
      toast.error(message);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="space-y-6">
        <Link href="/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              {error?.message || 'Agent not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
              <Badge variant="outline">
                <Activity className="mr-1 h-3 w-3" />
                Active
              </Badge>
              {isDirty && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            {agent.description && (
              <p className="text-muted-foreground mt-1">{agent.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCombinedSave}
              disabled={createVersion.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createVersion.isPending ? 'Saving...' : 'Save All Changes'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInitiateCallDialogOpen(true)}
            disabled={!agent.activeVersion}
            title={!agent.activeVersion ? 'Activate a version first to make calls' : 'Start an outbound call'}
          >
            <PhoneOutgoing className="mr-2 h-4 w-4" />
            Initiate Call
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Agent
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Version</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agent.activeVersion ? `v${agent.activeVersion.version}` : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {agent.versionCount} total version{agent.versionCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.callCount}</div>
            <p className="text-xs text-muted-foreground">
              <Link href={`/calls?agent=${agent.id}`} className="hover:underline">
                View call history
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Mappings</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.phoneMappingCount}</div>
            <p className="text-xs text-muted-foreground">
              {agent.phoneMappingCount > 0 ? 'Active numbers' : 'No numbers mapped'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{formatDateTime(agent.updatedAt)}</div>
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(agent.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow" className="relative">
            Workflow Editor
            {isWorkflowDirty && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="settings" className="relative">
            Settings
            {isSettingsDirty && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
            )}
          </TabsTrigger>
          {(agent.activeVersion as AgentActiveVersion)?.ragEnabled && (
            <TabsTrigger value="rag-query">
              <Database className="mr-1.5 h-4 w-4" />
              RAG Query
            </TabsTrigger>
          )}
          <TabsTrigger value="chat">
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Phone Numbers Section */}
          {phoneConfigs && phoneConfigs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Mapped Phone Numbers
                </CardTitle>
                <CardDescription>
                  Incoming calls to these numbers will be routed to this agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {phoneConfigs.map((phone) => (
                    <Link
                      key={phone.id}
                      href={`/settings/phone/${phone.id}`}
                      className="inline-flex"
                    >
                      <Badge
                        variant="secondary"
                        className="text-sm py-1.5 px-3 hover:bg-secondary/80 cursor-pointer"
                      >
                        <Phone className="h-3.5 w-3.5 mr-2" />
                        {formatPhoneNumber(phone.phoneNumber)}
                        {phone.name && (
                          <span className="ml-2 text-muted-foreground">
                            ({phone.name})
                          </span>
                        )}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Information</CardTitle>
                <CardDescription>Basic information about this agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Agent ID</div>
                  <div className="text-sm font-mono mt-1">{agent.id}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Name</div>
                  <div className="text-sm mt-1">{agent.name}</div>
                </div>
                {agent.description && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Description
                      </div>
                      <div className="text-sm mt-1">{agent.description}</div>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Tenant ID</div>
                  <div className="text-sm font-mono mt-1">{agent.tenantId}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Configuration</CardTitle>
                <CardDescription>Current workflow version details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.activeVersion ? (
                  <>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Version</div>
                      <div className="text-sm mt-1 flex items-center gap-2">
                        <Badge variant="default">v{agent.activeVersion.version}</Badge>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Created By
                      </div>
                      <div className="text-sm mt-1">
                        {agent.activeVersion.createdBy || 'Unknown'}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Created At
                      </div>
                      <div className="text-sm mt-1">
                        {formatDateTime(agent.activeVersion.createdAt)}
                      </div>
                    </div>
                    {agent.activeVersion.notes && (
                      <>
                        <Separator />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Notes
                          </div>
                          <div className="text-sm mt-1">{agent.activeVersion.notes}</div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active version configured
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Summary</CardTitle>
              <CardDescription>Overview of the current workflow configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {agent.activeVersion ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Initial Node
                      </div>
                      <div className="text-sm mt-1 font-mono">
                        {agent.activeVersion.configJson.workflow.initial_node}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Total Nodes
                      </div>
                      <div className="text-sm mt-1">
                        {agent.activeVersion.configJson.workflow.nodes.length}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTabChange('workflow')}
                    className="mt-2"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Workflow
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No workflow configuration available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Global Settings Overview */}
          {agent.activeVersion && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* LLM Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>LLM Configuration</CardTitle>
                  <CardDescription>Language model settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Enabled</div>
                      <div className="font-medium">
                        {(agent.activeVersion.configJson as AgentActiveVersion['configJson']).workflow?.llm?.enabled !== false ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Model</div>
                      <div className="font-mono text-xs">
                        {(agent.activeVersion.configJson as AgentActiveVersion['configJson']).workflow?.llm?.model_name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Temperature</div>
                      <div className="font-medium">
                        {(agent.activeVersion.configJson as AgentActiveVersion['configJson']).workflow?.llm?.temperature ?? 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Max Tokens</div>
                      <div className="font-medium">
                        {(agent.activeVersion.configJson as AgentActiveVersion['configJson']).workflow?.llm?.max_tokens || 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TTS Settings - Database-backed */}
              <Card>
                <CardHeader>
                  <CardTitle>TTS Configuration</CardTitle>
                  <CardDescription>Voice configuration (database-backed)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Selected Voice</div>
                      <div className="font-medium">
                        {voiceConfig?.name || 'Not Configured'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">TTS Enabled</div>
                      <div className="font-medium">
                        {(agent.activeVersion.configJson as AgentActiveVersion['configJson']).tts?.enabled !== false ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                  {voiceConfig?.description && (
                    <div className="text-xs text-muted-foreground">
                      {voiceConfig.description}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Voice/TTS settings are managed via shared configurations in Settings → Voice Configurations.
                  </div>
                </CardContent>
              </Card>

              {/* STT Settings - Environment-based */}
              <Card>
                <CardHeader>
                  <CardTitle>STT Configuration</CardTitle>
                  <CardDescription>Speech-to-text settings (system-wide)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    STT settings are configured via environment variables (DEEPGRAM_MODEL, AUDIO_SAMPLE_RATE).
                  </div>
                </CardContent>
              </Card>

              {/* RAG Settings - Database-backed */}
              <Card>
                <CardHeader>
                  <CardTitle>RAG Configuration</CardTitle>
                  <CardDescription>Knowledge base retrieval (database-backed)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">RAG Enabled</div>
                      <div className="font-medium">
                        {(agent.activeVersion as AgentActiveVersion).ragEnabled ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Configuration</div>
                      <div className="font-medium">
                        {(agent.activeVersion as AgentActiveVersion).ragConfigId ? 'Linked' : 'Not Configured'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    RAG settings are managed via shared configurations in Settings → RAG Configurations.
                  </div>
                </CardContent>
              </Card>

              {/* Auto Hangup Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Auto Hangup</CardTitle>
                  <CardDescription>Call termination settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium">
                      {agent.activeVersion.configJson.auto_hangup?.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Workflow Editor Tab */}
        <TabsContent value="workflow" className="space-y-4">
          {agent.activeVersion ? (
            <WorkflowEditorLayout
              key={agent.activeVersion.id}
              initialConfig={agent.activeVersion.configJson}
              onSave={handleWorkflowSave}
              agentId={agentId}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Editor</CardTitle>
                <CardDescription>No active workflow configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Active Configuration</p>
                  <p className="text-sm">
                    This agent does not have an active workflow version.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <VersionsTab agentId={agentId} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {agent.activeVersion ? (
            <SettingsForm
              key={agent.activeVersion.id}
              agentId={agentId}
              currentConfig={agent.activeVersion.configJson}
              globalPrompt={agent.activeVersion.globalPrompt}
              ragEnabled={agent.activeVersion.ragEnabled}
              ragConfigId={agent.activeVersion.ragConfigId}
              voiceConfigId={(agent.activeVersion as AgentActiveVersion)?.voiceConfigId}
              onSave={handleSettingsSave}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Agent Settings</CardTitle>
                <CardDescription>
                  Configure global settings for this agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Active Configuration</p>
                  <p className="text-sm">
                    This agent does not have an active workflow version.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RAG Query Tab - Only shown when RAG is enabled */}
        {(agent.activeVersion as AgentActiveVersion)?.ragEnabled && versions && (
          <TabsContent value="rag-query" className="space-y-4">
            <RagQueryTab
              agentId={agentId}
              versions={versions.map((v: { id: string; version: number; isActive: boolean; createdAt: Date }) => ({
                id: v.id,
                version: v.version,
                isActive: v.isActive,
                createdAt: v.createdAt,
              }))}
            />
          </TabsContent>
        )}

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <ChatSessionProvider agentId={agentId}>
            <ChatTab hasActiveVersion={!!agent.activeVersion} />
          </ChatSessionProvider>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <DeleteAgentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        agent={agent}
      />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onAction={handleUnsavedAction}
        isNavigatingAway={!!pendingNavigation}
        isSaving={isSavingFromDialog}
      />

      {/* Save Version Dialog */}
      <SaveVersionDialog
        open={saveDialogOpen}
        onOpenChange={(open) => {
          setSaveDialogOpen(open);
          if (!open) setSaveDialogContext(null);
        }}
        onSave={handleSaveWithNotes}
        isSaving={createVersion.isPending}
      />

      {/* Initiate Call Dialog */}
      <InitiateCallDialog
        open={initiateCallDialogOpen}
        onOpenChange={setInitiateCallDialogOpen}
        agent={{ id: agent.id, name: agent.name }}
        phoneConfigs={phoneConfigs || []}
      />
    </div>
  );
}

// Wrapper component with provider
export function AgentDetailClient({ agentId }: AgentDetailClientProps) {
  return (
    <AgentDraftProvider>
      <AgentDetailContent agentId={agentId} />
    </AgentDraftProvider>
  );
}
