'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertCircle,
  Database,
  Zap,
  History,
  Copy,
  Check,
} from 'lucide-react';
import { useRAGQuery, type RAGQueryResponse, type RAGChunk } from '@/lib/hooks/use-rag-query';
import { toast } from 'sonner';

interface AgentVersion {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
}

interface RagQueryTabProps {
  agentId: string;
  versions: AgentVersion[];
}

interface QueryHistoryItem {
  id: string;
  query: string;
  version: number | 'active';
  searchMode: 'vector' | 'fts' | 'hybrid';
  topK: number;
  timestamp: Date;
  response: RAGQueryResponse;
}

export function RagQueryTab({ agentId, versions }: RagQueryTabProps) {
  // Form state
  const [query, setQuery] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string>('active');
  const [searchMode, setSearchMode] = useState<'vector' | 'fts' | 'hybrid'>('hybrid');
  const [topK, setTopK] = useState(5);

  // History state
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Expanded chunks state
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

  const ragQuery = useRAGQuery(agentId);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!query.trim()) {
        toast.error('Please enter a search query');
        return;
      }

      try {
        const result = await ragQuery.mutateAsync({
          query: query.trim(),
          version: selectedVersion !== 'active' ? parseInt(selectedVersion) : undefined,
          searchMode,
          topK,
        });

        // Add to history
        const historyItem: QueryHistoryItem = {
          id: crypto.randomUUID(),
          query: query.trim(),
          version: selectedVersion === 'active' ? 'active' : parseInt(selectedVersion),
          searchMode,
          topK,
          timestamp: new Date(),
          response: result.data,
        };

        setHistory((prev) => [historyItem, ...prev].slice(0, 20)); // Keep last 20 queries
        setSelectedHistoryId(historyItem.id);
        setExpandedChunks(new Set()); // Reset expanded chunks
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to execute RAG query');
      }
    },
    [query, selectedVersion, searchMode, topK, ragQuery]
  );

  const handleHistorySelect = (item: QueryHistoryItem) => {
    setSelectedHistoryId(item.id);
    setExpandedChunks(new Set());
  };

  const handleClearHistory = () => {
    setHistory([]);
    setSelectedHistoryId(null);
  };

  const toggleChunkExpanded = (chunkId: number) => {
    setExpandedChunks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  };

  // Get the currently selected result
  const selectedResult = selectedHistoryId
    ? history.find((h) => h.id === selectedHistoryId)?.response
    : ragQuery.data?.data;

  // Find active version for display
  const activeVersion = versions.find((v) => v.isActive);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Query Form & History - Left Column */}
      <div className="lg:col-span-1 space-y-4">
        {/* Query Form Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              RAG Query
            </CardTitle>
            <CardDescription>
              Search the knowledge base using semantic search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Query Input */}
              <div className="space-y-2">
                <Label htmlFor="query">Search Query</Label>
                <Input
                  id="query"
                  placeholder="Enter your search query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={ragQuery.isPending}
                />
              </div>

              {/* Version Select */}
              <div className="space-y-2">
                <Label htmlFor="version">Config Version</Label>
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger id="version">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      Active Version {activeVersion ? `(v${activeVersion.version})` : ''}
                    </SelectItem>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.version.toString()}>
                        Version {v.version} {v.isActive && '(active)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Mode Select */}
              <div className="space-y-2">
                <Label htmlFor="searchMode">Search Mode</Label>
                <Select
                  value={searchMode}
                  onValueChange={(v) => setSearchMode(v as typeof searchMode)}
                >
                  <SelectTrigger id="searchMode">
                    <SelectValue placeholder="Select search mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Hybrid (Recommended)</SelectItem>
                    <SelectItem value="vector">Vector Only</SelectItem>
                    <SelectItem value="fts">Full-Text Search</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Top K Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topK">Results (Top K)</Label>
                  <span className="text-sm text-muted-foreground">{topK}</span>
                </div>
                <Slider
                  id="topK"
                  value={[topK]}
                  onValueChange={([v]) => setTopK(v)}
                  min={1}
                  max={20}
                  step={1}
                  disabled={ragQuery.isPending}
                />
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={ragQuery.isPending}>
                {ragQuery.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Query History Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Query History
              </CardTitle>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Session history only - not permanently stored
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No queries yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleHistorySelect(item)}
                      className={`w-full text-left p-2 rounded-md border transition-colors ${
                        selectedHistoryId === item.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{item.query}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.response.metadata.total_chunks} results
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          v{item.version === 'active' ? item.response.metadata.agent_config_version : item.version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results - Right Column */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Search Results
              </CardTitle>
              {selectedResult && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {selectedResult.metadata.processing_time_ms.toFixed(1)}ms
                  </Badge>
                  <Badge variant="outline">
                    {selectedResult.metadata.total_chunks} chunks
                  </Badge>
                  <Badge variant="outline">
                    v{selectedResult.metadata.agent_config_version}
                    {selectedResult.metadata.is_active_version && ' (active)'}
                  </Badge>
                </div>
              )}
            </div>
            {selectedResult && (
              <CardDescription>
                Query: &quot;{selectedResult.query}&quot; | Mode: {selectedResult.metadata.search_mode} | Top K: {selectedResult.metadata.top_k}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {ragQuery.isPending ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : ragQuery.isError ? (
              <div className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                <p className="text-sm text-destructive">
                  {ragQuery.error instanceof Error ? ragQuery.error.message : 'Failed to execute query'}
                </p>
              </div>
            ) : !selectedResult ? (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Results Yet</p>
                <p className="text-sm">
                  Enter a search query and click Search to find relevant chunks from the knowledge base.
                </p>
              </div>
            ) : selectedResult.chunks.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Matching Chunks</p>
                <p className="text-sm">
                  No results found for your query. Try rephrasing or using different search terms.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {selectedResult.chunks.map((chunk, index) => (
                    <ChunkCard
                      key={chunk.chunk_id}
                      chunk={chunk}
                      rank={index + 1}
                      isExpanded={expandedChunks.has(chunk.chunk_id)}
                      onToggle={() => toggleChunkExpanded(chunk.chunk_id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ChunkCardProps {
  chunk: RAGChunk;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function ChunkCard({ chunk, rank, isExpanded, onToggle }: ChunkCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(chunk.content);
      setCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy content');
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg overflow-hidden">
        {/* Essential Info - Always Visible */}
        <div className="p-3 bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Badge variant="outline" className="font-mono">
                #{rank}
              </Badge>
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{chunk.filename}</span>
                {chunk.score !== null && (
                  <Badge variant="secondary" className="ml-auto">
                    Score: {chunk.score.toFixed(4)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {chunk.content}
              </p>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Trigger */}
        <CollapsibleTrigger asChild>
          <button className="w-full px-3 py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors border-t">
            {isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" />
                Show Details
              </>
            )}
          </button>
        </CollapsibleTrigger>

        {/* Expanded Details */}
        <CollapsibleContent>
          <div className="p-3 border-t bg-muted/10 space-y-3">
            {/* Full Content */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Full Content</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyContent}
                  className="h-7 px-2 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded border bg-background">
                <div className="p-3 text-sm whitespace-pre-wrap">
                  {chunk.content}
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetadataItem label="Document ID" value={chunk.document_id.toString()} />
              <MetadataItem label="Chunk ID" value={chunk.chunk_id.toString()} />
              <MetadataItem label="Chunk Index" value={chunk.chunk_index.toString()} />
              <MetadataItem
                label="Token Count"
                value={chunk.token_count?.toString() ?? 'N/A'}
              />
            </div>

            {/* S3 Key */}
            <div>
              <Label className="text-xs text-muted-foreground">S3 Key</Label>
              <code className="block mt-1 p-2 bg-background rounded border text-xs font-mono break-all">
                {chunk.s3_key}
              </code>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
