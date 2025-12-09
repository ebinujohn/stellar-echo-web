'use client';

import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, User, Bot } from 'lucide-react';
import { useCallTranscript } from '@/lib/hooks/use-call-detail';
import { formatTime } from '@/lib/utils/formatters';

interface CallTranscriptTabProps {
  callId: string;
}

export function CallTranscriptTab({ callId }: CallTranscriptTabProps) {
  const { data: transcript, isLoading, error } = useCallTranscript(callId);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!transcript || transcript.length === 0) return;

    setIsExporting(true);
    try {
      // Generate text transcript
      const textContent = transcript
        .map(entry => {
          const time = entry.timestamp ? formatTime(entry.timestamp) : 'N/A';
          const speaker = entry.speaker.toUpperCase();
          const confidence = entry.confidence
            ? ` (${(entry.confidence * 100).toFixed(0)}%)`
            : '';
          return `[${time}] ${speaker}${confidence}: ${entry.text}`;
        })
        .join('\n\n');

      // Create and download file
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript-${callId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading transcript: {error.message}</p>
      </div>
    );
  }

  if (!transcript || transcript.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No transcript available for this call.</p>
      </div>
    );
  }

  // Detect if this is a single "System" entry (indicating unparsed transcript)
  const isSingleSystemEntry = transcript.length === 1 && transcript[0].speaker.toLowerCase() === 'system';

  return (
    <div className="space-y-4">
      {/* Header with export button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isSingleSystemEntry ? (
            <span>Full conversation transcript</span>
          ) : (
            <span>{transcript.length} transcript {transcript.length === 1 ? 'entry' : 'entries'}</span>
          )}
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Transcript
        </Button>
      </div>

      {/* Transcript entries */}
      <div className="space-y-4">
        {transcript.map((entry) => {
          const isAgent = entry.speaker.toLowerCase() === 'agent' ||
                         entry.speaker.toLowerCase() === 'bot' ||
                         entry.speaker.toLowerCase() === 'assistant';
          const isUser = entry.speaker.toLowerCase() === 'user' ||
                        entry.speaker.toLowerCase() === 'customer' ||
                        entry.speaker.toLowerCase().includes('caller');
          const isSystem = entry.speaker.toLowerCase() === 'system';

          const Icon = isAgent ? Bot : isUser ? User : User;
          const bgClass = isAgent ? 'bg-primary/5' : isUser ? 'bg-muted/50' : 'bg-secondary/30';

          return (
            <div key={entry.id} className={`flex gap-4 p-4 rounded-lg ${bgClass}`}>
              <div className="flex-shrink-0">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isAgent ? 'bg-primary text-primary-foreground' :
                  isUser ? 'bg-muted' :
                  'bg-secondary'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {entry.speaker}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {(entry.confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                    {entry.timestamp && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
                <p className={`text-sm leading-relaxed ${isSystem ? 'whitespace-pre-wrap' : ''}`}>
                  {entry.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">About Transcript</CardTitle>
          <CardDescription className="text-xs">
            This transcript is automatically generated from the call audio using speech-to-text technology.
            Confidence scores indicate the accuracy of each transcribed segment.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
