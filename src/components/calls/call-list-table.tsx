'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ChevronLeft, ChevronRight, ExternalLink, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { useCalls } from '@/lib/hooks/use-calls';
import { formatDateTime, formatDurationShort, formatPhoneNumber, getStatusVariant } from '@/lib/utils/formatters';
import type { CallFilters } from '@/types';

interface CallListTableProps {
  filters: CallFilters;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function CallListTable({ filters, page, pageSize, onPageChange }: CallListTableProps) {
  const { data, isLoading, error } = useCalls({ ...filters, page, pageSize });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
          <CardTitle>All Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Error loading calls: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No calls found matching your filters.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data: calls, pagination } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Calls</CardTitle>
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} calls
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.callId}>
                  <TableCell className="font-mono text-xs">
                    {call.callId.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(call.startedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={call.direction === 'outbound' ? 'secondary' : 'outline'}
                      className="flex items-center gap-1 w-fit"
                    >
                      {call.direction === 'outbound' ? (
                        <PhoneOutgoing className="h-3 w-3" />
                      ) : (
                        <PhoneIncoming className="h-3 w-3" />
                      )}
                      {call.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDurationShort(call.durationSeconds)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatPhoneNumber(call.fromNumber)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatPhoneNumber(call.toNumber)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {call.agentName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(call.status)}>
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {call.totalMessages}
                  </TableCell>
                  <TableCell>
                    <Link href={`/calls/${call.callId}`}>
                      <Button variant="outline" size="sm">
                        View
                        <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
