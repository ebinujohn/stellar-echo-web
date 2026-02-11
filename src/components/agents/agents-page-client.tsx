"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Clock, Edit, Trash2, ArrowRight, Bot, Search, Upload } from "lucide-react";
import { useAgents } from "@/lib/hooks/use-agents";
import { formatDateTime } from "@/lib/utils/formatters";
import { CreateAgentDialog } from "./dialogs/create-agent-dialog";
import { DeleteAgentDialog } from "./dialogs/delete-agent-dialog";
import { ImportAgentDialog } from "./dialogs/import-agent-dialog";

export function AgentsPageClient() {
  const router = useRouter();
  const { data: agents, isLoading, error } = useAgents();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<{
    id: string;
    name: string;
    callCount?: number;
    phoneMappingCount?: number;
  } | null>(null);

  // Filter agents by search query
  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    if (!searchQuery.trim()) return agents;
    const query = searchQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)
    );
  }, [agents, searchQuery]);

  const handleDeleteClick = (agent: { id: string; name: string; callCount?: number; phoneMappingCount?: number }, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAgent(agent);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/agents/${agentId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage voice AI agent configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {agents && agents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Agent List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : error ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Error loading agents: {error.message}
              </p>
            </CardContent>
          </Card>
        ) : !agents || agents.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Bot}
              title="No agents yet"
              description="Create your first voice AI agent to start handling calls. Agents can be customized with workflows, knowledge bases, and voice settings."
              action={{
                label: 'Create First Agent',
                icon: Plus,
                onClick: () => setCreateDialogOpen(true),
              }}
              tips={[
                { text: 'Start with a simple workflow and expand from there' },
                { text: 'Use global intents to handle common phrases across all nodes' },
                { text: 'Test your agent with the built-in chat feature before going live' },
              ]}
            />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No agents match &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <Card
              key={agent.id}
              className="border-l-4 border-l-primary/70 hover:border-l-primary hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push(`/agents/${agent.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {agent.name}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="success" className="text-xs">
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        Active
                      </Badge>
                      {agent.activeVersion && (
                        <Badge variant="outline" className="text-xs">
                          v{agent.activeVersion}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleEditClick(agent.id, e)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteClick(agent, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {agent.description && (
                    <p className="text-muted-foreground line-clamp-2">
                      {agent.description}
                    </p>
                  )}
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Calls</span>
                      <span className="font-medium">{agent.callCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Updated {formatDateTime(agent.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <CreateAgentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <ImportAgentDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <DeleteAgentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        agent={selectedAgent}
      />
    </div>
  );
}
