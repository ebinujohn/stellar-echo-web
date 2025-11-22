'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Save,
  Loader2,
  History,
  Settings2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useVoiceConfig,
  useVoiceConfigVersions,
  useUpdateVoiceConfig,
  useCreateVoiceConfigVersion,
  useActivateVoiceConfigVersion,
} from '@/lib/hooks/use-voice-configs';
import { ttsModels } from '@/lib/validations/voice-configs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/utils/formatters';

interface VoiceConfigDetailClientProps {
  voiceConfigId: string;
}

export function VoiceConfigDetailClient({ voiceConfigId }: VoiceConfigDetailClientProps) {
  const { data: config, isLoading, error } = useVoiceConfig(voiceConfigId);
  const { data: versions } = useVoiceConfigVersions(voiceConfigId);
  const updateConfig = useUpdateVoiceConfig();
  const createVersion = useCreateVoiceConfigVersion();
  const activateVersion = useActivateVoiceConfigVersion();

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Voice Settings
  const [voiceId, setVoiceId] = useState('');
  const [model, setModel] = useState('eleven_turbo_v2_5');

  // Quality Settings
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0.0);

  // Features
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [enableSsmlParsing, setEnableSsmlParsing] = useState(false);

  // Pronunciation
  const [pronunciationDictionariesEnabled, setPronunciationDictionariesEnabled] = useState(true);
  const [pronunciationDictionaryIds, setPronunciationDictionaryIds] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');

  // Initialize form with config data
  if (config && !isInitialized) {
    setName(config.name);
    setDescription(config.description || '');

    if (config.activeVersion) {
      const v = config.activeVersion;
      setVoiceId(v.voiceId);
      setModel(v.model);
      setStability(parseFloat(v.stability));
      setSimilarityBoost(parseFloat(v.similarityBoost));
      setStyle(parseFloat(v.style));
      setUseSpeakerBoost(v.useSpeakerBoost);
      setEnableSsmlParsing(v.enableSsmlParsing);
      setPronunciationDictionariesEnabled(v.pronunciationDictionariesEnabled);
      setPronunciationDictionaryIds(v.pronunciationDictionaryIds?.join(', ') || '');
    }
    setIsInitialized(true);
  }

  const handleSaveMetadata = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);

    try {
      await updateConfig.mutateAsync({
        id: voiceConfigId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Configuration updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!voiceId.trim()) {
      toast.error('Voice ID is required');
      return;
    }

    setIsSaving(true);

    try {
      const result = await createVersion.mutateAsync({
        voiceConfigId,
        voiceId: voiceId.trim(),
        model,
        stability: stability.toFixed(2),
        similarityBoost: similarityBoost.toFixed(2),
        style: style.toFixed(2),
        useSpeakerBoost,
        enableSsmlParsing,
        pronunciationDictionariesEnabled,
        pronunciationDictionaryIds: pronunciationDictionaryIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
        notes: notes.trim() || undefined,
      });

      // Auto-activate the new version
      await activateVersion.mutateAsync({
        voiceConfigId,
        versionId: result.data.id,
      });

      toast.success('New version created and activated');
      setNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save version');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateVersion = async (versionId: string) => {
    try {
      await activateVersion.mutateAsync({ voiceConfigId, versionId });
      toast.success('Version activated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate version');
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings/voice">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Voice Configuration</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load Voice configuration.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/voice">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config.name}</h1>
            <p className="text-muted-foreground">
              Version {config.activeVersion?.version || 1} active
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings2 className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="versions">
            <History className="mr-2 h-4 w-4" />
            Versions ({config.versionCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveMetadata} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Info
              </Button>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Voice Settings</CardTitle>
              <CardDescription>Configure the ElevenLabs voice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="voiceId">Voice ID</Label>
                  <Input
                    id="voiceId"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">TTS Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ttsModels.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Voice Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Stability</Label>
                  <span className="text-sm text-muted-foreground">
                    {(stability * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[stability]}
                  onValueChange={([value]) => setStability(value)}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Similarity Boost</Label>
                  <span className="text-sm text-muted-foreground">
                    {(similarityBoost * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[similarityBoost]}
                  onValueChange={([value]) => setSimilarityBoost(value)}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Style</Label>
                  <span className="text-sm text-muted-foreground">
                    {(style * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[style]}
                  onValueChange={([value]) => setStyle(value)}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Speaker Boost</Label>
                  <p className="text-sm text-muted-foreground">Enhance audio quality</p>
                </div>
                <Switch checked={useSpeakerBoost} onCheckedChange={setUseSpeakerBoost} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>SSML Parsing</Label>
                  <p className="text-sm text-muted-foreground">Parse SSML tags in text</p>
                </div>
                <Switch checked={enableSsmlParsing} onCheckedChange={setEnableSsmlParsing} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Pronunciation Dictionaries</Label>
                  <p className="text-sm text-muted-foreground">Use custom pronunciation rules</p>
                </div>
                <Switch
                  checked={pronunciationDictionariesEnabled}
                  onCheckedChange={setPronunciationDictionariesEnabled}
                />
              </div>

              {pronunciationDictionariesEnabled && (
                <div className="space-y-2">
                  <Label>Dictionary IDs</Label>
                  <Input
                    placeholder="dict_abc123, dict_xyz789"
                    value={pronunciationDictionaryIds}
                    onChange={(e) => setPronunciationDictionaryIds(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Version */}
          <Card>
            <CardHeader>
              <CardTitle>Save as New Version</CardTitle>
              <CardDescription>Create a new version with the current settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Version Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Increased stability for clearer speech"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveVersion} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save & Activate New Version
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          {versions && versions.length > 0 ? (
            versions.map((version) => (
              <Card key={version.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Version {version.version}</CardTitle>
                    {version.isActive && (
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {!version.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivateVersion(version.id)}
                    >
                      Activate
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Model:</span> {version.model}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Voice ID:</span>{' '}
                      {version.voiceId.substring(0, 12)}...
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stability:</span>{' '}
                      {(parseFloat(version.stability) * 100).toFixed(0)}%
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>{' '}
                      {formatDateTime(version.createdAt)}
                    </div>
                  </div>
                  {version.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{version.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No versions found
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
