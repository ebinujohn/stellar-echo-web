'use client';

import { useState } from 'react';
import { CallStatsCards } from './call-stats-cards';
import { CallFilters } from './call-filters';
import { CallListTable } from './call-list-table';
import type { CallFilters as CallFiltersType } from '@/types';

export function CallsPageClient() {
  const [filters, setFilters] = useState<CallFiltersType>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const handleFiltersChange = (newFilters: CallFiltersType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
          <p className="text-muted-foreground">
            View and analyze all voice AI agent calls
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <CallStatsCards />

      {/* Filters */}
      <CallFilters
        onFiltersChange={handleFiltersChange}
        currentFilters={filters}
      />

      {/* Call List Table */}
      <CallListTable
        filters={filters}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
