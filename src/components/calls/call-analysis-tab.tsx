'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Smile, Frown, Meh, FileText, Tag, CheckSquare } from 'lucide-react';
import { useCallAnalysis } from '@/lib/hooks/use-call-detail';

interface CallAnalysisTabProps {
  callId: string;
}

// Icon component mapped by sentiment to avoid creating during render
const SentimentIconDisplay = ({ sentiment, className }: { sentiment: string | null; className?: string }) => {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return <Smile className={className} />;
    case 'negative':
      return <Frown className={className} />;
    case 'neutral':
      return <Meh className={className} />;
    default:
      return <Meh className={className} />;
  }
};

function getSentimentColor(sentiment: string | null): string {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return 'text-green-500';
    case 'negative':
      return 'text-red-500';
    case 'neutral':
      return 'text-yellow-500';
    default:
      return 'text-gray-500';
  }
}

export function CallAnalysisTab({ callId }: CallAnalysisTabProps) {
  const { data: analysis, isLoading, error } = useCallAnalysis(callId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading analysis: {error.message}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No analysis data available for this call.</p>
      </div>
    );
  }

  const sentimentColor = getSentimentColor(analysis.sentiment);

  return (
    <div className="space-y-6">
      {/* Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SentimentIconDisplay sentiment={analysis.sentiment} className={`h-5 w-5 ${sentimentColor}`} />
            Sentiment Analysis
          </CardTitle>
          <CardDescription>Overall sentiment detected in the conversation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-3xl font-bold capitalize">
                {analysis.sentiment || 'Unknown'}
              </div>
              {analysis.sentimentScore !== null && (
                <div className="text-sm text-muted-foreground mt-1">
                  Score: {(analysis.sentimentScore * 100).toFixed(0)}%
                </div>
              )}
            </div>
            {analysis.sentimentScore !== null && (
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`rounded-full h-3 transition-all ${
                      analysis.sentiment?.toLowerCase() === 'positive'
                        ? 'bg-green-500'
                        : analysis.sentiment?.toLowerCase() === 'negative'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${analysis.sentimentScore * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Call Summary
          </CardTitle>
          <CardDescription>AI-generated summary of the conversation</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.summary ? (
            <p className="text-sm leading-relaxed">{analysis.summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No summary available</p>
          )}
        </CardContent>
      </Card>

      {/* Key Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Key Topics
          </CardTitle>
          <CardDescription>Main topics discussed during the call</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.keyTopics && analysis.keyTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.keyTopics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No topics identified</p>
          )}
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Keywords
          </CardTitle>
          <CardDescription>Important keywords extracted from the conversation</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.keywords && analysis.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline">
                  {keyword}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No keywords extracted</p>
          )}
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Action Items
          </CardTitle>
          <CardDescription>Follow-up actions identified from the call</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.actionItems && analysis.actionItems.length > 0 ? (
            <ul className="space-y-2">
              {analysis.actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No action items identified</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
