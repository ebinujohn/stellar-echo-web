'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateVoiceConfig } from '@/lib/hooks/use-voice-configs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

/**
 * Voice Config Form - Simplified voice catalog entry
 *
 * Voice configs are now a simple catalog of available voices.
 * TTS tuning parameters (stability, similarity, etc.) are configured
 * at the agent level in the agent's Settings tab.
 */
export function VoiceConfigForm() {
  const router = useRouter();
  const createConfig = useCreateVoiceConfig();

  // Voice Catalog Fields Only
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [voiceId, setVoiceId] = useState('');

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
      });

      toast.success('Voice created');
      router.push('/settings/voice');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create voice');
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
            <h1 className="text-2xl font-bold tracking-tight">New Voice</h1>
            <p className="text-muted-foreground">Add a voice to the catalog</p>
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
              Create Voice
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
              required
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
              required
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
    </form>
  );
}
