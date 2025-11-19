"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { useCalls } from "@/lib/hooks/use-calls";
import {
  formatDateTime,
  formatDurationShort,
  formatPhoneNumber,
  getStatusVariant,
} from "@/lib/utils/formatters";

export function RecentCallsTable() {
  const { data, isLoading, error } = useCalls({ page: 1, pageSize: 5 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading recent calls: {error.message}</p>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No calls found. Start making calls to see them here!</p>
      </div>
    );
  }

  const calls = data.data;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call) => (
              <TableRow key={call.callId}>
                <TableCell className="font-medium">
                  {call.agentName || "Unknown"}
                </TableCell>
                <TableCell>
                  {call.fromNumber ? formatPhoneNumber(call.fromNumber) : "N/A"}
                </TableCell>
                <TableCell>
                  {call.toNumber ? formatPhoneNumber(call.toNumber) : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(call.status)}>
                    {call.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(call.startedAt)}
                </TableCell>
                <TableCell>
                  {call.durationSeconds
                    ? formatDurationShort(call.durationSeconds)
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Link href={`/calls/${call.callId}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center">
        <Link href="/calls">
          <Button variant="outline">View All Calls</Button>
        </Link>
      </div>
    </div>
  );
}
