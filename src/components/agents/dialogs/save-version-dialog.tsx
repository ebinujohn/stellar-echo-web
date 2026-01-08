'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

interface SaveVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (notes: string) => void;
  isSaving?: boolean;
  defaultNotes?: string;
}

export function SaveVersionDialog({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
  defaultNotes = '',
}: SaveVersionDialogProps) {
  const [notes, setNotes] = useState(defaultNotes);

  // Reset notes when dialog opens - this is intentional form reset behavior
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional form reset on dialog open
      setNotes(defaultNotes);
    }
  }, [open, defaultNotes]);

  const handleSave = () => {
    onSave(notes.trim() || 'Updated agent configuration');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save New Version
          </DialogTitle>
          <DialogDescription>
            Add notes to describe the changes in this version. This helps track what was modified.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="notes">Version Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Updated greeting message, Fixed transition logic..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={isSaving}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Press Cmd/Ctrl + Enter to save quickly
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
