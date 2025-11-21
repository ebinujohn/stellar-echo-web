'use client';

import { useState } from 'react';
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
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsFormProps {
  agentId: string;
  currentConfig: any;
  onSave: (config: any) => Promise<void>;
}

export function SettingsForm({ agentId, currentConfig, onSave }: SettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  // LLM Settings
  const [llmEnabled, setLlmEnabled] = useState(currentConfig.llm?.enabled ?? true);
  const [llmModel, setLlmModel] = useState(currentConfig.llm?.model || 'gpt-4o-mini');
  const [llmTemperature, setLlmTemperature] = useState(currentConfig.llm?.temperature ?? 0.8);
  const [llmMaxTokens, setLlmMaxTokens] = useState(currentConfig.llm?.max_tokens ?? 150);
  const [llmServiceTier, setLlmServiceTier] = useState(currentConfig.llm?.service_tier || 'auto');

  // TTS Settings
  const [ttsEnabled, setTtsEnabled] = useState(currentConfig.tts?.enabled ?? true);
  const [ttsModel, setTtsModel] = useState(currentConfig.tts?.model || 'eleven_turbo_v2_5');
  const [ttsVoiceId, setTtsVoiceId] = useState(currentConfig.tts?.voice_id || '');
  const [ttsStability, setTtsStability] = useState(currentConfig.tts?.stability ?? 0.5);
  const [ttsSimilarityBoost, setTtsSimilarityBoost] = useState(currentConfig.tts?.similarity_boost ?? 0.75);
  const [ttsStyle, setTtsStyle] = useState(currentConfig.tts?.style ?? 0.0);
  const [ttsSpeakerBoost, setTtsSpeakerBoost] = useState(currentConfig.tts?.use_speaker_boost ?? true);
  const [ttsSsmlParsing, setTtsSsmlParsing] = useState(currentConfig.tts?.enable_ssml_parsing ?? false);

  // STT Settings
  const [sttModel, setSttModel] = useState(currentConfig.stt?.model || 'flux-general-en');
  const [sttSampleRate, setSttSampleRate] = useState(currentConfig.stt?.sample_rate ?? 8000);
  const [sttEagerEotThreshold, setSttEagerEotThreshold] = useState(currentConfig.stt?.eager_eot_threshold ?? null);
  const [sttEotThreshold, setSttEotThreshold] = useState(currentConfig.stt?.eot_threshold ?? null);
  const [sttEotTimeoutMs, setSttEotTimeoutMs] = useState(currentConfig.stt?.eot_timeout_ms ?? null);

  // RAG Settings
  const [ragEnabled, setRagEnabled] = useState(currentConfig.rag?.enabled ?? false);
  const [ragSearchMode, setRagSearchMode] = useState(currentConfig.rag?.search_mode || 'hybrid');
  const [ragTopK, setRagTopK] = useState(currentConfig.rag?.top_k ?? 5);
  const [ragRelevanceFilter, setRagRelevanceFilter] = useState(currentConfig.rag?.relevance_filter ?? true);
  const [ragRrfK, setRagRrfK] = useState(currentConfig.rag?.rrf_k ?? 60);
  const [ragVectorWeight, setRagVectorWeight] = useState(currentConfig.rag?.vector_weight ?? 0.6);
  const [ragFtsWeight, setRagFtsWeight] = useState(currentConfig.rag?.fts_weight ?? 0.4);

  // Other Settings
  const [autoHangupEnabled, setAutoHangupEnabled] = useState(currentConfig.auto_hangup?.enabled ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Merge the form data with the existing config
      const updatedConfig = {
        ...currentConfig,
        llm: {
          ...currentConfig.llm,
          enabled: llmEnabled,
          model: llmModel,
          temperature: parseFloat(String(llmTemperature)),
          max_tokens: parseInt(String(llmMaxTokens)),
          service_tier: llmServiceTier,
        },
        tts: {
          ...currentConfig.tts,
          enabled: ttsEnabled,
          model: ttsModel,
          voice_id: ttsVoiceId || undefined,
          stability: parseFloat(String(ttsStability)),
          similarity_boost: parseFloat(String(ttsSimilarityBoost)),
          style: parseFloat(String(ttsStyle)),
          use_speaker_boost: ttsSpeakerBoost,
          enable_ssml_parsing: ttsSsmlParsing,
        },
        stt: {
          ...currentConfig.stt,
          model: sttModel,
          sample_rate: parseInt(String(sttSampleRate)),
          eager_eot_threshold: sttEagerEotThreshold,
          eot_threshold: sttEotThreshold,
          eot_timeout_ms: sttEotTimeoutMs,
        },
        rag: {
          ...currentConfig.rag,
          enabled: ragEnabled,
          search_mode: ragSearchMode,
          top_k: parseInt(String(ragTopK)),
          relevance_filter: ragRelevanceFilter,
          rrf_k: parseInt(String(ragRrfK)),
          vector_weight: parseFloat(String(ragVectorWeight)),
          fts_weight: parseFloat(String(ragFtsWeight)),
        },
        auto_hangup: {
          enabled: autoHangupEnabled,
        },
      };

      await onSave(updatedConfig);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <Input
                id="llm-model"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="gpt-4o-mini"
              />
              <p className="text-xs text-muted-foreground">OpenAI model name</p>
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

      {/* TTS Settings */}
      <Card>
        <CardHeader>
          <CardTitle>TTS Configuration</CardTitle>
          <CardDescription>
            Configure text-to-speech settings for voice output
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable TTS</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable text-to-speech for this agent
              </p>
            </div>
            <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tts-model">Model</Label>
              <Input
                id="tts-model"
                value={ttsModel}
                onChange={(e) => setTtsModel(e.target.value)}
                placeholder="eleven_turbo_v2_5"
              />
              <p className="text-xs text-muted-foreground">ElevenLabs model name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts-voice-id">Voice ID</Label>
              <Input
                id="tts-voice-id"
                value={ttsVoiceId}
                onChange={(e) => setTtsVoiceId(e.target.value)}
                placeholder="Optional voice ID"
              />
              <p className="text-xs text-muted-foreground">ElevenLabs voice identifier</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts-stability">Stability</Label>
              <Input
                id="tts-stability"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={ttsStability}
                onChange={(e) => setTtsStability(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">0.0 - 1.0 (higher is more stable)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts-similarity">Similarity Boost</Label>
              <Input
                id="tts-similarity"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={ttsSimilarityBoost}
                onChange={(e) => setTtsSimilarityBoost(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">0.0 - 1.0 (higher matches voice more)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts-style">Style</Label>
              <Input
                id="tts-style"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={ttsStyle}
                onChange={(e) => setTtsStyle(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">0.0 - 1.0 (exaggeration level)</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Speaker Boost</Label>
                <p className="text-xs text-muted-foreground">Enhance voice clarity</p>
              </div>
              <Switch checked={ttsSpeakerBoost} onCheckedChange={setTtsSpeakerBoost} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>SSML Parsing</Label>
                <p className="text-xs text-muted-foreground">Enable SSML markup support</p>
              </div>
              <Switch checked={ttsSsmlParsing} onCheckedChange={setTtsSsmlParsing} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STT Settings */}
      <Card>
        <CardHeader>
          <CardTitle>STT Configuration</CardTitle>
          <CardDescription>
            Configure speech-to-text settings for voice input
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stt-model">Model</Label>
              <Input
                id="stt-model"
                value={sttModel}
                onChange={(e) => setSttModel(e.target.value)}
                placeholder="flux-general-en"
              />
              <p className="text-xs text-muted-foreground">Speech recognition model</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stt-sample-rate">Sample Rate</Label>
              <Select
                value={String(sttSampleRate)}
                onValueChange={(val) => setSttSampleRate(parseInt(val))}
              >
                <SelectTrigger id="stt-sample-rate">
                  <SelectValue placeholder="Select sample rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8000">8000 Hz</SelectItem>
                  <SelectItem value="16000">16000 Hz</SelectItem>
                  <SelectItem value="24000">24000 Hz</SelectItem>
                  <SelectItem value="48000">48000 Hz</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Audio sample rate</p>
            </div>
          </div>

          <Separator />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Advanced EOT (End of Turn) Settings</p>
            <p className="text-xs">Leave empty to use default values</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="stt-eager-eot">Eager EOT Threshold</Label>
              <Input
                id="stt-eager-eot"
                type="number"
                step="0.1"
                placeholder="Default"
                value={sttEagerEotThreshold ?? ''}
                onChange={(e) => setSttEagerEotThreshold(e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stt-eot">EOT Threshold</Label>
              <Input
                id="stt-eot"
                type="number"
                step="0.1"
                placeholder="Default"
                value={sttEotThreshold ?? ''}
                onChange={(e) => setSttEotThreshold(e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stt-eot-timeout">EOT Timeout (ms)</Label>
              <Input
                id="stt-eot-timeout"
                type="number"
                placeholder="Default"
                value={sttEotTimeoutMs ?? ''}
                onChange={(e) => setSttEotTimeoutMs(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAG Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>RAG Configuration</CardTitle>
          <CardDescription>
            Configure retrieval-augmented generation (knowledge base) settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable RAG</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable knowledge base retrieval for this agent
              </p>
            </div>
            <Switch checked={ragEnabled} onCheckedChange={setRagEnabled} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rag-search-mode">Search Mode</Label>
              <Select value={ragSearchMode} onValueChange={setRagSearchMode}>
                <SelectTrigger id="rag-search-mode">
                  <SelectValue placeholder="Select search mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vector">Vector (Semantic)</SelectItem>
                  <SelectItem value="fts">FTS (Keyword)</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Vector + FTS)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vector for concepts, FTS for exact terms, Hybrid for both
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rag-top-k">Top K Results</Label>
              <Input
                id="rag-top-k"
                type="number"
                min="1"
                max="50"
                value={ragTopK}
                onChange={(e) => setRagTopK(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Number of chunks to retrieve (1-50)</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Relevance Filter</Label>
                <p className="text-xs text-muted-foreground">
                  Only query for questions/info requests
                </p>
              </div>
              <Switch checked={ragRelevanceFilter} onCheckedChange={setRagRelevanceFilter} />
            </div>
          </div>

          <Separator />
          <div className="text-sm font-medium">Hybrid Search Parameters</div>
          <p className="text-xs text-muted-foreground">
            These settings only apply when search mode is set to Hybrid
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rag-rrf-k">RRF K</Label>
              <Input
                id="rag-rrf-k"
                type="number"
                min="1"
                max="200"
                value={ragRrfK}
                onChange={(e) => setRagRrfK(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Reciprocal rank fusion constant</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rag-vector-weight">Vector Weight</Label>
              <Input
                id="rag-vector-weight"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={ragVectorWeight}
                onChange={(e) => setRagVectorWeight(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Semantic search weight (0.0-1.0)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rag-fts-weight">FTS Weight</Label>
              <Input
                id="rag-fts-weight"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={ragFtsWeight}
                onChange={(e) => setRagFtsWeight(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Keyword search weight (0.0-1.0)</p>
            </div>
          </div>

          {/* Weight validation warning */}
          {ragSearchMode === 'hybrid' && Math.abs((ragVectorWeight + ragFtsWeight) - 1.0) > 0.01 && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                <strong>Warning:</strong> Vector weight and FTS weight should sum to 1.0 for balanced results.
                Current sum: {(ragVectorWeight + ragFtsWeight).toFixed(2)}
              </p>
            </div>
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
    </form>
    </div>
  );
}
