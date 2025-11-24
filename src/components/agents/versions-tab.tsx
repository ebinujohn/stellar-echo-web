'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  History,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  Power,
  FileCode,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAgentVersions, useActivateVersion } from '@/lib/hooks/use-agents';
import { formatDateTime } from '@/lib/utils/formatters';
import { toast } from 'sonner';
import type { WorkflowConfig } from '@/lib/validations/agents';

interface VersionsTabProps {
  agentId: string;
  activeVersionId?: string;
}

interface AgentVersion {
  id: string;
  agentId: string;
  tenantId: string;
  version: number;
  configJson: WorkflowConfig;
  globalPrompt: string | null;
  ragEnabled: boolean;
  ragConfigId: string | null;
  voiceConfigId: string | null; // FK to voice_configs table
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  notes: string | null;
}

export function VersionsTab({ agentId, activeVersionId }: VersionsTabProps) {
  const { data: versions, isLoading, error } = useAgentVersions(agentId);
  const activateVersion = useActivateVersion();
  const [selectedVersion, setSelectedVersion] = useState<AgentVersion | null>(null);
  const [viewConfigOpen, setViewConfigOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['workflow']));

  const handleActivateVersion = async (version: AgentVersion) => {
    if (version.isActive) {
      toast.info('This version is already active');
      return;
    }

    try {
      await activateVersion.mutateAsync({
        agentId,
        versionId: version.id,
      });
      toast.success(`Version ${version.version} activated successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to activate version');
    }
  };

  const handleViewConfig = (version: AgentVersion) => {
    setSelectedVersion(version);
    setViewConfigOpen(true);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>Loading version history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>Failed to load version history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>Manage and compare configuration versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Versions Found</p>
            <p className="text-sm">
              This agent doesn&apos;t have any configuration versions yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            {versions.length} version{versions.length !== 1 ? 's' : ''} available. Activate any
            version to make it the current configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Version</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version: AgentVersion) => (
                <TableRow key={version.id} className={version.isActive ? 'bg-muted/30' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={version.isActive ? 'default' : 'outline'}>
                        v{version.version}
                      </Badge>
                      {version.isActive && (
                        <span title="Active version">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{version.createdBy || 'Unknown'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(version.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                      {version.notes || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewConfig(version)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Configuration
                        </DropdownMenuItem>
                        {!version.isActive && (
                          <DropdownMenuItem
                            onClick={() => handleActivateVersion(version)}
                            disabled={activateVersion.isPending}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            Activate Version
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Version Configuration Dialog */}
      <Dialog open={viewConfigOpen} onOpenChange={setViewConfigOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Version {selectedVersion?.version} Configuration
              {selectedVersion?.isActive && (
                <Badge variant="default" className="ml-2">
                  Active
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Created by {selectedVersion?.createdBy || 'Unknown'} on{' '}
              {selectedVersion && formatDateTime(selectedVersion.createdAt)}
              {selectedVersion?.notes && (
                <span className="block mt-1 text-foreground">{selectedVersion.notes}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedVersion && (
              <div className="space-y-4">
                {/* Version-level Settings Section */}
                <ConfigSection
                  title="Version Settings"
                  data={{
                    globalPrompt: selectedVersion.globalPrompt || '(not set)',
                    ragEnabled: selectedVersion.ragEnabled,
                    ragConfigId: selectedVersion.ragConfigId || '(not set)',
                    voiceConfigId: selectedVersion.voiceConfigId || '(not set)',
                  }}
                  expanded={expandedSections.has('version_settings')}
                  onToggle={() => toggleSection('version_settings')}
                />

                {/* Agent Section */}
                {selectedVersion.configJson?.agent && (
                  <ConfigSection
                    title="Agent"
                    data={selectedVersion.configJson.agent}
                    expanded={expandedSections.has('agent')}
                    onToggle={() => toggleSection('agent')}
                  />
                )}

                {/* Workflow Section */}
                {selectedVersion.configJson?.workflow && (
                  <ConfigSection
                    title="Workflow"
                    data={selectedVersion.configJson.workflow}
                    expanded={expandedSections.has('workflow')}
                    onToggle={() => toggleSection('workflow')}
                  />
                )}

                {/* LLM Section */}
                {(selectedVersion.configJson as any)?.llm && (
                  <ConfigSection
                    title="LLM Configuration"
                    data={(selectedVersion.configJson as any).llm}
                    expanded={expandedSections.has('llm')}
                    onToggle={() => toggleSection('llm')}
                  />
                )}

                {/* TTS Section */}
                {(selectedVersion.configJson as any)?.tts && (
                  <ConfigSection
                    title="TTS Configuration"
                    data={(selectedVersion.configJson as any).tts}
                    expanded={expandedSections.has('tts')}
                    onToggle={() => toggleSection('tts')}
                  />
                )}

                {/* STT Section */}
                {(selectedVersion.configJson as any)?.stt && (
                  <ConfigSection
                    title="STT Configuration"
                    data={(selectedVersion.configJson as any).stt}
                    expanded={expandedSections.has('stt')}
                    onToggle={() => toggleSection('stt')}
                  />
                )}

                {/* RAG Section (from configJson if present) */}
                {(selectedVersion.configJson as any)?.rag && (
                  <ConfigSection
                    title="RAG Configuration (configJson)"
                    data={(selectedVersion.configJson as any).rag}
                    expanded={expandedSections.has('rag')}
                    onToggle={() => toggleSection('rag')}
                  />
                )}

                {/* Auto Hangup Section */}
                {selectedVersion.configJson?.auto_hangup && (
                  <ConfigSection
                    title="Auto Hangup"
                    data={selectedVersion.configJson.auto_hangup}
                    expanded={expandedSections.has('auto_hangup')}
                    onToggle={() => toggleSection('auto_hangup')}
                  />
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ConfigSectionProps {
  title: string;
  data: unknown;
  expanded: boolean;
  onToggle: () => void;
}

function ConfigSection({ title, data, expanded, onToggle }: ConfigSectionProps) {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t p-3">
          <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
