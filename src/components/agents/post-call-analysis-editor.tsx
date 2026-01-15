'use client';

import { useState, useCallback, memo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, ChevronDown, ChevronRight, FileSearch } from 'lucide-react';
import { QuestionChoicesEditor } from './question-choices-editor';
import type {
  PostCallAnalysisDraft,
  PostCallQuestionDraft,
  QuestionChoiceDraft,
} from './contexts/agent-draft-context';

// ========================================
// Types
// ========================================

interface PostCallAnalysisEditorProps {
  config: PostCallAnalysisDraft;
  onChange: (config: PostCallAnalysisDraft) => void;
}

// ========================================
// Question Card Component
// ========================================

interface QuestionCardProps {
  index: number;
  question: PostCallQuestionDraft;
  onUpdate: (question: PostCallQuestionDraft) => void;
  onDelete: () => void;
}

const QuestionCard = memo(function QuestionCard({
  index,
  question,
  onUpdate,
  onDelete,
}: QuestionCardProps) {
  // Local state for all fields - prevents re-renders on every keystroke
  const [localName, setLocalName] = useState(question.name);
  const [localDescription, setLocalDescription] = useState(question.description);
  const [localType, setLocalType] = useState(question.type);
  const [localRequired, setLocalRequired] = useState(question.required);
  const [localChoices, setLocalChoices] = useState<QuestionChoiceDraft[]>(question.choices);

  // Sync name to parent on blur
  const handleNameBlur = useCallback(() => {
    onUpdate({
      ...question,
      name: localName,
      description: localDescription,
      type: localType,
      required: localRequired,
      choices: localChoices,
    });
  }, [localName, localDescription, localType, localRequired, localChoices, question, onUpdate]);

  // Sync description to parent on blur
  const handleDescriptionBlur = useCallback(() => {
    onUpdate({
      ...question,
      name: localName,
      description: localDescription,
      type: localType,
      required: localRequired,
      choices: localChoices,
    });
  }, [localName, localDescription, localType, localRequired, localChoices, question, onUpdate]);

  // Type change syncs immediately (dropdown selection)
  const handleTypeChange = useCallback(
    (newType: 'string' | 'number' | 'enum' | 'boolean') => {
      setLocalType(newType);
      onUpdate({
        ...question,
        name: localName,
        description: localDescription,
        type: newType,
        required: localRequired,
        choices: localChoices,
      });
    },
    [localName, localDescription, localRequired, localChoices, question, onUpdate]
  );

  // Required toggle syncs immediately
  const handleRequiredChange = useCallback(
    (newRequired: boolean) => {
      setLocalRequired(newRequired);
      onUpdate({
        ...question,
        name: localName,
        description: localDescription,
        type: localType,
        required: newRequired,
        choices: localChoices,
      });
    },
    [localName, localDescription, localType, localChoices, question, onUpdate]
  );

  // Choices change syncs immediately
  const handleChoicesChange = useCallback(
    (newChoices: QuestionChoiceDraft[]) => {
      setLocalChoices(newChoices);
      onUpdate({
        ...question,
        name: localName,
        description: localDescription,
        type: localType,
        required: localRequired,
        choices: newChoices,
      });
    },
    [localName, localDescription, localType, localRequired, question, onUpdate]
  );

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          Question {index + 1}
        </Badge>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Name *</Label>
          <Input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Question name or text"
            className="mt-1.5 h-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={localType} onValueChange={handleTypeChange}>
              <SelectTrigger className="mt-1.5 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="enum">Enum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id={`required-${index}`}
                checked={localRequired}
                onCheckedChange={handleRequiredChange}
              />
              <Label htmlFor={`required-${index}`} className="text-xs">
                Required
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Additional context for the AI analyzer..."
          className="mt-1.5 min-h-[60px] text-sm"
        />
      </div>

      {localType === 'enum' && (
        <QuestionChoicesEditor choices={localChoices} onChange={handleChoicesChange} />
      )}
    </div>
  );
});

// ========================================
// Main Component
// ========================================

export function PostCallAnalysisEditor({ config, onChange }: PostCallAnalysisEditorProps) {
  const [isOpen, setIsOpen] = useState(config.enabled || config.questions.length > 0);

  // Toggle enabled state
  const handleEnabledChange = useCallback(
    (enabled: boolean) => {
      onChange({ ...config, enabled });
    },
    [config, onChange]
  );

  // Update additional instructions
  const handleInstructionsChange = useCallback(
    (additionalInstructions: string) => {
      onChange({ ...config, additionalInstructions });
    },
    [config, onChange]
  );

  // Add new question
  const handleAddQuestion = useCallback(() => {
    const newQuestion: PostCallQuestionDraft = {
      name: '',
      description: '',
      type: 'string',
      choices: [],
      required: false,
    };
    onChange({ ...config, questions: [...config.questions, newQuestion] });
    setIsOpen(true);
  }, [config, onChange]);

  // Update question
  const handleUpdateQuestion = useCallback(
    (index: number, question: PostCallQuestionDraft) => {
      const newQuestions = [...config.questions];
      newQuestions[index] = question;
      onChange({ ...config, questions: newQuestions });
    },
    [config, onChange]
  );

  // Delete question
  const handleDeleteQuestion = useCallback(
    (index: number) => {
      onChange({ ...config, questions: config.questions.filter((_, i) => i !== index) });
    },
    [config, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Enable Post-Call Analysis</Label>
          <p className="text-sm text-muted-foreground">
            Run AI analysis on call transcripts after each call ends
          </p>
        </div>
        <Switch checked={config.enabled} onCheckedChange={handleEnabledChange} />
      </div>

      {config.enabled && (
        <>
          {/* Additional Instructions */}
          <div className="space-y-2">
            <Label className="text-sm">Additional Instructions</Label>
            <Textarea
              value={config.additionalInstructions}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              placeholder="Extra instructions for the analysis LLM (e.g., 'Focus on social determinants of health. Be sensitive to indirect mentions of hardship.')..."
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Custom guidance for the AI when analyzing call transcripts.
            </p>
          </div>

          {/* Questions Section */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-auto p-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Label className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                  <FileSearch className="mr-2 inline h-4 w-4" />
                  Questions ({config.questions.length})
                </Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                className="h-8"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Question
              </Button>
            </div>

            <CollapsibleContent className="mt-4 space-y-3">
              {config.questions.length === 0 ? (
                <div className="rounded-lg border border-dashed py-4 text-center">
                  <p className="text-sm text-muted-foreground">No questions defined.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add questions to extract specific data from call transcripts.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Define structured questions for the AI to answer from the call transcript.
                  </p>
                  {config.questions.map((question, index) => (
                    <QuestionCard
                      key={index}
                      index={index}
                      question={question}
                      onUpdate={(q) => handleUpdateQuestion(index, q)}
                      onDelete={() => handleDeleteQuestion(index)}
                    />
                  ))}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
