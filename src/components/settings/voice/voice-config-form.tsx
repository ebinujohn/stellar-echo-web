'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateVoiceConfig } from '@/lib/hooks/use-voice-configs';
import { ttsModels } from '@/lib/validations/voice-configs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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

export function VoiceConfigForm() {
  const router = useRouter();
  const createConfig = useCreateVoiceConfig();

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!voiceId.trim()) {
      toast.error('Voice ID is required');
      return;
    }

    setIsSaving(true);

    try {
      await createConfig.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
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
      });

      toast.success('Voice configuration created');
      router.push('/settings/voice');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/voice">
            <Button type="button" variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Voice Configuration</h1>
            <p className="text-muted-foreground">Create a new voice/TTS configuration</p>
          </div>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Configuration
            </>
          )}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name and description for this Voice configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Professional Male Voice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this voice configuration is used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
          <CardDescription>Configure the ElevenLabs voice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voiceId">Voice ID *</Label>
              <Input
                id="voiceId"
                placeholder="e.g., JBFqnCBsd6RMkjVDRZzb"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                ElevenLabs voice ID from your voice library
              </p>
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
        </CardContent>
      </Card>

      {/* Quality Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Quality</CardTitle>
          <CardDescription>Fine-tune voice characteristics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Stability</Label>
                <span className="text-sm text-muted-foreground">{(stability * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[stability]}
                onValueChange={([value]) => setStability(value)}
                min={0}
                max={1}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">
                Higher values produce more consistent speech, lower values add expressiveness
              </p>
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
              <p className="text-xs text-muted-foreground">
                Higher values make the voice sound more like the original
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Style Exaggeration</Label>
                <span className="text-sm text-muted-foreground">{(style * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[style]}
                onValueChange={([value]) => setStyle(value)}
                min={0}
                max={1}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">
                Amplifies the style of the original speaker (higher can reduce stability)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Enable or disable voice features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="speakerBoost">Speaker Boost</Label>
              <p className="text-sm text-muted-foreground">
                Enhance speaker clarity and audio quality
              </p>
            </div>
            <Switch
              id="speakerBoost"
              checked={useSpeakerBoost}
              onCheckedChange={setUseSpeakerBoost}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="ssmlParsing">SSML Parsing</Label>
              <p className="text-sm text-muted-foreground">
                Parse SSML tags in text for advanced speech control
              </p>
            </div>
            <Switch
              id="ssmlParsing"
              checked={enableSsmlParsing}
              onCheckedChange={setEnableSsmlParsing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pronunciation */}
      <Card>
        <CardHeader>
          <CardTitle>Pronunciation</CardTitle>
          <CardDescription>Configure pronunciation dictionaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="pronunciationEnabled">Enable Pronunciation Dictionaries</Label>
              <p className="text-sm text-muted-foreground">
                Use custom pronunciation rules for specific terms
              </p>
            </div>
            <Switch
              id="pronunciationEnabled"
              checked={pronunciationDictionariesEnabled}
              onCheckedChange={setPronunciationDictionariesEnabled}
            />
          </div>

          {pronunciationDictionariesEnabled && (
            <div className="space-y-2">
              <Label htmlFor="dictionaryIds">Dictionary IDs</Label>
              <Input
                id="dictionaryIds"
                placeholder="dict_abc123, dict_xyz789"
                value={pronunciationDictionaryIds}
                onChange={(e) => setPronunciationDictionaryIds(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated ElevenLabs dictionary IDs
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
