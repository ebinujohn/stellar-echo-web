'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Clock, MessageSquare, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useCallDetail } from '@/lib/hooks/use-call-detail';
import {
  formatDateTime,
  formatDuration,
  formatPhoneNumber,
  getStatusVariant,
} from '@/lib/utils/formatters';
import { CallTimeline } from './call-timeline';
import { CallMetricsTab } from './call-metrics-tab';
import { CallAnalysisTab } from './call-analysis-tab';
import { CallTranscriptTab } from './call-transcript-tab';

interface CallDetailClientProps {
  callId: string;
}

export function CallDetailClient({ callId }: CallDetailClientProps) {
  const { data: call, isLoading, error } = useCallDetail(callId);
  const [activeTab, setActiveTab] = useState('timeline');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadRecording = async () => {
    if (!call?.recordingUrl) {
      toast.error('No recording available');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/calls/${callId}/recording/download`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate download URL');
      }

      window.open(result.data.presignedUrl, '_blank');
      toast.success('Recording download started');
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download recording');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="space-y-6">
        <Link href="/calls">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calls
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <p>Call not found or you don&apos;t have access to view it.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/calls">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Call Details</h1>
            <p className="text-sm text-muted-foreground font-mono">{call.callId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {call.recordingUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadRecording}
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? 'Generating...' : 'Download Recording'}
            </Button>
          )}
          <Badge variant={getStatusVariant(call.status)} className="text-sm px-3 py-1">
            {call.status}
          </Badge>
        </div>
      </div>

      {/* Call Info Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Number</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatPhoneNumber(call.fromNumber)}</div>
            <p className="text-xs text-muted-foreground mt-1">Caller</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Number</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatPhoneNumber(call.toNumber)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {call.agentName || 'Unknown Agent'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatDuration(call.durationSeconds)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {call.startedAt ? formatDateTime(call.startedAt) : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {call.totalMessages !== null ? call.totalMessages : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total messages exchanged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Call Details</CardTitle>
          <CardDescription>
            View timeline, metrics, analysis, and full transcript
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <CallTimeline callId={callId} />
            </TabsContent>

            <TabsContent value="metrics" className="mt-6">
              <CallMetricsTab callId={callId} />
            </TabsContent>

            <TabsContent value="analysis" className="mt-6">
              <CallAnalysisTab callId={callId} />
            </TabsContent>

            <TabsContent value="transcript" className="mt-6">
              <CallTranscriptTab callId={callId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
