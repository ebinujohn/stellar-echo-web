'use client';

import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { QuestionChoiceDraft } from './contexts/agent-draft-context';

interface QuestionChoicesEditorProps {
  choices: QuestionChoiceDraft[];
  onChange: (choices: QuestionChoiceDraft[]) => void;
}

export function QuestionChoicesEditor({ choices, onChange }: QuestionChoicesEditorProps) {
  const handleAddChoice = useCallback(() => {
    onChange([...choices, { value: '', label: '' }]);
  }, [choices, onChange]);

  const handleUpdateChoice = useCallback(
    (index: number, updates: Partial<QuestionChoiceDraft>) => {
      const newChoices = [...choices];
      newChoices[index] = { ...newChoices[index], ...updates };
      onChange(newChoices);
    },
    [choices, onChange]
  );

  const handleDeleteChoice = useCallback(
    (index: number) => {
      onChange(choices.filter((_, i) => i !== index));
    },
    [choices, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Choices</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAddChoice} className="h-7">
          <Plus className="mr-1 h-3 w-3" />
          Add Choice
        </Button>
      </div>

      {choices.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-center">
          <p className="text-xs text-muted-foreground">
            No choices defined. Add at least one choice for enum-type questions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {choices.map((choice, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Value (required)"
                  value={choice.value}
                  onChange={(e) => handleUpdateChoice(index, { value: e.target.value })}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Label (optional)"
                  value={choice.label}
                  onChange={(e) => handleUpdateChoice(index, { label: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDeleteChoice(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Value is stored in database, label is shown to users (defaults to value if empty).
      </p>
    </div>
  );
}
