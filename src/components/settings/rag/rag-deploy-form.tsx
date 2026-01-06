'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  CloudDownload,
  Loader2,
  CheckCircle2,
  XCircle,
  FileDown,
  Database,
  Link2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRagDeploy, useRagDeploymentStatus } from '@/lib/hooks/use-rag-deployment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Simple progress bar component
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

type DeploymentStatus = 'pending' | 'downloading' | 'registering' | 'linking' | 'completed' | 'failed';

function getStatusIcon(status: DeploymentStatus) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'downloading':
      return <FileDown className="h-4 w-4 animate-pulse" />;
    case 'registering':
      return <Database className="h-4 w-4 animate-pulse" />;
    case 'linking':
      return <Link2 className="h-4 w-4 animate-pulse" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'failed':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin" />;
  }
}

function getStatusColor(status: DeploymentStatus) {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-destructive';
    case 'pending':
      return 'bg-muted';
    default:
      return 'bg-blue-500';
  }
}

function getStatusLabel(status: DeploymentStatus) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'downloading':
      return 'Downloading Files';
    case 'registering':
      return 'Registering Config';
    case 'linking':
      return 'Linking to Agent';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function RagDeployForm() {
  const router = useRouter();
  const deployMutation = useRagDeploy();

  // Form state
  const [s3Url, setS3Url] = useState('');
  const [ragName, setRagName] = useState('');
  const [description, setDescription] = useState('');

  // Deployment tracking
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const { data: deploymentStatus } = useRagDeploymentStatus(deploymentId);

  const isDeploying = deploymentId !== null && deploymentStatus?.status !== 'completed' && deploymentStatus?.status !== 'failed';
  const isCompleted = deploymentStatus?.status === 'completed';
  const isFailed = deploymentStatus?.status === 'failed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!s3Url.trim()) {
      toast.error('S3 URL is required');
      return;
    }

    if (!ragName.trim()) {
      toast.error('RAG name is required');
      return;
    }

    try {
      const result = await deployMutation.mutateAsync({
        s3_url: s3Url.trim(),
        rag_name: ragName.trim(),
        description: description.trim() || undefined,
      });

      setDeploymentId(result.data.deployment_id);
      toast.success('Deployment started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start deployment');
    }
  };

  const handleRetry = () => {
    setDeploymentId(null);
  };

  const handleViewConfig = () => {
    if (deploymentStatus?.rag_config_id) {
      router.push(`/settings/rag/${deploymentStatus.rag_config_id}`);
    }
  };

  // Calculate progress percentage
  const progressPercent = deploymentStatus
    ? deploymentStatus.files_total > 0
      ? (deploymentStatus.files_downloaded / deploymentStatus.files_total) * 100
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/rag">
            <Button type="button" variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Deploy RAG from S3</h1>
            <p className="text-muted-foreground">
              Deploy RAG files from an S3 bucket to the orchestrator
            </p>
          </div>
        </div>
      </div>

      {/* Deployment Form */}
      {!deploymentId && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>S3 Deployment</CardTitle>
              <CardDescription>
                Enter the S3 location containing your RAG files (FAISS index, mapping, SQLite DB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s3Url">S3 URL *</Label>
                <Input
                  id="s3Url"
                  placeholder="s3://bucket-name/path/to/rag-files"
                  value={s3Url}
                  onChange={(e) => setS3Url(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Expected structure: {'{'}prefix{'}'}/faiss/index.faiss, {'{'}prefix{'}'}/faiss/mapping.pkl, {'{'}prefix{'}'}/metadata/rag.db
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ragName">RAG Configuration Name *</Label>
                <Input
                  id="ragName"
                  placeholder="e.g., Product Knowledge Base"
                  value={ragName}
                  onChange={(e) => setRagName(e.target.value)}
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

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={deployMutation.isPending}>
                  {deployMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <CloudDownload className="mr-2 h-4 w-4" />
                      Deploy from S3
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Deployment Progress */}
      {deploymentId && deploymentStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Deployment Progress</CardTitle>
                <CardDescription>
                  Deployment ID: <code className="text-xs">{deploymentId}</code>
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={`${getStatusColor(deploymentStatus.status)} text-white`}
              >
                <span className="mr-1">{getStatusIcon(deploymentStatus.status)}</span>
                {getStatusLabel(deploymentStatus.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            {(isDeploying || isCompleted) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {deploymentStatus.files_downloaded} / {deploymentStatus.files_total} files
                  </span>
                  <span>{formatBytes(deploymentStatus.bytes_downloaded)}</span>
                </div>
                <ProgressBar value={isCompleted ? 100 : progressPercent} />
                {deploymentStatus.current_file && (
                  <p className="text-xs text-muted-foreground">
                    Downloading: {deploymentStatus.current_file}
                  </p>
                )}
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duration: {formatDuration(deploymentStatus.duration_seconds)}</span>
            </div>

            {/* Error Message */}
            {isFailed && deploymentStatus.error_message && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{deploymentStatus.error_message}</p>
              </div>
            )}

            {/* Success Info */}
            {isCompleted && (
              <div className="rounded-lg border border-green-500 bg-green-500/10 p-4 space-y-2">
                <p className="text-sm text-green-700 dark:text-green-400">
                  RAG configuration deployed successfully!
                </p>
                {deploymentStatus.rag_config_id && (
                  <p className="text-xs text-muted-foreground">
                    Config ID: <code>{deploymentStatus.rag_config_id}</code>
                    {deploymentStatus.rag_version && ` (v${deploymentStatus.rag_version})`}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              {isFailed && (
                <Button variant="outline" onClick={handleRetry}>
                  Try Again
                </Button>
              )}
              {isCompleted && deploymentStatus.rag_config_id && (
                <Button onClick={handleViewConfig}>
                  <Database className="mr-2 h-4 w-4" />
                  View Configuration
                </Button>
              )}
              {isCompleted && (
                <Link href="/settings/rag">
                  <Button variant="outline">
                    Back to RAG Configs
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
