"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Activity, Clock } from "lucide-react";
import { useAgents } from "@/lib/hooks/use-agents";
import { formatDateTime } from "@/lib/utils/formatters";

export function AgentsPageClient() {
  const { data: agents, isLoading, error } = useAgents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage voice AI agent configurations
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </div>

      {/* Agent List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No agents found. Create your first agent to get started.
                </p>
                <Button disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Activity className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                        {agent.activeVersion && (
                          <span className="text-xs">
                            v{agent.activeVersion}
                          </span>
                        )}
                      </div>
                    </CardDescription>
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
          <CardDescription>
            Phase 2 feature - Visual workflow editor for agent configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            The visual workflow editor with node-based configuration will be implemented in Phase 2.
            This will allow you to:
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Create conversation flows with drag-and-drop nodes</li>
              <li>Configure LLM, TTS, and STT settings</li>
              <li>Manage version control and rollbacks</li>
              <li>Test workflows with simulation mode</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
