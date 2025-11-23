'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Settings,
  Activity,
  Phone,
  History,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  FileCode,
} from 'lucide-react';
import { useAgent, useCreateVersion } from '@/lib/hooks/use-agents';
import { useAgentPhoneConfigs } from '@/lib/hooks/use-phone-configs';
import { formatDateTime, formatPhoneNumber } from '@/lib/utils/formatters';
import { DeleteAgentDialog } from './dialogs/delete-agent-dialog';
import { WorkflowEditorLayout } from './workflow-editor/workflow-editor-layout';
import { SettingsForm } from './settings-form';
import { VersionsTab } from './versions-tab';
import { toast } from 'sonner';

interface AgentDetailClientProps {
  agentId: string;
}

export function AgentDetailClient({ agentId }: AgentDetailClientProps) {
  const router = useRouter();
  const { data: agent, isLoading, error } = useAgent(agentId);
  const { data: phoneConfigs } = useAgentPhoneConfigs(agentId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const createVersion = useCreateVersion();

  // Handler for settings form - passes all settings explicitly
  const handleSettingsSave = async (
    config: any,
    ragEnabled?: boolean,
    ragConfigId?: string | null,
    voiceConfigId?: string | null,
    globalPrompt?: string | null
  ) => {
    try {
      await createVersion.mutateAsync({
        agentId,
        configJson: config,
        notes: 'Updated via settings',
        globalPrompt,
        ragEnabled,
        ragConfigId,
        voiceConfigId,
      });
      toast.success('New workflow version created');
    } catch (error) {
      throw error;
    }
  };

  // Handler for workflow editor - preserves existing settings (globalPrompt, rag, voice configs)
  const handleWorkflowSave = async (config: any) => {
    try {
      // Preserve existing settings from active version
      const activeVersion = agent?.activeVersion as any;
      await createVersion.mutateAsync({
        agentId,
        configJson: config,
        notes: 'Updated via visual editor',
        globalPrompt: activeVersion?.globalPrompt,
        ragEnabled: activeVersion?.ragEnabled,
        ragConfigId: activeVersion?.ragConfigId,
        voiceConfigId: activeVersion?.voiceConfigId,
      });
      toast.success('New workflow version created');
    } catch (error) {
      throw error; // Re-throw to let WorkflowEditorLayout handle it
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="space-y-6">
        <Link href="/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              {error?.message || 'Agent not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
              <Badge variant="outline">
                <Activity className="mr-1 h-3 w-3" />
                Active
              </Badge>
            </div>
            {agent.description && (
              <p className="text-muted-foreground mt-1">{agent.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Version</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agent.activeVersion ? `v${agent.activeVersion.version}` : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {agent.versionCount} total version{agent.versionCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.callCount}</div>
            <p className="text-xs text-muted-foreground">
              <Link href={`/calls?agent=${agent.id}`} className="hover:underline">
                View call history
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Mappings</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.phoneMappingCount}</div>
            <p className="text-xs text-muted-foreground">
              {agent.phoneMappingCount > 0 ? 'Active numbers' : 'No numbers mapped'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{formatDateTime(agent.updatedAt)}</div>
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(agent.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Editor</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Phone Numbers Section */}
          {phoneConfigs && phoneConfigs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Mapped Phone Numbers
                </CardTitle>
                <CardDescription>
                  Incoming calls to these numbers will be routed to this agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {phoneConfigs.map((phone) => (
                    <Link
                      key={phone.id}
                      href={`/settings/phone/${phone.id}`}
                      className="inline-flex"
                    >
                      <Badge
                        variant="secondary"
                        className="text-sm py-1.5 px-3 hover:bg-secondary/80 cursor-pointer"
                      >
                        <Phone className="h-3.5 w-3.5 mr-2" />
                        {formatPhoneNumber(phone.phoneNumber)}
                        {phone.name && (
                          <span className="ml-2 text-muted-foreground">
                            ({phone.name})
                          </span>
                        )}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Information</CardTitle>
                <CardDescription>Basic information about this agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Agent ID</div>
                  <div className="text-sm font-mono mt-1">{agent.id}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Name</div>
                  <div className="text-sm mt-1">{agent.name}</div>
                </div>
                {agent.description && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Description
                      </div>
                      <div className="text-sm mt-1">{agent.description}</div>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Tenant ID</div>
                  <div className="text-sm font-mono mt-1">{agent.tenantId}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Configuration</CardTitle>
                <CardDescription>Current workflow version details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.activeVersion ? (
                  <>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Version</div>
                      <div className="text-sm mt-1 flex items-center gap-2">
                        <Badge variant="default">v{agent.activeVersion.version}</Badge>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Created By
                      </div>
                      <div className="text-sm mt-1">
                        {agent.activeVersion.createdBy || 'Unknown'}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Created At
                      </div>
                      <div className="text-sm mt-1">
                        {formatDateTime(agent.activeVersion.createdAt)}
                      </div>
                    </div>
                    {agent.activeVersion.notes && (
                      <>
                        <Separator />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Notes
                          </div>
                          <div className="text-sm mt-1">{agent.activeVersion.notes}</div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active version configured
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Summary</CardTitle>
              <CardDescription>Overview of the current workflow configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {agent.activeVersion ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Initial Node
                      </div>
                      <div className="text-sm mt-1 font-mono">
                        {agent.activeVersion.configJson.workflow.initial_node}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Total Nodes
                      </div>
                      <div className="text-sm mt-1">
                        {agent.activeVersion.configJson.workflow.nodes.length}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('workflow')}
                    className="mt-2"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Workflow
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No workflow configuration available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Global Settings Overview */}
          {agent.activeVersion && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* LLM Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>LLM Configuration</CardTitle>
                  <CardDescription>Language model settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Enabled</div>
                      <div className="font-medium">
                        {(agent.activeVersion.configJson.workflow as any)?.llm?.enabled !== false ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Model</div>
                      <div className="font-mono text-xs">
                        {(agent.activeVersion.configJson.workflow as any)?.llm?.model_name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Temperature</div>
                      <div className="font-medium">
                        {(agent.activeVersion.configJson.workflow as any)?.llm?.temperature ?? 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Max Tokens</div>
                      <div className="font-medium">
                        {(agent.activeVersion.configJson.workflow as any)?.llm?.max_tokens || 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TTS Settings - Database-backed */}
              <Card>
                <CardHeader>
                  <CardTitle>TTS Configuration</CardTitle>
                  <CardDescription>Voice configuration (database-backed)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Voice/TTS settings are managed via shared configurations in Settings → Voice Configurations.
                  </div>
                </CardContent>
              </Card>

              {/* STT Settings - Environment-based */}
              <Card>
                <CardHeader>
                  <CardTitle>STT Configuration</CardTitle>
                  <CardDescription>Speech-to-text settings (system-wide)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    STT settings are configured via environment variables (DEEPGRAM_MODEL, AUDIO_SAMPLE_RATE).
                  </div>
                </CardContent>
              </Card>

              {/* RAG Settings - Database-backed */}
              <Card>
                <CardHeader>
                  <CardTitle>RAG Configuration</CardTitle>
                  <CardDescription>Knowledge base retrieval (database-backed)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">RAG Enabled</div>
                      <div className="font-medium">
                        {(agent.activeVersion as any).ragEnabled ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Configuration</div>
                      <div className="font-medium">
                        {(agent.activeVersion as any).ragConfigId ? 'Linked' : 'Not Configured'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    RAG settings are managed via shared configurations in Settings → RAG Configurations.
                  </div>
                </CardContent>
              </Card>

              {/* Auto Hangup Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Auto Hangup</CardTitle>
                  <CardDescription>Call termination settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium">
                      {agent.activeVersion.configJson.auto_hangup?.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Workflow Editor Tab */}
        <TabsContent value="workflow" className="space-y-4">
          {agent.activeVersion ? (
            <WorkflowEditorLayout
              initialConfig={agent.activeVersion.configJson}
              onSave={handleWorkflowSave}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Editor</CardTitle>
                <CardDescription>No active workflow configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Active Configuration</p>
                  <p className="text-sm">
                    This agent doesn't have an active workflow version.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <VersionsTab
            agentId={agentId}
            activeVersionId={agent.activeVersion?.id}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {agent.activeVersion ? (
            <SettingsForm
              agentId={agentId}
              currentConfig={agent.activeVersion.configJson}
              globalPrompt={agent.activeVersion.globalPrompt}
              ragEnabled={agent.activeVersion.ragEnabled}
              ragConfigId={agent.activeVersion.ragConfigId}
              voiceConfigId={agent.activeVersion.voiceConfigId}
              onSave={handleSettingsSave}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Agent Settings</CardTitle>
                <CardDescription>
                  Configure global settings for this agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Active Configuration</p>
                  <p className="text-sm">
                    This agent doesn't have an active workflow version.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <DeleteAgentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        agent={agent}
      />
    </div>
  );
}
