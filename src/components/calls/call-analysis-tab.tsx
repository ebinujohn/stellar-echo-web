'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Smile, Frown, Meh, FileText, Tag, CheckCircle, XCircle, SearchX, ClipboardList } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <SearchX className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">No analysis available</p>
        <p className="text-xs mt-1">Analysis data has not been generated for this call yet.</p>
      </div>
    );
  }

  const sentimentColor = getSentimentColor(analysis.sentiment);

  return (
    <div className="space-y-6">
      {/* Sentiment & Call Success - side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Call Success */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {analysis.callSuccessful ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : analysis.callSuccessful === false ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-gray-400" />
              )}
              Call Success
            </CardTitle>
            <CardDescription>Whether the call achieved its intended goal</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <div className="text-3xl font-bold">
                {analysis.callSuccessful === true
                  ? 'Successful'
                  : analysis.callSuccessful === false
                  ? 'Unsuccessful'
                  : 'Unknown'}
              </div>
              {analysis.successConfidence !== null && (
                <div className="text-sm text-muted-foreground mt-1">
                  Confidence: {(analysis.successConfidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Question Responses (Post-Call Analysis) */}
      {analysis.questionResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Question Responses
            </CardTitle>
            <CardDescription>Structured answers extracted from the call transcript</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.questionResponses.map((response, index) => (
                <div key={index} className="border-b last:border-b-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{response.questionName}</p>
                      <p className="text-sm mt-1">
                        {response.responseValue ?? (
                          <span className="text-muted-foreground italic">No answer extracted</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {response.questionType}
                      </Badge>
                      {response.responseConfidence !== null && (
                        <span className="text-xs text-muted-foreground">
                          {(response.responseConfidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
