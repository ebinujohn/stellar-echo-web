'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateRagConfig } from '@/lib/hooks/use-rag-configs';
import { searchModes } from '@/lib/validations/rag-configs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export function RagConfigForm() {
  const router = useRouter();
  const createConfig = useCreateRagConfig();

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Search Settings
  const [searchMode, setSearchMode] = useState<'vector' | 'fts' | 'hybrid'>('hybrid');
  const [topK, setTopK] = useState(5);
  const [relevanceFilter, setRelevanceFilter] = useState(true);

  // Hybrid Settings
  const [rrfK, setRrfK] = useState(60);
  const [vectorWeight, setVectorWeight] = useState('0.6');
  const [ftsWeight, setFtsWeight] = useState('0.4');

  // Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hnswEfSearch, setHnswEfSearch] = useState(64);
  const [bedrockModel, setBedrockModel] = useState('amazon.titan-embed-text-v2:0');
  const [bedrockDimensions, setBedrockDimensions] = useState(1024);
  const [faissIndexPath, setFaissIndexPath] = useState('data/faiss/index.faiss');
  const [faissMappingPath, setFaissMappingPath] = useState('data/faiss/mapping.pkl');
  const [sqliteDbPath, setSqliteDbPath] = useState('data/metadata/healthcare_rag.db');

  const [isSaving, setIsSaving] = useState(false);

  // Check if weights sum to 1
  const weightsSum = parseFloat(vectorWeight) + parseFloat(ftsWeight);
  const weightsValid = Math.abs(weightsSum - 1.0) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (searchMode === 'hybrid' && !weightsValid) {
      toast.error('Vector and FTS weights must sum to 1.0');
      return;
    }

    setIsSaving(true);

    try {
      await createConfig.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        searchMode,
        topK,
        relevanceFilter,
        rrfK,
        vectorWeight,
        ftsWeight,
        hnswEfSearch,
        bedrockModel,
        bedrockDimensions,
        faissIndexPath,
        faissMappingPath,
        sqliteDbPath,
      });

      toast.success('RAG configuration created');
      router.push('/settings/rag');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/rag">
            <Button type="button" variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New RAG Configuration</h1>
            <p className="text-muted-foreground">
              Create a new knowledge retrieval configuration
            </p>
          </div>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Configuration
            </>
          )}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name and description for this RAG configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Medical Knowledge Base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this RAG configuration is used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Search Settings</CardTitle>
          <CardDescription>Configure how knowledge is retrieved</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="searchMode">Search Mode</Label>
              <Select
                value={searchMode}
                onValueChange={(value) => setSearchMode(value as 'vector' | 'fts' | 'hybrid')}
              >
                <SelectTrigger id="searchMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {searchModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div className="flex flex-col">
                        <span>{mode.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {mode.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topK">Top K Results</Label>
              <Input
                id="topK"
                type="number"
                min={1}
                max={50}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Number of chunks to retrieve (1-50)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="relevanceFilter">Relevance Filter</Label>
              <p className="text-sm text-muted-foreground">
                Only query for questions and information requests
              </p>
            </div>
            <Switch
              id="relevanceFilter"
              checked={relevanceFilter}
              onCheckedChange={setRelevanceFilter}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hybrid Search Settings */}
      {searchMode === 'hybrid' && (
        <Card>
          <CardHeader>
            <CardTitle>Hybrid Search Weights</CardTitle>
            <CardDescription>
              Configure how vector and keyword search results are combined
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!weightsValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Vector and FTS weights must sum to 1.0 (currently: {weightsSum.toFixed(2)})
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="vectorWeight">Vector Weight</Label>
                <Input
                  id="vectorWeight"
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={vectorWeight}
                  onChange={(e) => setVectorWeight(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Semantic search weight (0-1)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ftsWeight">FTS Weight</Label>
                <Input
                  id="ftsWeight"
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={ftsWeight}
                  onChange={(e) => setFtsWeight(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Keyword search weight (0-1)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rrfK">RRF K Constant</Label>
                <Input
                  id="rrfK"
                  type="number"
                  min={1}
                  max={200}
                  value={rrfK}
                  onChange={(e) => setRrfK(parseInt(e.target.value) || 60)}
                />
                <p className="text-xs text-muted-foreground">Fusion constant (1-200)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Infrastructure and embedding configuration</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Embedding Configuration</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bedrockModel">Bedrock Model</Label>
                  <Input
                    id="bedrockModel"
                    value={bedrockModel}
                    onChange={(e) => setBedrockModel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrockDimensions">Embedding Dimensions</Label>
                  <Input
                    id="bedrockDimensions"
                    type="number"
                    value={bedrockDimensions}
                    onChange={(e) => setBedrockDimensions(parseInt(e.target.value) || 1024)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">File Paths</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="faissIndexPath">FAISS Index Path</Label>
                  <Input
                    id="faissIndexPath"
                    value={faissIndexPath}
                    onChange={(e) => setFaissIndexPath(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faissMappingPath">FAISS Mapping Path</Label>
                  <Input
                    id="faissMappingPath"
                    value={faissMappingPath}
                    onChange={(e) => setFaissMappingPath(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sqliteDbPath">SQLite FTS5 Database Path</Label>
                  <Input
                    id="sqliteDbPath"
                    value={sqliteDbPath}
                    onChange={(e) => setSqliteDbPath(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hnswEfSearch">HNSW EF Search</Label>
                  <Input
                    id="hnswEfSearch"
                    type="number"
                    value={hnswEfSearch}
                    onChange={(e) => setHnswEfSearch(parseInt(e.target.value) || 64)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </form>
  );
}
