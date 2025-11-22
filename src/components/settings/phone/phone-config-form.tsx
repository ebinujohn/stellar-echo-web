'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePhoneConfig } from '@/lib/hooks/use-phone-configs';
import { useAgents } from '@/lib/hooks/use-agents';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PhoneConfigForm() {
  const router = useRouter();
  const createConfig = useCreatePhoneConfig();
  const { data: agents, isLoading: agentsLoading } = useAgents();

  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);

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
      await createConfig.mutateAsync({
        phoneNumber: phoneNumber.trim(),
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        agentId: agentId || null,
      });

      toast.success('Phone number added');
      router.push('/settings/phone');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add phone number');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/phone">
            <Button type="button" variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add Phone Number</h1>
            <p className="text-muted-foreground">Add a new phone number to your pool</p>
          </div>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Add Phone Number
            </>
          )}
        </Button>
      </div>

      {/* Phone Number */}
      <Card>
        <CardHeader>
          <CardTitle>Phone Number</CardTitle>
          <CardDescription>Enter the phone number in E.164 format</CardDescription>
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

      {/* Basic Info */}
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
            Optionally map this phone number to an agent for call routing
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
