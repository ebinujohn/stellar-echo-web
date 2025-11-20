'use client';

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
import { useDeleteAgent } from '@/lib/hooks/use-agents';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface DeleteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    callCount?: number;
    phoneMappingCount?: number;
  } | null;
}

export function DeleteAgentDialog({ open, onOpenChange, agent }: DeleteAgentDialogProps) {
  const router = useRouter();
  const deleteAgent = useDeleteAgent();

  const handleDelete = async () => {
    if (!agent) return;

    try {
      await deleteAgent.mutateAsync(agent.id);
      toast.success(`Agent "${agent.name}" deleted successfully`);
      onOpenChange(false);

      // Navigate back to agents list
      router.push('/agents');
    } catch (error) {
      console.error('Failed to delete agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete agent');
    }
  };

  if (!agent) return null;

  const hasPhoneMappings = (agent.phoneMappingCount ?? 0) > 0;
  const hasCalls = (agent.callCount ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Agent
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this agent? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="font-medium">{agent.name}</p>
            {agent.callCount !== undefined && (
              <p className="text-sm text-muted-foreground mt-1">
                {agent.callCount} call{agent.callCount !== 1 ? 's' : ''} recorded
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">What will be deleted:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Agent configuration and all versions</li>
              {hasPhoneMappings && (
                <li className="text-destructive">
                  {agent.phoneMappingCount} phone number mapping{agent.phoneMappingCount !== 1 ? 's' : ''} will be cleared
                </li>
              )}
            </ul>

            {hasCalls && (
              <p className="text-amber-600 dark:text-amber-500 font-medium mt-3">
                Note: Call history will be preserved but will no longer be associated with this agent.
              </p>
            )}
          </div>

          {hasPhoneMappings && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">
                Warning: This agent is currently mapped to {agent.phoneMappingCount} phone number
                {agent.phoneMappingCount !== 1 ? 's' : ''}. Deleting it will clear these mappings.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteAgent.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteAgent.isPending}
          >
            {deleteAgent.isPending ? 'Deleting...' : 'Delete Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
