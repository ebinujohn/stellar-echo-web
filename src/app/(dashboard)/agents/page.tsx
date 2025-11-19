import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage voice AI agent configurations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </div>

      {/* Agent List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards - will be populated from database */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Support Agent</CardTitle>
            <CardDescription>Active • Version 2.1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Handles customer inquiries and support tickets</p>
              <p className="mt-2">Calls: 542</p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Qualification</CardTitle>
            <CardDescription>Active • Version 1.5</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Qualifies leads and schedules demos</p>
              <p className="mt-2">Calls: 329</p>
              <p>Phone: +1 (555) 987-6543</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment Scheduler</CardTitle>
            <CardDescription>Active • Version 3.0</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Books and manages appointments</p>
              <p className="mt-2">Calls: 892</p>
              <p>Phone: +1 (555) 456-7890</p>
            </div>
          </CardContent>
        </Card>
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
