'use client';

import { useState, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileJson, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useImportAgent } from '@/lib/hooks/use-agents';
import type { ImportAgentResult } from '@/lib/hooks/use-agents';
import type { ImportAgentInput } from '@/lib/validations/agents';
import { toast } from 'sonner';

interface ImportAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'preview' | 'result';

interface ParsedAgent {
  name: string;
  description?: string;
  nodeCount: number;
  initialNode: string;
  agentJson: Record<string, unknown>;
}

export function ImportAgentDialog({ open, onOpenChange }: ImportAgentDialogProps) {
  const router = useRouter();
  const importAgent = useImportAgent();

  const [step, setStep] = useState<Step>('upload');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedAgent, setParsedAgent] = useState<ParsedAgent | null>(null);
  const [notes, setNotes] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [result, setResult] = useState<ImportAgentResult | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setParseError(null);
    setParsedAgent(null);
    setNotes('');
    setDryRun(false);
    setResult(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetState();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetState]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setParseError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const json = JSON.parse(text);

          // Smart format detection: handle both direct { agent, workflow }
          // and export format { config_json: { agent, workflow } }
          let agentJson: Record<string, unknown>;
          if (json.config_json && typeof json.config_json === 'object') {
            agentJson = json.config_json as Record<string, unknown>;
          } else if (json.agent && json.workflow) {
            agentJson = json;
          } else {
            setParseError(
              'Invalid format. Expected either { agent, workflow } or { config_json: { agent, workflow } }'
            );
            return;
          }

          const agent = agentJson.agent as Record<string, unknown> | undefined;
          const workflow = agentJson.workflow as Record<string, unknown> | undefined;

          if (!agent?.name) {
            setParseError('Missing agent.name in JSON');
            return;
          }

          if (!workflow?.initial_node) {
            setParseError('Missing workflow.initial_node in JSON');
            return;
          }

          const nodes = workflow.nodes as unknown[] | undefined;
          if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
            setParseError('Missing or empty workflow.nodes in JSON');
            return;
          }

          setParsedAgent({
            name: agent.name as string,
            description: agent.description as string | undefined,
            nodeCount: nodes.length,
            initialNode: workflow.initial_node as string,
            agentJson,
          });
          setStep('preview');
        } catch {
          setParseError('Invalid JSON file. Please check the file format.');
        }
      };
      reader.readAsText(file);

      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!parsedAgent) return;

    try {
      const response = await importAgent.mutateAsync({
        agentJson: parsedAgent.agentJson as ImportAgentInput['agentJson'],
        notes: notes.trim() || undefined,
        dryRun,
      });

      const importResult = response.data;
      setResult(importResult);
      setStep('result');

      if (importResult.action === 'validated') {
        toast.success('Dry run validation passed');
      } else if (importResult.action === 'created') {
        toast.success(`Agent "${importResult.agentName}" created (v${importResult.version})`);
      } else if (importResult.action === 'updated') {
        toast.success(`Agent "${importResult.agentName}" updated to v${importResult.version}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    }
  }, [parsedAgent, notes, dryRun, importAgent]);

  const handleNavigateToAgent = useCallback(() => {
    if (result?.agentId) {
      handleOpenChange(false);
      router.push(`/agents/${result.agentId}`);
    }
  }, [result, handleOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import Agent Configuration</DialogTitle>
          <DialogDescription>
            Upload an agent JSON file to create a new agent or update an existing one.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
              <FileJson className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-4 text-sm text-muted-foreground">
                Select a JSON file containing an agent configuration
              </p>
              <Label htmlFor="agent-json-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </span>
                </Button>
              </Label>
              <Input
                id="agent-json-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            {parseError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{parseError}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Accepts exported agent JSON or raw agent config with <code>agent</code> and{' '}
              <code>workflow</code> keys.
            </p>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && parsedAgent && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Agent Name</span>
                <span className="text-sm">{parsedAgent.name}</span>
              </div>
              {parsedAgent.description && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Description</span>
                  <span className="text-sm text-muted-foreground truncate max-w-[250px]">
                    {parsedAgent.description}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nodes</span>
                <Badge variant="secondary">{parsedAgent.nodeCount} nodes</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Initial Node</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {parsedAgent.initialNode}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-notes">Notes (optional)</Label>
              <Textarea
                id="import-notes"
                placeholder="e.g., Imported from production backup"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dry-run"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="dry-run" className="text-sm font-normal cursor-pointer">
                Dry run (validate only, don&apos;t create)
              </Label>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {result.action === 'created' && `Agent created: ${result.agentName}`}
                  {result.action === 'updated' && `Agent updated: ${result.agentName}`}
                  {result.action === 'validated' && `Validation passed: ${result.agentName}`}
                  {result.action === 'failed' && `Import failed`}
                </p>
                {result.version && (
                  <p className="text-sm text-muted-foreground">Version {result.version}</p>
                )}
              </div>
            </div>

            {result.errorMessage && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{result.errorMessage}</p>
              </div>
            )}

            {result.validationWarnings && result.validationWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <p className="mb-1 text-sm font-medium text-amber-800 dark:text-amber-200">
                  Warnings
                </p>
                <ul className="list-inside list-disc space-y-1">
                  {result.validationWarnings.map((warning, i) => (
                    <li key={i} className="text-sm text-amber-700 dark:text-amber-300">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.success && result.action !== 'validated' && (
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voice linked</span>
                  <span>{result.voiceConfigLinked ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RAG enabled</span>
                  <span>{result.ragEnabled ? 'Yes' : 'No'}</span>
                </div>
                {result.phoneNumbersMapped > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone numbers mapped</span>
                    <span>{result.phoneNumbersMapped}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setParsedAgent(null);
                }}
              >
                Back
              </Button>
              <Button onClick={handleImport} disabled={importAgent.isPending}>
                {importAgent.isPending
                  ? 'Importing...'
                  : dryRun
                    ? 'Validate'
                    : 'Import'}
              </Button>
            </>
          )}

          {step === 'result' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              {result?.success && result.action === 'created' && (
                <Button onClick={handleNavigateToAgent}>View Agent</Button>
              )}
              {result?.success && result.action === 'updated' && (
                <Button onClick={handleNavigateToAgent}>View Agent</Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
