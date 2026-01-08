'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Database, Volume2, Phone, AlertTriangle, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRagConfigsDropdown, useRagConfig } from '@/lib/hooks/use-rag-configs';
import { useVoiceConfigsDropdown } from '@/lib/hooks/use-voice-configs';
import { useAgentPhoneConfigs } from '@/lib/hooks/use-phone-configs';
import { useLlmModelsDropdown } from '@/lib/hooks/use-llm-configs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { ttsModels } from '@/lib/validations/voice-configs';
import { useAgentDraft, SettingsDraft, TtsDraft, RagDraft } from './contexts/agent-draft-context';

// Safe hook to get draft context (returns null if not in provider)
function useOptionalAgentDraft() {
  try {
    return useAgentDraft();
  } catch {
    return null;
  }
}

// Config type for settings form
interface SettingsConfig {
  workflow?: {
    llm?: {
      enabled?: boolean;
      model_name?: string;
      temperature?: number;
      max_tokens?: number;
      service_tier?: 'auto' | 'default' | 'flex';
    };
    tts?: {
      enabled?: boolean;
      voice_name?: string;
      model?: string;
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
      enable_ssml_parsing?: boolean;
      pronunciation_dictionaries_enabled?: boolean;
      pronunciation_dictionary_ids?: string[];
      aggregate_sentences?: boolean;
    };
    rag?: {
      override_enabled?: boolean;
      search_mode?: 'vector' | 'fts' | 'hybrid';
      top_k?: number;
      rrf_k?: number;
      vector_weight?: number;
      fts_weight?: number;
    };
    [key: string]: unknown;
  };
  tts?: { enabled?: boolean };
  auto_hangup?: { enabled?: boolean };
  [key: string]: unknown;
}

interface SettingsFormProps {
  agentId: string;
  currentConfig: SettingsConfig;
  globalPrompt?: string | null;
  ragEnabled?: boolean;
  ragConfigId?: string | null;
  voiceConfigId?: string | null;
  onSave: (config: SettingsConfig, ragEnabled?: boolean, ragConfigId?: string | null, voiceConfigId?: string | null, globalPrompt?: string | null) => Promise<void>;
}

