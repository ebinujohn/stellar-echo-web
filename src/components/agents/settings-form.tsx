'use client';

import { useState } from 'react';
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
import { Loader2, Save, ExternalLink, Database, Volume2, Phone, AlertTriangle, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRagConfigsDropdown, useRagConfig } from '@/lib/hooks/use-rag-configs';
import { useVoiceConfigsDropdown, useVoiceConfig } from '@/lib/hooks/use-voice-configs';
import { useAgentPhoneConfigs } from '@/lib/hooks/use-phone-configs';
import { useLlmModelsDropdown } from '@/lib/hooks/use-llm-configs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SettingsFormProps {
  agentId: string;
  currentConfig: any;
  ragEnabled?: boolean;
  ragConfigId?: string | null;
  voiceConfigId?: string | null;
  onSave: (config: any, ragEnabled?: boolean, ragConfigId?: string | null, voiceConfigId?: string | null) => Promise<void>;
}

export function SettingsForm({ agentId, currentConfig, ragEnabled: initialRagEnabled, ragConfigId: initialRagConfigId, voiceConfigId: initialVoiceConfigId, onSave }: SettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available RAG configs
  const { data: ragConfigs } = useRagConfigsDropdown();

  // Fetch available Voice configs
  const { data: voiceConfigs } = useVoiceConfigsDropdown();

  // Fetch phone configs mapped to this agent
  const { data: agentPhoneConfigs } = useAgentPhoneConfigs(agentId);

  // Fetch available LLM models for dropdown
  const { data: llmModels } = useLlmModelsDropdown();

  // RAG Config Selection
  const [selectedRagConfigId, setSelectedRagConfigId] = useState(initialRagConfigId || '');
  const [ragEnabledState, setRagEnabledState] = useState(initialRagEnabled ?? false);

  // Voice Config Selection
  const [selectedVoiceConfigId, setSelectedVoiceConfigId] = useState(initialVoiceConfigId || '');

  // Fetch selected RAG config details for preview
  const { data: selectedRagConfig } = useRagConfig(selectedRagConfigId || '');

  // Fetch selected Voice config details for preview
  const { data: selectedVoiceConfig } = useVoiceConfig(selectedVoiceConfigId || '');

  // LLM Settings (stored in workflow.llm per AGENT_JSON_SCHEMA.md)
  const workflowLlm = currentConfig.workflow?.llm;
  const [llmEnabled, setLlmEnabled] = useState(workflowLlm?.enabled ?? true);
  const [llmModel, setLlmModel] = useState(workflowLlm?.model_name || 'gpt-4o-mini');
  const [llmTemperature, setLlmTemperature] = useState(workflowLlm?.temperature ?? 1.0);
  const [llmMaxTokens, setLlmMaxTokens] = useState(workflowLlm?.max_tokens ?? 150);
  const [llmServiceTier, setLlmServiceTier] = useState(workflowLlm?.service_tier || 'auto');

  // TTS Settings (only enabled flag - voice config is selected from shared configs)
  const [ttsEnabled, setTtsEnabled] = useState(currentConfig.tts?.enabled ?? true);

  // Workflow Settings
  const [globalPrompt, setGlobalPrompt] = useState(currentConfig.workflow?.global_prompt || '');

  // Other Settings
  const [autoHangupEnabled, setAutoHangupEnabled] = useState(currentConfig.auto_hangup?.enabled ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // RAG config - only use shared config reference
      const finalRagConfigId = selectedRagConfigId || null;
      const finalRagEnabled = ragEnabledState && !!selectedRagConfigId;

      // Voice config - only use shared config reference
      const finalVoiceConfigId = selectedVoiceConfigId || null;

      // TTS config - minimal settings, voice details come from shared config
      const ttsConfig = {
        enabled: ttsEnabled,
      };

      // Build LLM config for workflow.llm section
      const llmConfig = {
        enabled: llmEnabled,
        model_name: llmModel, // References llm_models.model_name
        temperature: parseFloat(String(llmTemperature)),
        max_tokens: parseInt(String(llmMaxTokens)),
        service_tier: llmServiceTier,
      };

      // Merge the form data with the existing config
      // LLM config goes in workflow.llm per AGENT_JSON_SCHEMA.md
      const updatedConfig = {
        ...currentConfig,
        workflow: {
          ...currentConfig.workflow,
          global_prompt: globalPrompt || undefined,
          llm: llmConfig,
        },
        tts: ttsConfig,
        // STT settings preserved from existing config (not editable here)
        rag: undefined, // RAG settings come from shared config
        auto_hangup: {
          enabled: autoHangupEnabled,
        },
      };

      await onSave(updatedConfig, finalRagEnabled, finalRagConfigId, finalVoiceConfigId);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/80 mb-6">
        <div className="flex items-center justify-end px-4 py-2">
          <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

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
              <Select value={llmServiceTier} onValueChange={setLlmServiceTier}>
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
            Select a voice configuration for this agent. Manage configurations in{' '}
            <Link href="/settings/voice" className="underline">
              Settings
            </Link>
            .
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-config-select">Voice Configuration</Label>
                  <Select
                    value={selectedVoiceConfigId}
                    onValueChange={setSelectedVoiceConfigId}
                  >
                    <SelectTrigger id="voice-config-select">
                      <SelectValue placeholder="Select a voice configuration" />
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
                        Manage Voice Configurations
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Show selected config preview */}
                {selectedVoiceConfig?.activeVersion && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedVoiceConfig.name}</span>
                      <Badge variant="secondary">v{selectedVoiceConfig.activeVersion.version}</Badge>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span>{selectedVoiceConfig.activeVersion.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stability:</span>
                        <span>{(parseFloat(selectedVoiceConfig.activeVersion.stability) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Similarity:</span>
                        <span>{(parseFloat(selectedVoiceConfig.activeVersion.similarityBoost) * 100).toFixed(0)}%</span>
                      </div>
                      {selectedVoiceConfig.activeVersion.enableSsmlParsing && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SSML:</span>
                          <Badge variant="outline" className="text-xs">Enabled</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!voiceConfigs?.length && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No Voice configurations available.{' '}
                      <Link href="/settings/voice/new" className="underline">
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
                {selectedRagConfig?.activeVersion && (
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
