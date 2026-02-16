"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ArrowLeft,
  Settings,
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
  BrainCircuit,
  Volume2,
  PhoneOff,
  Network,
  Download,
  Copy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";
import {
  useAgent,
  useCreateVersion,
  useAgentVersions,
  useExportAgent,
} from "@/lib/hooks/use-agents";
import { ApiError } from "@/lib/hooks/factories/create-api-hooks";
import { useAgentPhoneConfigs } from "@/lib/hooks/use-phone-configs";
import { useVoiceConfig } from "@/lib/hooks/use-voice-configs";
import { formatDateTime, formatPhoneNumber } from "@/lib/utils/formatters";
import { DeleteAgentDialog } from "./dialogs/delete-agent-dialog";
import { InitiateCallDialog } from "./dialogs/initiate-call-dialog";
import {
  UnsavedChangesDialog,
  UnsavedChangesAction,
} from "./dialogs/unsaved-changes-dialog";
import { SaveVersionDialog } from "./dialogs/save-version-dialog";
import { WorkflowEditorLayout } from "./workflow-editor/workflow-editor-layout";
import { SettingsForm } from "./settings-form";
import { VersionsTab } from "./versions-tab";
import { RagQueryTab } from "./rag-query-tab";
import { ChatTab } from "./chat-tab";
import { ChatSessionProvider } from "./contexts/chat-session-context";
import {
  AgentDraftProvider,
  useAgentDraft,
  useUnsavedChangesWarning,
} from "./contexts/agent-draft-context";
import { toast } from "sonner";

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
      nodes?: Array<{ id: string; name: string; type?: string }>;
      initial_node?: string;
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

const NODE_TYPE_LABELS: Record<string, string> = {
  standard: "Conversation",
  retrieve_variable: "Variable",
  end_call: "End Call",
  agent_transfer: "Transfer",
  api_call: "API Call",
};

