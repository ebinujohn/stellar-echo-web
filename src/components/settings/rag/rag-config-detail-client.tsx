'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Save,
  Loader2,
  AlertTriangle,
  History,
  Settings2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useRagConfig,
  useRagConfigVersions,
  useUpdateRagConfig,
  useCreateRagConfigVersion,
  useActivateRagConfigVersion,
} from '@/lib/hooks/use-rag-configs';
import { searchModes } from '@/lib/validations/rag-configs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/utils/formatters';

interface RagConfigDetailClientProps {
  ragConfigId: string;
}

export function RagConfigDetailClient({ ragConfigId }: RagConfigDetailClientProps) {
  const router = useRouter();
  const { data: config, isLoading, error } = useRagConfig(ragConfigId);
  const { data: versions } = useRagConfigVersions(ragConfigId);
  const updateConfig = useUpdateRagConfig();
  const createVersion = useCreateRagConfigVersion();
  const activateVersion = useActivateRagConfigVersion();

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

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
  const [notes, setNotes] = useState('');

  // Initialize form with config data
  if (config && !isInitialized) {
    setName(config.name);
    setDescription(config.description || '');

    if (config.activeVersion) {
      const v = config.activeVersion;
      setSearchMode(v.searchMode as 'vector' | 'fts' | 'hybrid');
      setTopK(v.topK);
      setRelevanceFilter(v.relevanceFilter);
      setRrfK(v.rrfK);
      setVectorWeight(v.vectorWeight);
      setFtsWeight(v.ftsWeight);
      setHnswEfSearch(v.hnswEfSearch);
      setBedrockModel(v.bedrockModel || 'amazon.titan-embed-text-v2:0');
      setBedrockDimensions(v.bedrockDimensions || 1024);
      setFaissIndexPath(v.faissIndexPath || 'data/faiss/index.faiss');
      setFaissMappingPath(v.faissMappingPath || 'data/faiss/mapping.pkl');
      setSqliteDbPath(v.sqliteDbPath || 'data/metadata/healthcare_rag.db');
    }
    setIsInitialized(true);
  }

  // Check if weights sum to 1
  const weightsSum = parseFloat(vectorWeight) + parseFloat(ftsWeight);
  const weightsValid = Math.abs(weightsSum - 1.0) < 0.01;

  const handleSaveMetadata = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);

    try {
      await updateConfig.mutateAsync({
        id: ragConfigId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Configuration updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVersion = async () => {
    if (searchMode === 'hybrid' && !weightsValid) {
      toast.error('Vector and FTS weights must sum to 1.0');
      return;
    }

    setIsSaving(true);

    try {
      const result = await createVersion.mutateAsync({
        ragConfigId,
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
        notes: notes.trim() || undefined,
      });

      // Auto-activate the new version
      await activateVersion.mutateAsync({
        ragConfigId,
        versionId: result.data.id,
      });

      toast.success('New version created and activated');
      setNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save version');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateVersion = async (versionId: string) => {
    try {
      await activateVersion.mutateAsync({ ragConfigId, versionId });
      toast.success('Version activated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate version');
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings/rag">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">RAG Configuration</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load RAG configuration.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/rag">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config.name}</h1>
            <p className="text-muted-foreground">
              Version {config.activeVersion?.version || 1} active
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings2 className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="versions">
            <History className="mr-2 h-4 w-4" />
            Versions ({config.versionCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveMetadata} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Info
              </Button>
            </CardContent>
          </Card>

          {/* Search Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Search Settings</CardTitle>
              <CardDescription>Configure knowledge retrieval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="searchMode">Search Mode</Label>
                  <Select
                    value={searchMode}
                    onValueChange={(value) =>
                      setSearchMode(value as 'vector' | 'fts' | 'hybrid')
                    }
                  >
                    <SelectTrigger id="searchMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {searchModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
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

          {/* Hybrid Settings */}
          {searchMode === 'hybrid' && (
            <Card>
              <CardHeader>
                <CardTitle>Hybrid Search Weights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!weightsValid && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Weights must sum to 1.0 (currently: {weightsSum.toFixed(2)})
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Vector Weight</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={vectorWeight}
                      onChange={(e) => setVectorWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>FTS Weight</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={ftsWeight}
                      onChange={(e) => setFtsWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RRF K</Label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={rrfK}
                      onChange={(e) => setRrfK(parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Advanced Settings</CardTitle>
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
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bedrock Model</Label>
                    <Input
                      value={bedrockModel}
                      onChange={(e) => setBedrockModel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Embedding Dimensions</Label>
                    <Input
                      type="number"
                      value={bedrockDimensions}
                      onChange={(e) => setBedrockDimensions(parseInt(e.target.value) || 1024)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>FAISS Index Path</Label>
                    <Input
                      value={faissIndexPath}
                      onChange={(e) => setFaissIndexPath(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>FAISS Mapping Path</Label>
                    <Input
                      value={faissMappingPath}
                      onChange={(e) => setFaissMappingPath(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SQLite DB Path</Label>
                    <Input
                      value={sqliteDbPath}
                      onChange={(e) => setSqliteDbPath(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>HNSW EF Search</Label>
                    <Input
                      type="number"
                      value={hnswEfSearch}
                      onChange={(e) => setHnswEfSearch(parseInt(e.target.value) || 64)}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Save Version */}
          <Card>
            <CardHeader>
              <CardTitle>Save as New Version</CardTitle>
              <CardDescription>
                Create a new version with the current settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Version Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Increased top_k for better coverage"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveVersion} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save & Activate New Version
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          {versions && versions.length > 0 ? (
            versions.map((version) => (
              <Card key={version.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Version {version.version}</CardTitle>
                    {version.isActive && (
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {!version.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivateVersion(version.id)}
                    >
                      Activate
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Search Mode:</span>{' '}
                      {version.searchMode}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Top K:</span> {version.topK}
                    </div>
                    {version.searchMode === 'hybrid' && (
                      <div>
                        <span className="text-muted-foreground">Weights:</span>{' '}
                        {parseFloat(version.vectorWeight) * 100}% Vector /{' '}
                        {parseFloat(version.ftsWeight) * 100}% FTS
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Created:</span>{' '}
                      {formatDateTime(version.createdAt)}
                    </div>
                  </div>
                  {version.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{version.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No versions found
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
