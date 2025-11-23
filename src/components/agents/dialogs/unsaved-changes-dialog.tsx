'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export type UnsavedChangesAction = 'save' | 'discard' | 'cancel';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: UnsavedChangesAction) => void;
  targetTab?: string;
  isNavigatingAway?: boolean;
  isSaving?: boolean;
  hasSaveOption?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onAction,
  targetTab,
  isNavigatingAway = false,
  isSaving = false,
  hasSaveOption = true,
}: UnsavedChangesDialogProps) {
  const getMessage = () => {
    if (isNavigatingAway) {
      return 'You have unsaved changes. If you leave this page, your changes will be lost.';
    }
    if (targetTab) {
      return `You have unsaved changes. If you switch to the "${targetTab}" tab, your changes will be lost.`;
    }
    return 'You have unsaved changes that will be lost if you continue.';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            {getMessage()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={() => onAction('cancel')}
            disabled={isSaving}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => onAction('discard')}
            disabled={isSaving}
          >
            Discard Changes
          </Button>
          {hasSaveOption && (
            <AlertDialogAction
              onClick={() => onAction('save')}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