export function SettingsForm({ agentId, currentConfig, globalPrompt: initialGlobalPrompt, ragEnabled: initialRagEnabled, ragConfigId: initialRagConfigId, voiceConfigId: initialVoiceConfigId, onSave }: SettingsFormProps) {
  const [, setIsSaving] = useState(false);

  // Get draft context (optional - component can work without it)
  const draftContext = useOptionalAgentDraft();

  // Fetch available RAG configs
  const { data: ragConfigs } = useRagConfigsDropdown();

  // Fetch available Voice configs
  const { data: voiceConfigs } = useVoiceConfigsDropdown();

  // Fetch phone configs mapped to this agent
  const { data: agentPhoneConfigs } = useAgentPhoneConfigs(agentId);

  // Fetch available LLM models for dropdown
  const { data: llmModels } = useLlmModelsDropdown();

  // Get initial values from draft or props
  const getInitialValue = <T,>(draftValue: T | undefined, propValue: T): T => {
    return draftContext?.settingsDraft ? (draftValue as T) : propValue;
  };

  // RAG Config Selection
  const [selectedRagConfigId, setSelectedRagConfigId] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.ragConfigId ?? undefined, initialRagConfigId || '')
  );
  const [ragEnabledState, setRagEnabledState] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.ragEnabled, initialRagEnabled ?? false)
  );

  // RAG Tuning Parameters (stored in workflow.rag per AGENT_JSON_SCHEMA.md)
  const workflowRag = currentConfig.workflow?.rag;
  const defaultRag: RagDraft = {
    searchMode: 'hybrid',
    topK: 5,
    rrfK: 60,
    vectorWeight: 0.6,
    ftsWeight: 0.4,
  };

  const [ragOverrideEnabled, setRagOverrideEnabled] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.ragOverrideEnabled, workflowRag?.override_enabled ?? false)
  );
  const [ragSearchMode, setRagSearchMode] = useState<'vector' | 'fts' | 'hybrid'>(() =>
    getInitialValue(draftContext?.settingsDraft?.rag?.searchMode, workflowRag?.search_mode ?? defaultRag.searchMode)
  );
  const [ragTopK, setRagTopK] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.rag?.topK, workflowRag?.top_k ?? defaultRag.topK)
  );
  const [ragRrfK, setRagRrfK] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.rag?.rrfK, workflowRag?.rrf_k ?? defaultRag.rrfK)
  );
  const [ragVectorWeight, setRagVectorWeight] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.rag?.vectorWeight, workflowRag?.vector_weight ?? defaultRag.vectorWeight)
  );
  const [ragFtsWeight, setRagFtsWeight] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.rag?.ftsWeight, workflowRag?.fts_weight ?? defaultRag.ftsWeight)
  );

  // Voice Config Selection - initialize from workflow.tts.voice_name if no ID provided
  const workflowTtsVoiceName = currentConfig.workflow?.tts?.voice_name;
  const [selectedVoiceConfigId, setSelectedVoiceConfigId] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.voiceConfigId ?? undefined, initialVoiceConfigId || '')
  );

  // Look up voice config ID from voice_name when voice configs are loaded
  useEffect(() => {
    if (voiceConfigs && workflowTtsVoiceName && !selectedVoiceConfigId) {
      const matchingVoice = voiceConfigs.find(
        (v) => v.name.toLowerCase() === workflowTtsVoiceName.toLowerCase()
      );
      if (matchingVoice) {
        setSelectedVoiceConfigId(matchingVoice.id);
      }
    }
  }, [voiceConfigs, workflowTtsVoiceName, selectedVoiceConfigId]);

  // Fetch selected RAG config details for preview
  const { data: selectedRagConfig } = useRagConfig(selectedRagConfigId || '');

  // LLM Settings (stored in workflow.llm per AGENT_JSON_SCHEMA.md)
  const workflowLlm = currentConfig.workflow?.llm;
  const [llmEnabled, setLlmEnabled] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.llmEnabled, workflowLlm?.enabled ?? true)
  );
  const [llmModel, setLlmModel] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.llmModel, workflowLlm?.model_name || 'gpt-4o-mini')
  );
  const [llmTemperature, setLlmTemperature] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.llmTemperature, workflowLlm?.temperature ?? 1.0)
  );
  const [llmMaxTokens, setLlmMaxTokens] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.llmMaxTokens, workflowLlm?.max_tokens ?? 150)
  );
  const [llmServiceTier, setLlmServiceTier] = useState<'auto' | 'default' | 'flex'>(() =>
    getInitialValue(draftContext?.settingsDraft?.llmServiceTier, workflowLlm?.service_tier || 'auto') as 'auto' | 'default' | 'flex'
  );

  // TTS Settings (stored in workflow.tts per AGENT_JSON_SCHEMA.md)
  // Note: Read from workflow.tts.enabled, with fallback to root tts.enabled for backwards compatibility
  const [ttsEnabled, setTtsEnabled] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.ttsEnabled, currentConfig.workflow?.tts?.enabled ?? currentConfig.tts?.enabled ?? true)
  );

  // TTS Tuning Parameters (stored in workflow.tts per AGENT_JSON_SCHEMA.md)
  const workflowTts = currentConfig.workflow?.tts;
  const defaultTts: TtsDraft = {
    model: 'eleven_turbo_v2_5',
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
    enableSsmlParsing: false,
    pronunciationDictionariesEnabled: true,
    pronunciationDictionaryIds: '',
    aggregateSentences: true,
  };

  const [ttsModel, setTtsModel] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.model, workflowTts?.model ?? defaultTts.model)
  );
  const [ttsStability, setTtsStability] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.stability, workflowTts?.stability ?? defaultTts.stability)
  );
  const [ttsSimilarityBoost, setTtsSimilarityBoost] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.similarityBoost, workflowTts?.similarity_boost ?? defaultTts.similarityBoost)
  );
  const [ttsStyle, setTtsStyle] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.style, workflowTts?.style ?? defaultTts.style)
  );
  const [ttsUseSpeakerBoost, setTtsUseSpeakerBoost] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.useSpeakerBoost, workflowTts?.use_speaker_boost ?? defaultTts.useSpeakerBoost)
  );
  const [ttsEnableSsmlParsing, setTtsEnableSsmlParsing] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.enableSsmlParsing, workflowTts?.enable_ssml_parsing ?? defaultTts.enableSsmlParsing)
  );
  const [ttsPronunciationEnabled, setTtsPronunciationEnabled] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.pronunciationDictionariesEnabled, workflowTts?.pronunciation_dictionaries_enabled ?? defaultTts.pronunciationDictionariesEnabled)
  );
  const [ttsPronunciationDictionaryIds, setTtsPronunciationDictionaryIds] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.pronunciationDictionaryIds, workflowTts?.pronunciation_dictionary_ids?.join(', ') ?? defaultTts.pronunciationDictionaryIds)
  );
  const [ttsAggregateSentences, setTtsAggregateSentences] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.tts?.aggregateSentences, workflowTts?.aggregate_sentences ?? defaultTts.aggregateSentences)
  );

  // Workflow Settings
  const [globalPrompt, setGlobalPrompt] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.globalPrompt, initialGlobalPrompt || '')
  );

  // Other Settings
  const [autoHangupEnabled, setAutoHangupEnabled] = useState(() =>
    getInitialValue(draftContext?.settingsDraft?.autoHangupEnabled, currentConfig.auto_hangup?.enabled ?? true)
  );

  // Track initial state for dirty detection
  const initialStateRef = useRef<string>('');

  // Build current settings state for comparison
  const getCurrentSettingsState = useCallback((): SettingsDraft => ({
    globalPrompt,
    llmEnabled,
    llmModel,
    llmTemperature,
    llmMaxTokens,
    llmServiceTier,
    ttsEnabled,
    tts: {
      model: ttsModel,
      stability: ttsStability,
      similarityBoost: ttsSimilarityBoost,
      style: ttsStyle,
      useSpeakerBoost: ttsUseSpeakerBoost,
      enableSsmlParsing: ttsEnableSsmlParsing,
      pronunciationDictionariesEnabled: ttsPronunciationEnabled,
      pronunciationDictionaryIds: ttsPronunciationDictionaryIds,
      aggregateSentences: ttsAggregateSentences,
    },
    ragEnabled: ragEnabledState,
    ragConfigId: selectedRagConfigId || null,
    ragOverrideEnabled,
    rag: {
      searchMode: ragSearchMode,
      topK: ragTopK,
      rrfK: ragRrfK,
      vectorWeight: ragVectorWeight,
      ftsWeight: ragFtsWeight,
    },
    voiceConfigId: selectedVoiceConfigId || null,
    autoHangupEnabled,
  }), [
    globalPrompt, llmEnabled, llmModel, llmTemperature, llmMaxTokens,
    llmServiceTier, ttsEnabled, ttsModel, ttsStability, ttsSimilarityBoost,
    ttsStyle, ttsUseSpeakerBoost, ttsEnableSsmlParsing, ttsPronunciationEnabled,
    ttsPronunciationDictionaryIds, ttsAggregateSentences, ragEnabledState, selectedRagConfigId,
    ragOverrideEnabled, ragSearchMode, ragTopK, ragRrfK, ragVectorWeight, ragFtsWeight,
    selectedVoiceConfigId, autoHangupEnabled
  ]);

  // Store initial state on mount
  useEffect(() => {
    // Read ttsEnabled from workflow.tts.enabled with fallback to root tts.enabled for backwards compatibility
    const initialTtsEnabled = currentConfig.workflow?.tts?.enabled ?? currentConfig.tts?.enabled ?? true;
    const initialSettings: SettingsDraft = {
      globalPrompt: initialGlobalPrompt || '',
      llmEnabled: workflowLlm?.enabled ?? true,
      llmModel: workflowLlm?.model_name || 'gpt-4o-mini',
      llmTemperature: workflowLlm?.temperature ?? 1.0,
      llmMaxTokens: workflowLlm?.max_tokens ?? 150,
      llmServiceTier: workflowLlm?.service_tier || 'auto',
      ttsEnabled: initialTtsEnabled,
      tts: {
        model: workflowTts?.model ?? defaultTts.model,
        stability: workflowTts?.stability ?? defaultTts.stability,
        similarityBoost: workflowTts?.similarity_boost ?? defaultTts.similarityBoost,
        style: workflowTts?.style ?? defaultTts.style,
        useSpeakerBoost: workflowTts?.use_speaker_boost ?? defaultTts.useSpeakerBoost,
        enableSsmlParsing: workflowTts?.enable_ssml_parsing ?? defaultTts.enableSsmlParsing,
        pronunciationDictionariesEnabled: workflowTts?.pronunciation_dictionaries_enabled ?? defaultTts.pronunciationDictionariesEnabled,
        pronunciationDictionaryIds: workflowTts?.pronunciation_dictionary_ids?.join(', ') ?? defaultTts.pronunciationDictionaryIds,
        aggregateSentences: workflowTts?.aggregate_sentences ?? defaultTts.aggregateSentences,
      },
      ragEnabled: initialRagEnabled ?? false,
      ragConfigId: initialRagConfigId || null,
      ragOverrideEnabled: workflowRag?.override_enabled ?? false,
      rag: {
        searchMode: workflowRag?.search_mode ?? defaultRag.searchMode,
        topK: workflowRag?.top_k ?? defaultRag.topK,
        rrfK: workflowRag?.rrf_k ?? defaultRag.rrfK,
        vectorWeight: workflowRag?.vector_weight ?? defaultRag.vectorWeight,
        ftsWeight: workflowRag?.fts_weight ?? defaultRag.ftsWeight,
      },
      voiceConfigId: initialVoiceConfigId || null,
      autoHangupEnabled: currentConfig.auto_hangup?.enabled ?? true,
    };
    initialStateRef.current = JSON.stringify(initialSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: capture initial state only once on mount
  }, []);

  // Sync current state to draft context and track dirty state
  // Use a ref for draftContext to avoid circular updates
  const draftContextRef = useRef(draftContext);
  draftContextRef.current = draftContext;

  useEffect(() => {
    if (!initialStateRef.current) return;

    const currentSettings = getCurrentSettingsState();
    const currentState = JSON.stringify(currentSettings);
    const isDirty = currentState !== initialStateRef.current;

    if (draftContextRef.current) {
      draftContextRef.current.setIsSettingsDirty(isDirty);
      if (isDirty) {
        draftContextRef.current.setSettingsDraft(currentSettings);
      } else {
        draftContextRef.current.setSettingsDraft(null);
      }
    }
  }, [getCurrentSettingsState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // RAG config - only use shared config reference
      const finalRagConfigId = selectedRagConfigId || null;
      const finalRagEnabled = ragEnabledState && !!selectedRagConfigId;

      // Voice config - only use shared config reference
      const finalVoiceConfigId = selectedVoiceConfigId || null;

      // TTS config - tuning parameters stored in workflow.tts per AGENT_JSON_SCHEMA.md
      // Note: voice_name is NOT included here - voice selection is via voiceConfigId FK
      const ttsConfig = {
        enabled: ttsEnabled,
        model: ttsModel,
        stability: ttsStability,
        similarity_boost: ttsSimilarityBoost,
        style: ttsStyle,
        use_speaker_boost: ttsUseSpeakerBoost,
        enable_ssml_parsing: ttsEnableSsmlParsing,
        pronunciation_dictionaries_enabled: ttsPronunciationEnabled,
        pronunciation_dictionary_ids: ttsPronunciationDictionaryIds
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean),
        aggregate_sentences: ttsAggregateSentences,
      };

      // Build LLM config for workflow.llm section
      const llmConfig = {
        enabled: llmEnabled,
        model_name: llmModel, // References llm_models.model_name
        temperature: parseFloat(String(llmTemperature)),
        max_tokens: parseInt(String(llmMaxTokens)),
        service_tier: llmServiceTier,
      };

      // Build RAG config for workflow.rag section (tuning overrides for base RAG config)
      const ragConfig = ragOverrideEnabled ? {
        override_enabled: true,
        search_mode: ragSearchMode,
        top_k: ragTopK,
        rrf_k: ragRrfK,
        vector_weight: ragVectorWeight,
        fts_weight: ragFtsWeight,
      } : {
        override_enabled: false,
      };

      // Merge the form data with the existing config
      // LLM config goes in workflow.llm, TTS config goes in workflow.tts per AGENT_JSON_SCHEMA.md
      // Note: Root-level tts is removed - all TTS config must be in workflow.tts
      const updatedConfig = {
        ...currentConfig,
        workflow: {
          ...currentConfig.workflow,
          global_prompt: globalPrompt || undefined,
          llm: llmConfig,
          tts: ttsConfig, // TTS settings stored in workflow.tts (per AGENT_JSON_SCHEMA.md)
          rag: ragConfig, // RAG tuning overrides stored in workflow.rag
        },
        // Remove deprecated root-level fields that should be in workflow section
        tts: undefined,
        stt: undefined,
        llm: undefined,
        rag: undefined, // RAG settings come from database via rag_config_id FK
        auto_hangup: {
          enabled: autoHangupEnabled,
        },
      };

      await onSave(updatedConfig, finalRagEnabled, finalRagConfigId, finalVoiceConfigId, globalPrompt || null);
      // Update initial state after successful save
      const currentSettings = getCurrentSettingsState();
      initialStateRef.current = JSON.stringify(currentSettings);
      // Clear dirty state
      if (draftContext) {
        draftContext.setIsSettingsDirty(false);
        draftContext.setSettingsDraft(null);
      }
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Note: Save button removed - use "Save All Changes" in page header to save all tabs together */}

      <form onSubmit={handleSubmit} className="space-y-6 pb-6">
        {/* Global Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Global Prompt
            </CardTitle>
            <CardDescription>
              System prompt applied to all nodes in the workflow. Node-specific prompts take precedence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="global-prompt"
              placeholder="Enter a global system prompt for the agent..."
              value={globalPrompt}
              onChange={(e) => setGlobalPrompt(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This prompt is included in every LLM call. Individual node prompts are appended to this.
            </p>
          </CardContent>
        </Card>

        {/* LLM Settings */}
        <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>
            Configure the language model settings for your agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable LLM</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable the language model for this agent
              </p>
            </div>
            <Switch checked={llmEnabled} onCheckedChange={setLlmEnabled} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="llm-model">Model</Label>
              <Select value={llmModel} onValueChange={setLlmModel}>
                <SelectTrigger id="llm-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {llmModels?.map((model) => (
                    <SelectItem key={model.modelName} value={model.modelName}>
                      {model.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select an LLM model</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-service-tier">Service Tier</Label>
              <Select value={llmServiceTier} onValueChange={(v) => setLlmServiceTier(v as 'auto' | 'default' | 'flex')}>
                <SelectTrigger id="llm-service-tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">OpenAI service tier</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-temperature">Temperature</Label>
              <Input
                id="llm-temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={llmTemperature}
                onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">0.0 - 2.0 (lower is more deterministic)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-max-tokens">Max Tokens</Label>
              <Input
                id="llm-max-tokens"
                type="number"
                min="1"
                max="10000"
                value={llmMaxTokens}
                onChange={(e) => setLlmMaxTokens(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Maximum response length</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TTS/Voice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice/TTS Configuration
          </CardTitle>
          <CardDescription>
            Select a voice and configure TTS settings for this agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TTS Enable Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable TTS</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable text-to-speech for this agent
              </p>
            </div>
            <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
          </div>

          {ttsEnabled && (
            <>
              <Separator />

              {/* Voice Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-config-select">Voice</Label>
                  <Select
                    value={selectedVoiceConfigId}
                    onValueChange={setSelectedVoiceConfigId}
                  >
                    <SelectTrigger id="voice-config-select">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceConfigs?.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex flex-col">
                            <span>{config.name}</span>
                            {config.description && (
                              <span className="text-xs text-muted-foreground">
                                {config.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Link href="/settings/voice" target="_blank">
                      <Button type="button" variant="link" size="sm" className="h-auto p-0">
                        Manage Voice Catalog
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {!voiceConfigs?.length && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No voices available.{' '}
                      <Link href="/settings/voice/new" className="underline">
                        Add one
                      </Link>{' '}
                      to get started.
                    </AlertDescription>
                  </Alert>
                )}

                {/* TTS Model */}
                <div className="space-y-2">
                  <Label htmlFor="tts-model">TTS Model</Label>
                  <Select value={ttsModel} onValueChange={setTtsModel}>
                    <SelectTrigger id="tts-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ttsModels.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-xs text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Voice Quality Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Voice Quality</h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Stability</Label>
                    <span className="text-sm text-muted-foreground">{(ttsStability * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[ttsStability]}
                    onValueChange={([value]) => setTtsStability(value)}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values produce more consistent speech, lower values add expressiveness
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Similarity Boost</Label>
                    <span className="text-sm text-muted-foreground">{(ttsSimilarityBoost * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[ttsSimilarityBoost]}
                    onValueChange={([value]) => setTtsSimilarityBoost(value)}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values make the voice sound more like the original
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Style</Label>
                    <span className="text-sm text-muted-foreground">{(ttsStyle * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[ttsStyle]}
                    onValueChange={([value]) => setTtsStyle(value)}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Amplifies the style of the original speaker (higher can reduce stability)
                  </p>
                </div>
              </div>

              <Separator />

              {/* Voice Features */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Features</h4>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Speaker Boost</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhance speaker clarity and audio quality
                    </p>
                  </div>
                  <Switch checked={ttsUseSpeakerBoost} onCheckedChange={setTtsUseSpeakerBoost} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>SSML Parsing</Label>
                    <p className="text-sm text-muted-foreground">
                      Parse SSML tags in text for advanced speech control
                    </p>
                  </div>
                  <Switch checked={ttsEnableSsmlParsing} onCheckedChange={setTtsEnableSsmlParsing} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Pronunciation Dictionaries</Label>
                    <p className="text-sm text-muted-foreground">
                      Use custom pronunciation rules for specific terms
                    </p>
                  </div>
                  <Switch checked={ttsPronunciationEnabled} onCheckedChange={setTtsPronunciationEnabled} />
                </div>

                {ttsPronunciationEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="pronunciation-ids">Dictionary IDs</Label>
                    <Input
                      id="pronunciation-ids"
                      placeholder="dict_abc123, dict_xyz789"
                      value={ttsPronunciationDictionaryIds}
                      onChange={(e) => setTtsPronunciationDictionaryIds(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated ElevenLabs dictionary IDs
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Aggregate Sentences</Label>
                    <p className="text-sm text-muted-foreground">
                      Split text at sentence boundaries before TTS. Disable for more consistent prosody across multi-sentence utterances.
                    </p>
                  </div>
                  <Switch checked={ttsAggregateSentences} onCheckedChange={setTtsAggregateSentences} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* RAG Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            RAG Configuration
          </CardTitle>
          <CardDescription>
            Select a RAG configuration for this agent. Manage configurations in{' '}
            <Link href="/settings/rag" className="underline">
              Settings
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* RAG Enable Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable RAG</Label>
              <p className="text-sm text-muted-foreground">
                Enable knowledge base retrieval for this agent
              </p>
            </div>
            <Switch checked={ragEnabledState} onCheckedChange={setRagEnabledState} />
          </div>

          {ragEnabledState && (
            <>
              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rag-config-select">RAG Configuration</Label>
                  <Select
                    value={selectedRagConfigId}
                    onValueChange={setSelectedRagConfigId}
                  >
                    <SelectTrigger id="rag-config-select">
                      <SelectValue placeholder="Select a RAG configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {ragConfigs?.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex flex-col">
                            <span>{config.name}</span>
                            {config.description && (
                              <span className="text-xs text-muted-foreground">
                                {config.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Link href="/settings/rag" target="_blank">
                      <Button type="button" variant="link" size="sm" className="h-auto p-0">
                        Manage RAG Configurations
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Show selected config preview */}
                {selectedRagConfig?.activeVersion && !ragOverrideEnabled && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedRagConfig.name}</span>
                      <Badge variant="secondary">v{selectedRagConfig.activeVersion.version}</Badge>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Search Mode:</span>
                        <span className="capitalize">{selectedRagConfig.activeVersion.searchMode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Top K:</span>
                        <span>{selectedRagConfig.activeVersion.topK}</span>
                      </div>
                      {selectedRagConfig.activeVersion.searchMode === 'hybrid' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Weights:</span>
                          <span>
                            {parseFloat(selectedRagConfig.activeVersion.vectorWeight) * 100}% Vector /{' '}
                            {parseFloat(selectedRagConfig.activeVersion.ftsWeight) * 100}% FTS
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* RAG Override Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Override RAG Settings</Label>
                    <p className="text-sm text-muted-foreground">
                      Customize search parameters for this agent
                    </p>
                  </div>
                  <Switch checked={ragOverrideEnabled} onCheckedChange={setRagOverrideEnabled} />
                </div>

                {/* RAG Tuning Options */}
                {ragOverrideEnabled && (
                  <>
                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Search Settings</h4>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="rag-search-mode">Search Mode</Label>
                          <Select
                            value={ragSearchMode}
                            onValueChange={(value) => setRagSearchMode(value as 'vector' | 'fts' | 'hybrid')}
                          >
                            <SelectTrigger id="rag-search-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vector">
                                <div className="flex flex-col">
                                  <span>Vector (Semantic)</span>
                                  <span className="text-xs text-muted-foreground">Best for meaning-based queries</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="fts">
                                <div className="flex flex-col">
                                  <span>FTS (Keyword)</span>
                                  <span className="text-xs text-muted-foreground">Best for exact matches</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="hybrid">
                                <div className="flex flex-col">
                                  <span>Hybrid</span>
                                  <span className="text-xs text-muted-foreground">Combines both approaches</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rag-top-k">Top K Results</Label>
                          <Input
                            id="rag-top-k"
                            type="number"
                            min={1}
                            max={50}
                            value={ragTopK}
                            onChange={(e) => setRagTopK(parseInt(e.target.value) || 5)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Number of chunks to retrieve (1-50)
                          </p>
                        </div>
                      </div>
                    </div>

                    {ragSearchMode === 'hybrid' && (
                      <>
                        <Separator />

                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Hybrid Search Weights</h4>

                          {/* Weight validation warning */}
                          {Math.abs((ragVectorWeight + ragFtsWeight) - 1.0) > 0.01 && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Vector and FTS weights must sum to 1.0 (currently: {(ragVectorWeight + ragFtsWeight).toFixed(2)})
                              </AlertDescription>
                            </Alert>
                          )}

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label htmlFor="rag-vector-weight">Vector Weight</Label>
                              <Input
                                id="rag-vector-weight"
                                type="number"
                                step="0.1"
                                min={0}
                                max={1}
                                value={ragVectorWeight}
                                onChange={(e) => setRagVectorWeight(parseFloat(e.target.value) || 0.6)}
                              />
                              <p className="text-xs text-muted-foreground">Semantic search (0-1)</p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="rag-fts-weight">FTS Weight</Label>
                              <Input
                                id="rag-fts-weight"
                                type="number"
                                step="0.1"
                                min={0}
                                max={1}
                                value={ragFtsWeight}
                                onChange={(e) => setRagFtsWeight(parseFloat(e.target.value) || 0.4)}
                              />
                              <p className="text-xs text-muted-foreground">Keyword search (0-1)</p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="rag-rrf-k">RRF K Constant</Label>
                              <Input
                                id="rag-rrf-k"
                                type="number"
                                min={1}
                                max={200}
                                value={ragRrfK}
                                onChange={(e) => setRagRrfK(parseInt(e.target.value) || 60)}
                              />
                              <p className="text-xs text-muted-foreground">Fusion constant (1-200)</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {!ragConfigs?.length && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No RAG configurations available.{' '}
                      <Link href="/settings/rag/new" className="underline">
                        Create one
                      </Link>{' '}
                      to get started.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Auto Hangup */}
      <Card>
        <CardHeader>
          <CardTitle>Auto Hangup</CardTitle>
          <CardDescription>
            Automatically end calls when appropriate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Auto Hangup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically end calls at completion
              </p>
            </div>
            <Switch checked={autoHangupEnabled} onCheckedChange={setAutoHangupEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Phone Numbers (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Numbers
          </CardTitle>
          <CardDescription>
            Phone numbers mapped to this agent for call routing. Manage mappings in{' '}
            <Link href="/settings/phone" className="underline">
              Settings
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentPhoneConfigs && agentPhoneConfigs.length > 0 ? (
            <div className="space-y-2">
              {agentPhoneConfigs.map((phoneConfig) => (
                <div
                  key={phoneConfig.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-mono text-sm">{phoneConfig.phoneNumber}</span>
                      {phoneConfig.name && (
                        <p className="text-xs text-muted-foreground">{phoneConfig.name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">Mapped</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <Phone className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No phone numbers mapped to this agent
              </p>
              <Link href="/settings/phone" className="mt-2 inline-block">
                <Button type="button" variant="outline" size="sm">
                  Manage Phone Numbers
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
    </div>
  );
}
