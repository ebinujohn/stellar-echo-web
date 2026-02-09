'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';
import { useAgents } from '@/lib/hooks/use-agents';
import type { CallFilters } from '@/types';

interface CallFiltersProps {
  onFiltersChange: (filters: CallFilters) => void;
  currentFilters: CallFilters;
}

export function CallFilters({ onFiltersChange, currentFilters }: CallFiltersProps) {
  const { data: agents } = useAgents();
  const [localFilters, setLocalFilters] = useState<CallFilters>(currentFilters);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: CallFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleRemoveFilter = (key: keyof CallFilters) => {
    const newFilters = { ...currentFilters };
    delete newFilters[key];
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Object.values(currentFilters).some(v => v !== undefined && v !== '');

  // Build active filter badges
  const activeFilterBadges: { key: keyof CallFilters; label: string }[] = [];
  if (currentFilters.status) activeFilterBadges.push({ key: 'status', label: `Status: ${currentFilters.status}` });
  if (currentFilters.direction) activeFilterBadges.push({ key: 'direction', label: `Direction: ${currentFilters.direction}` });
  if (currentFilters.agentId) {
    const agentName = agents?.find(a => a.id === currentFilters.agentId)?.name || 'Unknown';
    activeFilterBadges.push({ key: 'agentId', label: `Agent: ${agentName}` });
  }
  if (currentFilters.search) activeFilterBadges.push({ key: 'search', label: `Search: ${currentFilters.search}` });

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Call ID, phone..."
                  value={localFilters.search || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={localFilters.status || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value || undefined })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All statuses</option>
                <option value="started">Started</option>
                <option value="ongoing">Ongoing</option>
                <option value="ended">Ended</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Direction */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Direction</label>
              <select
                value={localFilters.direction || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, direction: (e.target.value || undefined) as 'inbound' | 'outbound' | undefined })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All directions</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>

            {/* Agent */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <select
                value={localFilters.agentId || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, agentId: e.target.value || undefined })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All agents</option>
                {agents?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                Apply
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  size="icon"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filter Badges */}
      {activeFilterBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {activeFilterBadges.map((filter) => (
            <Badge
              key={filter.key}
              variant="info"
              className="cursor-pointer gap-1"
              onClick={() => handleRemoveFilter(filter.key)}
            >
              {filter.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
