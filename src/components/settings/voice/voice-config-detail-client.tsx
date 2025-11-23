'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useVoiceConfig,
  useUpdateVoiceConfig,
  useCreateVoiceConfigVersion,
  useActivateVoiceConfigVersion,
} from '@/lib/hooks/use-voice-configs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface VoiceConfigDetailClientProps {
  voiceConfigId: string;
}

/**
 * Voice Config Detail - Simplified voice catalog entry editor
 *
 * Voice configs are now a simple catalog of available voices.
 * TTS tuning parameters (stability, similarity, etc.) are configured
 * at the agent level in the agent's Settings tab.
 */
export function VoiceConfigDetailClient({ voiceConfigId }: VoiceConfigDetailClientProps) {
  const { data: config, isLoading, error } = useVoiceConfig(voiceConfigId);
  const updateConfig = useUpdateVoiceConfig();
  const createVersion = useCreateVoiceConfigVersion();
  const activateVersion = useActivateVoiceConfigVersion();

  // Voice Catalog Fields Only
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with config data
  if (config && !isInitialized) {
    setName(config.name);
    setDescription(config.description || '');
    if (config.activeVersion) {
      setVoiceId(config.activeVersion.voiceId);
    }
    setIsInitialized(true);
  }

  const handleSave = async () => {
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
      // Update metadata (name, description)
      await updateConfig.mutateAsync({
        id: voiceConfigId,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Check if voice ID changed - if so, create new version
      if (config?.activeVersion && voiceId.trim() !== config.activeVersion.voiceId) {
        const result = await createVersion.mutateAsync({
          voiceConfigId,
          voiceId: voiceId.trim(),
        });

        // Auto-activate the new version
        await activateVersion.mutateAsync({
          voiceConfigId,
          versionId: result.data.id,
        });
      }

      toast.success('Voice updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update voice');
    } finally {
      setIsSaving(false);
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
          <h1 className="text-2xl font-bold tracking-tight">Voice</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load voice.</p>
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
            <p className="text-muted-foreground">Edit voice details</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Voice settings like stability, similarity boost, and other TTS parameters are configured
          per-agent in the agent&apos;s Settings tab. This catalog stores the basic voice identity.
        </AlertDescription>
      </Alert>

      {/* Voice Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Identity</CardTitle>
          <CardDescription>Basic information for this voice in the catalog</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., George, Rachel, Professional Male"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this voice when selecting it for agents
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voiceId">Voice ID *</Label>
            <Input
              id="voiceId"
              placeholder="e.g., JBFqnCBsd6RMkjVDRZzb"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ElevenLabs voice ID from your voice library
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe this voice (e.g., 'Warm, professional male voice suitable for customer support')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
