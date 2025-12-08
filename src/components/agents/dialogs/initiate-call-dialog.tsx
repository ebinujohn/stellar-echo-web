'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Phone, PhoneOutgoing, Loader2, ExternalLink } from 'lucide-react';
import {
  useInitiateOutboundCall,
  useCallStatus,
  type OutboundCallResponse,
} from '@/lib/hooks/use-calls';
import { formatPhoneNumber } from '@/lib/utils/formatters';

interface PhoneConfig {
  id: string;
  phoneNumber: string;
  name: string | null;
}

interface InitiateCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
  };
  phoneConfigs: PhoneConfig[];
}

type CallState = 'idle' | 'initiating' | 'active' | 'completed' | 'failed';

const TERMINAL_STATUSES = ['completed', 'busy', 'no-answer', 'failed', 'canceled'];
const ACTIVE_STATUSES = ['initiating', 'queued', 'ringing', 'in-progress'];

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'in-progress') return 'secondary';
  if (['failed', 'busy', 'no-answer', 'canceled'].includes(status)) return 'destructive';
  return 'outline';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    initiating: 'Initiating...',
    queued: 'Queued',
    ringing: 'Ringing...',
    'in-progress': 'In Progress',
    completed: 'Completed',
    busy: 'Busy',
    'no-answer': 'No Answer',
    failed: 'Failed',
    canceled: 'Canceled',
  };
  return labels[status] || status;
}

export function InitiateCallDialog({
  open,
  onOpenChange,
  agent,
  phoneConfigs,
}: InitiateCallDialogProps) {
  const router = useRouter();
  const [toNumber, setToNumber] = useState('');
  const [fromNumber, setFromNumber] = useState<string>('');
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<OutboundCallResponse | null>(null);

  const initiateCall = useInitiateOutboundCall();

  // Poll for call status when a call is active
  const { data: callStatus } = useCallStatus(activeCall?.callId ?? null, {
    enabled: callState === 'active',
    refetchInterval: callState === 'active' ? 2000 : undefined, // Poll every 2 seconds
  });

  // Update call state based on status
  useEffect(() => {
    if (callStatus) {
      if (TERMINAL_STATUSES.includes(callStatus.status)) {
        setCallState(callStatus.status === 'completed' ? 'completed' : 'failed');
      }
    }
  }, [callStatus]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset after dialog closes
      setTimeout(() => {
        setToNumber('');
        setFromNumber('');
        setCallState('idle');
        setActiveCall(null);
      }, 200);
    }
  }, [open]);

  const handleInitiateCall = async () => {
    if (!toNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Basic E.164 validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(toNumber.trim())) {
      toast.error('Phone number must be in E.164 format (e.g., +15551234567)');
      return;
    }

    setCallState('initiating');

    try {
      const result = await initiateCall.mutateAsync({
        agentId: agent.id,
        toNumber: toNumber.trim(),
        fromNumber: fromNumber || undefined,
      });

      setActiveCall(result);
      setCallState('active');
      toast.success(`Call initiated to ${formatPhoneNumber(result.toNumber)}`);
    } catch (error) {
      console.error('Failed to initiate call:', error);
      setCallState('failed');
      toast.error(error instanceof Error ? error.message : 'Failed to initiate call');
    }
  };

  const handleViewCall = () => {
    if (activeCall) {
      onOpenChange(false);
      router.push(`/calls/${activeCall.callId}`);
    }
  };

  const handleClose = () => {
    if (callState === 'initiating') {
      // Don't allow closing while initiating
      return;
    }
    onOpenChange(false);
  };

  const isCallActive = callState === 'active' || callState === 'initiating';
  const currentStatus = callStatus?.status || activeCall?.status || '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneOutgoing className="h-5 w-5" />
            Initiate Outbound Call
          </DialogTitle>
          <DialogDescription>
            Start a call using the agent &quot;{agent.name}&quot;
          </DialogDescription>
        </DialogHeader>

        {callState === 'idle' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="toNumber">Destination Phone Number *</Label>
              <Input
                id="toNumber"
                placeholder="+15551234567"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the phone number in E.164 format (e.g., +15551234567)
              </p>
            </div>

            {phoneConfigs.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="fromNumber">Caller ID (Optional)</Label>
                <Select value={fromNumber || '_default'} onValueChange={(val) => setFromNumber(val === '_default' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use agent's default number" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_default">Use agent&apos;s default number</SelectItem>
                    {phoneConfigs.map((config) => (
                      <SelectItem key={config.id} value={config.phoneNumber}>
                        {formatPhoneNumber(config.phoneNumber)}
                        {config.name && ` - ${config.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a phone number to use as the caller ID, or leave empty to use the
                  agent&apos;s mapped phone number.
                </p>
              </div>
            )}
          </div>
        )}

        {(callState === 'initiating' || callState === 'active') && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                {ACTIVE_STATUSES.includes(currentStatus) && (
                  <div className="absolute -bottom-1 -right-1">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                  {formatPhoneNumber(activeCall?.toNumber || toNumber)}
                </p>
                <Badge variant={getStatusBadgeVariant(currentStatus)}>
                  {getStatusLabel(currentStatus)}
                </Badge>
              </div>

              {activeCall && (
                <div className="text-sm text-muted-foreground space-y-1 text-center">
                  <p>
                    From: {formatPhoneNumber(activeCall.fromNumber)}
                  </p>
                  <p className="font-mono text-xs">
                    Call ID: {activeCall.callId}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {(callState === 'completed' || callState === 'failed') && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                  {formatPhoneNumber(activeCall?.toNumber || toNumber)}
                </p>
                <Badge variant={getStatusBadgeVariant(callStatus?.status || '')}>
                  {getStatusLabel(callStatus?.status || activeCall?.status || '')}
                </Badge>
              </div>

              {callStatus?.durationSeconds !== null && callStatus?.durationSeconds !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Duration: {Math.floor(callStatus.durationSeconds / 60)}:
                  {(callStatus.durationSeconds % 60).toString().padStart(2, '0')}
                </p>
              )}

              {callStatus?.errorMessage && (
                <p className="text-sm text-destructive">
                  {callStatus.errorMessage}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {callState === 'idle' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleInitiateCall}
                disabled={initiateCall.isPending}
              >
                {initiateCall.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  <>
                    <PhoneOutgoing className="mr-2 h-4 w-4" />
                    Start Call
                  </>
                )}
              </Button>
            </>
          )}

          {(callState === 'initiating' || callState === 'active') && (
            <Button
              type="button"
              variant="outline"
              onClick={handleViewCall}
              disabled={!activeCall}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Call Details
            </Button>
          )}

          {(callState === 'completed' || callState === 'failed') && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleViewCall}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Call Details
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setCallState('idle');
                  setActiveCall(null);
                  setToNumber('');
                }}
              >
                Make Another Call
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
