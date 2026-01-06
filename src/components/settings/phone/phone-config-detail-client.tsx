'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { usePhoneConfig, useUpdatePhoneConfig } from '@/lib/hooks/use-phone-configs';
import { useAgents } from '@/lib/hooks/use-agents';
import { formatPhoneNumber } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

interface PhoneConfigDetailClientProps {
  phoneConfigId: string;
}

export function PhoneConfigDetailClient({ phoneConfigId }: PhoneConfigDetailClientProps) {
  const { data: config, isLoading, error } = usePhoneConfig(phoneConfigId);
  const updateConfig = useUpdatePhoneConfig();
  const { data: agents, isLoading: agentsLoading } = useAgents();

  // Form state - use null to indicate "use config value"
  const [phoneNumberOverride, setPhoneNumberOverride] = useState<string | null>(null);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null);
  const [agentIdOverride, setAgentIdOverride] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Computed values - use override if set, otherwise use config
  const phoneNumber = phoneNumberOverride ?? config?.phoneNumber ?? '';
  const name = nameOverride ?? config?.name ?? '';
  const description = descriptionOverride ?? config?.description ?? '';
  const agentId = agentIdOverride ?? config?.mapping?.agentId ?? '';

  // Setters that mark the field as overridden
  const setPhoneNumber = (value: string) => setPhoneNumberOverride(value);
  const setName = (value: string) => setNameOverride(value);
  const setDescription = (value: string) => setDescriptionOverride(value);
  const setAgentId = (value: string) => setAgentIdOverride(value);

  // Check if any field has been changed from config
  const hasChanges =
    config !== undefined &&
    (phoneNumberOverride !== null ||
      nameOverride !== null ||
      descriptionOverride !== null ||
      agentIdOverride !== null);

  // Reset overrides after successful save
  const resetOverrides = () => {
    setPhoneNumberOverride(null);
    setNameOverride(null);
    setDescriptionOverride(null);
    setAgentIdOverride(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber.trim())) {
      toast.error('Phone number must be in E.164 format (e.g., +17708304765)');
      return;
    }

    setIsSaving(true);

    try {
      await updateConfig.mutateAsync({
        id: phoneConfigId,
        phoneNumber: phoneNumber.trim(),
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        agentId: agentId || null,
      });

      toast.success('Phone number updated');
      resetOverrides();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update phone number');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings/phone">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings/phone">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Phone Number Not Found</h1>
            <p className="text-muted-foreground">The phone number could not be loaded</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load phone number. It may have been deleted.
            </p>
            <Link href="/settings/phone" className="mt-4 inline-block">
              <Button variant="outline">Return to Phone Numbers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/phone">
            <Button type="button" variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {formatPhoneNumber(config.phoneNumber)}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {config.mapping ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {config.mapping.agentName || 'Mapped'}
                  </Badge>
                ) : (
                  <Badge variant="outline">Unmapped</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button type="submit" disabled={isSaving || !hasChanges}>
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

      {/* Phone Number */}
      <Card>
        <CardHeader>
          <CardTitle>Phone Number</CardTitle>
          <CardDescription>The phone number in E.164 format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              placeholder="+17708304765"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Must be in E.164 format (e.g., +17708304765 for US numbers)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Optional name and description for this phone number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Main Support Line"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this phone number is used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agent Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Mapping</CardTitle>
          <CardDescription>
            Map this phone number to an agent for call routing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent">Mapped Agent</Label>
            <Select value={agentId || '__none__'} onValueChange={(val) => setAgentId(val === '__none__' ? '' : val)}>
              <SelectTrigger id="agent">
                <SelectValue placeholder={agentsLoading ? 'Loading agents...' : 'Select an agent (optional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">No agent (unmapped)</span>
                </SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When a call comes in to this number, it will be routed to the selected agent
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