function SettingsOverviewItem({
  icon: Icon,
  title,
  enabled,
  detail,
  onConfigure,
}: {
  icon: LucideIcon;
  title: string;
  enabled: boolean;
  detail: string;
  onConfigure: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          <Badge
            variant="secondary"
            className={
              enabled
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                : "text-xs"
            }
          >
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {detail}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onConfigure}
        className="h-8 w-8 shrink-0"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Inner component that uses the context
function AgentDetailContent({ agentId }: AgentDetailClientProps) {
  const router = useRouter();
  const { isFocusMode } = useSidebar();
  const { data: agent, isLoading, error } = useAgent(agentId);
  const { data: phoneConfigs } = useAgentPhoneConfigs(agentId);

  // Get voice config ID from active version
  const voiceConfigId = (agent?.activeVersion as AgentActiveVersion | undefined)
    ?.voiceConfigId;
  const { data: voiceConfig } = useVoiceConfig(voiceConfigId || "");

  // Get versions for RAG Query tab
  const { data: versions } = useAgentVersions(agentId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [initiateCallDialogOpen, setInitiateCallDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const createVersion = useCreateVersion();
  const exportAgent = useExportAgent();

  // Unsaved changes dialog state
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const isSavingFromDialog = false; // Currently not used but kept for UnsavedChangesDialog prop

  // Save version dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogContext, setSaveDialogContext] = useState<{
    type: "workflow" | "settings" | "combined";
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

  // Export agent config as JSON file
  const handleExport = useCallback(async () => {
    try {
      const result = await exportAgent.mutateAsync({ agentId });
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (result.agent_name || "agent")
        .replace(/[^a-z0-9-_]/gi, "-")
        .toLowerCase();
      a.download = `${safeName}-v${result.version}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.agent_name} v${result.version}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }, [agentId, exportAgent]);

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
      const anchor = target.closest("a");
      if (!anchor) return;

      // Get the href
      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only intercept internal navigation (starts with /)
      if (!href.startsWith("/")) return;

      // Don't intercept navigation within the current agent page
      if (href.startsWith(`/agents/${agentId}`)) return;

      // Intercept the navigation
      e.preventDefault();
      e.stopPropagation();
      setPendingNavigation(href);
      setUnsavedDialogOpen(true);
    };

    // Add listener with capture to intercept before navigation
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty, agentId]);

  // Combined save that includes navigation after save
  const handleCombinedSaveWithNavigation = useCallback(
    (navigateTo: string | null) => {
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
          ...(settingsDraft.llmProviderId && {
            provider_id: settingsDraft.llmProviderId,
          }),
          temperature: settingsDraft.llmTemperature,
          max_tokens: settingsDraft.llmMaxTokens,
          service_tier: settingsDraft.llmServiceTier,
        };

        // Build extraction LLM config from draft per AGENT_JSON_SCHEMA.md
        // Note: temperature intentionally omitted - extraction LLM uses model built-in defaults
        const extractionLlmConfig = settingsDraft.extractionLlm.enabled
          ? {
              enabled: true,
              ...(settingsDraft.extractionLlm.providerId && {
                provider_id: settingsDraft.extractionLlm.providerId,
              }),
              max_tokens: settingsDraft.extractionLlm.maxTokens,
            }
          : { enabled: false };

        const ttsConfig = {
          enabled: settingsDraft.ttsEnabled,
          model: settingsDraft.tts.model,
          stability: settingsDraft.tts.stability,
          similarity_boost: settingsDraft.tts.similarityBoost,
          style: settingsDraft.tts.style,
          use_speaker_boost: settingsDraft.tts.useSpeakerBoost,
          enable_ssml_parsing: settingsDraft.tts.enableSsmlParsing,
          pronunciation_dictionaries_enabled:
            settingsDraft.tts.pronunciationDictionariesEnabled,
          pronunciation_dictionary_ids:
            settingsDraft.tts.pronunciationDictionaryIds
              .split(",")
              .map((id: string) => id.trim())
              .filter(Boolean),
          aggregate_sentences: settingsDraft.tts.aggregateSentences,
        };

        // Build post-call analysis config with provider_id per AGENT_JSON_SCHEMA.md
        const postCallAnalysisConfig = settingsDraft.postCallAnalysis.enabled
          ? {
              enabled: true,
              ...(settingsDraft.postCallAnalysis.providerId && {
                provider_id: settingsDraft.postCallAnalysis.providerId,
              }),
              ...(settingsDraft.postCallAnalysis.questions.length > 0 && {
                questions: settingsDraft.postCallAnalysis.questions.map(
                  (q) => ({
                    name: q.name,
                    ...(q.description && { description: q.description }),
                    ...(q.type !== "string" && { type: q.type }),
                    ...(q.type === "enum" &&
                      q.choices.length > 0 && {
                        choices: q.choices.map((c) => ({
                          value: c.value,
                          ...(c.label && { label: c.label }),
                        })),
                      }),
                    ...(q.required && { required: q.required }),
                  }),
                ),
              }),
              ...(settingsDraft.postCallAnalysis.additionalInstructions && {
                additional_instructions:
                  settingsDraft.postCallAnalysis.additionalInstructions,
              }),
            }
          : { enabled: false };

        const currentWorkflow =
          typeof configJson.workflow === "object" &&
          configJson.workflow !== null
            ? (configJson.workflow as Record<string, unknown>)
            : {};
        configJson = {
          ...configJson,
          workflow: {
            ...currentWorkflow,
            llm: llmConfig,
            extraction_llm: extractionLlmConfig, // Extraction LLM for variable extraction/intent classification
            tts: ttsConfig,
            post_call_analysis: postCallAnalysisConfig, // Post-call analysis with provider_id
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
        type: "combined",
        config: configJson,
        ragEnabled,
        ragConfigId,
        voiceConfigId,
        globalPrompt,
        navigateAfterSave: navigateTo || undefined,
      });
      setSaveDialogOpen(true);
    },
    [agent, isWorkflowDirty, workflowDraft, isSettingsDirty, settingsDraft],
  );

  // Handle unsaved changes dialog action
  const handleUnsavedAction = useCallback(
    async (action: UnsavedChangesAction) => {
      if (action === "cancel") {
        setUnsavedDialogOpen(false);
        setPendingNavigation(null);
        return;
      }

      if (action === "discard") {
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

      if (action === "save") {
        // Close unsaved dialog and open save notes dialog with navigation context
        setUnsavedDialogOpen(false);
        // Trigger combined save which will open the notes dialog
        // Pass the pending navigation to continue after save
        handleCombinedSaveWithNavigation(pendingNavigation);
        setPendingNavigation(null);
      }
    },
    [
      pendingNavigation,
      router,
      clearAllDrafts,
      handleCombinedSaveWithNavigation,
    ],
  );

  // Handler for settings form - opens dialog to get notes, then saves
  // voiceConfigId is FK to voice_configs table (voice selection)
  // TTS tuning params are in configJson.workflow.tts
  const handleSettingsSave = async (
    config: Record<string, unknown>,
    ragEnabled?: boolean,
    ragConfigId?: string | null,
    voiceConfigId?: string | null,
    globalPrompt?: string | null,
  ) => {
    // Store context and open dialog
    setSaveDialogContext({
      type: "settings",
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
      type: "workflow",
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
        ...(settingsDraft.llmProviderId && {
          provider_id: settingsDraft.llmProviderId,
        }),
        temperature: settingsDraft.llmTemperature,
        max_tokens: settingsDraft.llmMaxTokens,
        service_tier: settingsDraft.llmServiceTier,
      };

      // Build extraction LLM config from draft per AGENT_JSON_SCHEMA.md
      // Note: temperature intentionally omitted - extraction LLM uses model built-in defaults
      const extractionLlmConfig = settingsDraft.extractionLlm.enabled
        ? {
            enabled: true,
            ...(settingsDraft.extractionLlm.providerId && {
              provider_id: settingsDraft.extractionLlm.providerId,
            }),
            max_tokens: settingsDraft.extractionLlm.maxTokens,
          }
        : { enabled: false };

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
        pronunciation_dictionaries_enabled:
          settingsDraft.tts.pronunciationDictionariesEnabled,
        pronunciation_dictionary_ids:
          settingsDraft.tts.pronunciationDictionaryIds
            .split(",")
            .map((id: string) => id.trim())
            .filter(Boolean),
        aggregate_sentences: settingsDraft.tts.aggregateSentences,
      };

      // Build post-call analysis config with provider_id per AGENT_JSON_SCHEMA.md
      const postCallAnalysisConfig = settingsDraft.postCallAnalysis.enabled
        ? {
            enabled: true,
            ...(settingsDraft.postCallAnalysis.providerId && {
              provider_id: settingsDraft.postCallAnalysis.providerId,
            }),
            ...(settingsDraft.postCallAnalysis.questions.length > 0 && {
              questions: settingsDraft.postCallAnalysis.questions.map((q) => ({
                name: q.name,
                ...(q.description && { description: q.description }),
                ...(q.type !== "string" && { type: q.type }),
                ...(q.type === "enum" &&
                  q.choices.length > 0 && {
                    choices: q.choices.map((c) => ({
                      value: c.value,
                      ...(c.label && { label: c.label }),
                    })),
                  }),
                ...(q.required && { required: q.required }),
              })),
            }),
            ...(settingsDraft.postCallAnalysis.additionalInstructions && {
              additional_instructions:
                settingsDraft.postCallAnalysis.additionalInstructions,
            }),
          }
        : { enabled: false };

      const existingWorkflow = configJson.workflow || {};
      configJson = {
        ...configJson,
        workflow: {
          ...existingWorkflow,
          // Note: global_prompt goes to DB column, not workflow JSON
          llm: llmConfig,
          extraction_llm: extractionLlmConfig, // Extraction LLM for variable extraction/intent classification
          tts: ttsConfig, // TTS tuning params inside workflow per AGENT_JSON_SCHEMA.md
          post_call_analysis: postCallAnalysisConfig, // Post-call analysis with provider_id
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
      type: "combined",
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
      if (saveDialogContext.type === "workflow") {
        clearWorkflowDraft();
        toast.success("Workflow saved and activated");
      } else if (saveDialogContext.type === "settings") {
        clearSettingsDraft();
        toast.success("Settings saved and activated");
      } else {
        clearAllDrafts();
        toast.success("Changes saved and activated");
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
          : "Failed to save changes";
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
              {error?.message || "Agent not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(!isFocusMode && "space-y-6")}>
      {/* Header - hidden in focus mode */}
      {!isFocusMode && (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {agent.name}
                </h1>
                {isDirty && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  >
                    Unsaved Changes
                  </Badge>
                )}
              </div>
              {agent.description && (
                <p className="text-muted-foreground mt-1">
                  {agent.description}
                </p>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(agent.id);
                  toast.success("Agent ID copied to clipboard");
                }}
                className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-xs text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground transition-all"
                title="Click to copy Agent ID"
              >
                <span className="text-muted-foreground/70 font-sans">ID:</span>
                {agent.id}
                <Copy className="h-3 w-3 shrink-0" />
              </button>
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
                {createVersion.isPending ? "Saving..." : "Save All Changes"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInitiateCallDialogOpen(true)}
              disabled={!agent.activeVersion}
              title={
                !agent.activeVersion
                  ? "Activate a version first to make calls"
                  : "Start an outbound call"
              }
            >
              <PhoneOutgoing className="mr-2 h-4 w-4" />
              Initiate Call
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!agent.activeVersion || exportAgent.isPending}
              title={
                !agent.activeVersion
                  ? "Activate a version first to export"
                  : "Export agent config as JSON"
              }
            >
              <Download className="mr-2 h-4 w-4" />
              {exportAgent.isPending ? "Exporting..." : "Export"}
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
      )}

      {/* Stats Cards - hidden in focus mode */}
      {!isFocusMode && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Version
              </CardTitle>
              <FileCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agent.activeVersion
                  ? `v${agent.activeVersion.version}`
                  : "None"}
              </div>
              <p className="text-xs text-muted-foreground">
                {agent.versionCount} total version
                {agent.versionCount !== 1 ? "s" : ""}
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
                <Link
                  href={`/calls?agent=${agent.id}`}
                  className="hover:underline"
                >
                  View call history
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Phone Mappings
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agent.phoneMappingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {agent.phoneMappingCount > 0
                  ? "Active numbers"
                  : "No numbers mapped"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Updated
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {formatDateTime(agent.updatedAt)}
              </div>
              <p className="text-xs text-muted-foreground">
                Created {formatDateTime(agent.createdAt)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className={cn(!isFocusMode && "space-y-4")}
      >
        {/* Tab list - hidden in focus mode */}
        {!isFocusMode && (
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
        )}

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 items-start">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Active Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileCode className="h-5 w-5 text-primary" />
                    </div>
                    Active Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agent.activeVersion ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="default">
                          v{agent.activeVersion.version}
                        </Badge>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-muted-foreground">
                          Active
                        </span>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Created by
                          </span>
                          <span className="font-medium">
                            {agent.activeVersion.createdBy || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">
                            {formatDateTime(agent.activeVersion.createdAt)}
                          </span>
                        </div>
                        {agent.activeVersion.notes && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Notes</span>
                            <span className="font-medium truncate max-w-[200px]">
                              {agent.activeVersion.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No active version configured
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Phone Numbers Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    Mapped Phone Numbers
                  </CardTitle>
                  <CardDescription>
                    Incoming calls to these numbers will be routed to this agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {phoneConfigs && phoneConfigs.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No phone numbers mapped
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Workflow Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Network className="h-5 w-5 text-primary" />
                    </div>
                    Workflow Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agent.activeVersion ? (
                    (() => {
                      const config = agent.activeVersion
                        .configJson as AgentActiveVersion["configJson"];
                      const nodes = config.workflow?.nodes || [];
                      const initialNode = config.workflow?.initial_node;
                      const typeCounts: Record<string, number> = {};
                      for (const node of nodes) {
                        const type = node.type || "standard";
                        typeCounts[type] = (typeCounts[type] || 0) + 1;
                      }
                      return (
                        <div className="space-y-3">
                          <div className="grid gap-2 text-sm">
                            {initialNode && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Entry point
                                </span>
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                                  {initialNode}
                                </code>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Total nodes
                              </span>
                              <span className="font-medium">
                                {nodes.length}
                              </span>
                            </div>
                          </div>
                          {Object.keys(typeCounts).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(typeCounts).map(
                                ([type, count]) => (
                                  <Badge
                                    key={type}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {NODE_TYPE_LABELS[type] || type}: {count}
                                  </Badge>
                                ),
                              )}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTabChange("workflow")}
                            className="mt-1"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Workflow
                          </Button>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No workflow configuration available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Global Settings Overview */}
              {agent.activeVersion &&
                (() => {
                  const config = agent.activeVersion
                    .configJson as AgentActiveVersion["configJson"];
                  const activeVer = agent.activeVersion as AgentActiveVersion;
                  const llmEnabled = config.workflow?.llm?.enabled !== false;
                  const ttsEnabled = config.workflow?.tts?.enabled !== false;
                  const ragEnabled = activeVer.ragEnabled;
                  const autoHangupEnabled = !!config.auto_hangup?.enabled;
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Settings className="h-5 w-5 text-primary" />
                          </div>
                          Global Settings
                        </CardTitle>
                        <CardDescription className="flex justify-end">
                          <Button
                            variant="link"
                            size="sm"
                            className="text-xs h-auto p-0"
                            onClick={() => handleTabChange("settings")}
                          >
                            Open full settings
                          </Button>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <SettingsOverviewItem
                            icon={BrainCircuit}
                            title="LLM"
                            enabled={llmEnabled}
                            detail={
                              config.workflow?.llm?.model_name ||
                              "Default model"
                            }
                            onConfigure={() => handleTabChange("settings")}
                          />
                          <SettingsOverviewItem
                            icon={Volume2}
                            title="Voice / TTS"
                            enabled={ttsEnabled}
                            detail={voiceConfig?.name || "Not configured"}
                            onConfigure={() => handleTabChange("settings")}
                          />
                          <SettingsOverviewItem
                            icon={Database}
                            title="RAG"
                            enabled={ragEnabled}
                            detail={
                              ragEnabled
                                ? "Configuration linked"
                                : "Not configured"
                            }
                            onConfigure={() => handleTabChange("settings")}
                          />
                          <SettingsOverviewItem
                            icon={PhoneOff}
                            title="Auto Hangup"
                            enabled={autoHangupEnabled}
                            detail={
                              autoHangupEnabled
                                ? "Calls auto-terminate"
                                : "Manual only"
                            }
                            onConfigure={() => handleTabChange("settings")}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
            </div>
          </div>
        </TabsContent>

        {/* Workflow Editor Tab */}
        <TabsContent value="workflow" className="space-y-4">
          {agent.activeVersion ? (
            <WorkflowEditorLayout
              key={agent.activeVersion.id}
              initialConfig={agent.activeVersion.configJson}
              onSave={handleWorkflowSave}
              agentId={agentId}
              agentName={agent.name}
              isDirty={isDirty}
              onSaveAll={handleCombinedSave}
              isSaving={createVersion.isPending}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Editor</CardTitle>
                <CardDescription>
                  No active workflow configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    No Active Configuration
                  </p>
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
              voiceConfigId={
                (agent.activeVersion as AgentActiveVersion)?.voiceConfigId
              }
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
                  <p className="text-lg font-medium mb-2">
                    No Active Configuration
                  </p>
                  <p className="text-sm">
                    This agent does not have an active workflow version.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RAG Query Tab - Only shown when RAG is enabled */}
        {(agent.activeVersion as AgentActiveVersion)?.ragEnabled &&
          versions && (
            <TabsContent value="rag-query" className="space-y-4">
              <RagQueryTab
                agentId={agentId}
                versions={versions.map(
                  (v: {
                    id: string;
                    version: number;
                    isActive: boolean;
                    createdAt: Date;
                  }) => ({
                    id: v.id,
                    version: v.version,
                    isActive: v.isActive,
                    createdAt: v.createdAt,
                  }),
                )}
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
