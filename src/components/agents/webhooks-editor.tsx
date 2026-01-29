'use client';

import { useState, useCallback, memo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Eye, EyeOff, Settings2 } from 'lucide-react';
import type { WebhookDraft } from './contexts/agent-draft-context';

// ========================================
// Types
// ========================================

type WebhookEvent = 'call_started' | 'call_ended' | 'call_analyzed';

interface WebhooksEditorProps {
  config: WebhookDraft;
  onChange: (config: WebhookDraft) => void;
}

// ========================================
// Event Selection Component
// ========================================

interface EventSelectionProps {
  selectedEvents: WebhookEvent[];
  onChange: (events: WebhookEvent[]) => void;
}

const EVENT_OPTIONS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: 'call_started', label: 'Call Started', description: 'Triggered when a call begins' },
  { value: 'call_ended', label: 'Call Ended', description: 'Triggered when a call ends' },
  {
    value: 'call_analyzed',
    label: 'Call Analyzed',
    description: 'Triggered after post-call analysis completes',
  },
];

const EventSelection = memo(function EventSelection({
  selectedEvents,
  onChange,
}: EventSelectionProps) {
  const handleToggle = useCallback(
    (event: WebhookEvent) => {
      const newEvents = selectedEvents.includes(event)
        ? selectedEvents.filter((e) => e !== event)
        : [...selectedEvents, event];
      onChange(newEvents);
    },
    [selectedEvents, onChange]
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm">Events</Label>
      <div className="flex flex-wrap gap-2">
        {EVENT_OPTIONS.map((option) => (
          <Badge
            key={option.value}
            variant={selectedEvents.includes(option.value) ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1"
            onClick={() => handleToggle(option.value)}
          >
            {option.label}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Select which events should trigger webhook notifications
      </p>
    </div>
  );
});

// ========================================
// Authentication Section Component
// ========================================

interface AuthSectionProps {
  authType: 'none' | 'bearer' | 'hmac';
  secret: string;
  onAuthTypeChange: (type: 'none' | 'bearer' | 'hmac') => void;
  onSecretChange: (secret: string) => void;
}

const AuthSection = memo(function AuthSection({
  authType,
  secret,
  onAuthTypeChange,
  onSecretChange,
}: AuthSectionProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm">Authentication</Label>
        <Select value={authType} onValueChange={onAuthTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select authentication type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex flex-col items-start">
                <span>None</span>
                <span className="text-xs text-muted-foreground">No authentication</span>
              </div>
            </SelectItem>
            <SelectItem value="bearer">
              <div className="flex flex-col items-start">
                <span>Bearer Token</span>
                <span className="text-xs text-muted-foreground">
                  Authorization: Bearer &lt;token&gt;
                </span>
              </div>
            </SelectItem>
            <SelectItem value="hmac">
              <div className="flex flex-col items-start">
                <span>HMAC Signature</span>
                <span className="text-xs text-muted-foreground">
                  X-Signature header with HMAC-SHA256
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {authType !== 'none' && (
        <div className="space-y-2">
          <Label className="text-sm">{authType === 'bearer' ? 'Bearer Token' : 'HMAC Secret'}</Label>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={secret}
              onChange={(e) => onSecretChange(e.target.value)}
              placeholder={authType === 'bearer' ? 'Enter bearer token' : 'Enter HMAC secret'}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {authType === 'bearer'
              ? 'Token will be sent in Authorization header'
              : 'Secret used to sign the request payload'}
          </p>
        </div>
      )}
    </div>
  );
});

// ========================================
// Advanced Settings Component
// ========================================

interface AdvancedSettingsProps {
  timeoutSeconds: number;
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  onTimeoutChange: (value: number) => void;
  onRetryChange: (field: string, value: number) => void;
}

const AdvancedSettings = memo(function AdvancedSettings({
  timeoutSeconds,
  maxRetries,
  initialDelayMs,
  maxDelayMs,
  backoffMultiplier,
  onTimeoutChange,
  onRetryChange,
}: AdvancedSettingsProps) {
  return (
    <div className="space-y-4 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4" />
        <Label className="text-xs font-medium">Advanced Settings</Label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Timeout (seconds)</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={timeoutSeconds}
            onChange={(e) => onTimeoutChange(parseInt(e.target.value) || 10)}
          />
          <p className="text-xs text-muted-foreground">Request timeout (1-30 seconds)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Max Retries</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={maxRetries}
            onChange={(e) => onRetryChange('maxRetries', parseInt(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground">Number of retry attempts (0-10)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Initial Delay (ms)</Label>
          <Input
            type="number"
            min={100}
            max={60000}
            step={100}
            value={initialDelayMs}
            onChange={(e) => onRetryChange('initialDelayMs', parseInt(e.target.value) || 1000)}
          />
          <p className="text-xs text-muted-foreground">Initial retry delay (100-60000ms)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Max Delay (ms)</Label>
          <Input
            type="number"
            min={1000}
            max={60000}
            step={1000}
            value={maxDelayMs}
            onChange={(e) => onRetryChange('maxDelayMs', parseInt(e.target.value) || 10000)}
          />
          <p className="text-xs text-muted-foreground">Maximum retry delay (1000-60000ms)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Backoff Multiplier</Label>
          <Input
            type="number"
            min={1}
            max={5}
            step={0.5}
            value={backoffMultiplier}
            onChange={(e) => onRetryChange('backoffMultiplier', parseFloat(e.target.value) || 2.0)}
          />
          <p className="text-xs text-muted-foreground">Exponential backoff multiplier (1-5)</p>
        </div>
      </div>
    </div>
  );
});

// ========================================
// Main Component
// ========================================

export function WebhooksEditor({ config, onChange }: WebhooksEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Validate URL
  const validateUrl = useCallback((url: string): boolean => {
    if (!url) {
      setUrlError(null);
      return true;
    }
    try {
      new URL(url);
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  }, []);

  // Handle enabled change
  const handleEnabledChange = useCallback(
    (enabled: boolean) => {
      onChange({ ...config, enabled });
    },
    [config, onChange]
  );

  // Handle URL change
  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      validateUrl(url);
      onChange({ ...config, url });
    },
    [config, onChange, validateUrl]
  );

  // Handle events change
  const handleEventsChange = useCallback(
    (events: WebhookEvent[]) => {
      onChange({ ...config, events });
    },
    [config, onChange]
  );

  // Handle auth type change
  const handleAuthTypeChange = useCallback(
    (type: 'none' | 'bearer' | 'hmac') => {
      onChange({
        ...config,
        auth: { ...config.auth, type, secret: type === 'none' ? '' : config.auth.secret },
      });
    },
    [config, onChange]
  );

  // Handle secret change
  const handleSecretChange = useCallback(
    (secret: string) => {
      onChange({ ...config, auth: { ...config.auth, secret } });
    },
    [config, onChange]
  );

  // Handle include transcript change
  const handleIncludeTranscriptChange = useCallback(
    (includeTranscript: boolean) => {
      onChange({ ...config, includeTranscript });
    },
    [config, onChange]
  );

  // Handle include latency metrics change
  const handleIncludeLatencyMetricsChange = useCallback(
    (includeLatencyMetrics: boolean) => {
      onChange({ ...config, includeLatencyMetrics });
    },
    [config, onChange]
  );

  // Handle timeout change
  const handleTimeoutChange = useCallback(
    (timeoutSeconds: number) => {
      onChange({ ...config, timeoutSeconds });
    },
    [config, onChange]
  );

  // Handle retry config change
  const handleRetryChange = useCallback(
    (field: string, value: number) => {
      onChange({
        ...config,
        retry: { ...config.retry, [field]: value },
      });
    },
    [config, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Enable Webhooks</Label>
          <p className="text-sm text-muted-foreground">
            Send HTTP notifications for call lifecycle events
          </p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={handleEnabledChange} />
      </div>

      {config.enabled && (
        <div className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label className="text-sm">Webhook URL *</Label>
            <Input
              type="url"
              value={config.url}
              onChange={handleUrlChange}
              placeholder="https://api.example.com/webhooks/stellar-echo"
              className={urlError ? 'border-destructive' : ''}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            <p className="text-xs text-muted-foreground">
              HTTPS endpoint that will receive POST requests
            </p>
          </div>

          {/* Event Selection */}
          <EventSelection selectedEvents={config.events} onChange={handleEventsChange} />

          {/* Authentication */}
          <AuthSection
            authType={config.auth.type}
            secret={config.auth.secret}
            onAuthTypeChange={handleAuthTypeChange}
            onSecretChange={handleSecretChange}
          />

          {/* Payload Options */}
          <div className="space-y-3">
            <Label className="text-sm">Payload Options</Label>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Include Transcript</Label>
                <p className="text-xs text-muted-foreground">
                  Include full call transcript in call_ended and call_analyzed events
                </p>
              </div>
              <Switch
                checked={config.includeTranscript}
                onCheckedChange={handleIncludeTranscriptChange}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Include Latency Metrics</Label>
                <p className="text-xs text-muted-foreground">
                  Include per-turn latency metrics in call_ended events
                </p>
              </div>
              <Switch
                checked={config.includeLatencyMetrics}
                onCheckedChange={handleIncludeLatencyMetricsChange}
              />
            </div>
          </div>

          {/* Advanced Settings (Collapsible) */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-auto p-0">
                {showAdvanced ? (
                  <ChevronDown className="mr-1 h-3 w-3" />
                ) : (
                  <ChevronRight className="mr-1 h-3 w-3" />
                )}
                <span className="text-xs">Advanced Settings</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <AdvancedSettings
                timeoutSeconds={config.timeoutSeconds}
                maxRetries={config.retry.maxRetries}
                initialDelayMs={config.retry.initialDelayMs}
                maxDelayMs={config.retry.maxDelayMs}
                backoffMultiplier={config.retry.backoffMultiplier}
                onTimeoutChange={handleTimeoutChange}
                onRetryChange={handleRetryChange}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
