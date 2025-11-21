'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Database, MoreHorizontal, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useRagConfigs, useDeleteRagConfig } from '@/lib/hooks/use-rag-configs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function RagConfigList() {
  const router = useRouter();
  const { data: configs, isLoading, error } = useRagConfigs();
  const deleteConfig = useDeleteRagConfig();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteConfig.mutateAsync(deleteId);
      toast.success('RAG configuration deleted');
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const getSearchModeLabel = (mode: string) => {
    switch (mode) {
      case 'vector':
        return 'Vector';
      case 'fts':
        return 'FTS';
      case 'hybrid':
        return 'Hybrid';
      default:
        return mode;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RAG Configurations</h1>
            <p className="text-muted-foreground">
              Manage knowledge base and retrieval settings
            </p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load RAG configurations. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RAG Configurations</h1>
            <p className="text-muted-foreground">
              Manage knowledge base and retrieval settings
            </p>
          </div>
        </div>
        <Link href="/settings/rag/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Configuration
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : configs && configs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => (
            <Card
              key={config.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => router.push(`/settings/rag/${config.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    {config.description && (
                      <CardDescription className="mt-1 line-clamp-1">
                        {config.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/settings/rag/${config.id}`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(config.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {config.activeVersion && (
                    <>
                      <Badge variant="secondary">
                        {getSearchModeLabel(config.activeVersion.searchMode)}
                      </Badge>
                      <Badge variant="outline">Top K: {config.activeVersion.topK}</Badge>
                      {config.activeVersion.searchMode === 'hybrid' && (
                        <Badge variant="outline">
                          {parseFloat(config.activeVersion.vectorWeight) * 100}% Vector
                        </Badge>
                      )}
                    </>
                  )}
                  <Badge variant="outline">{config.versionCount} version(s)</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No RAG configurations</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first RAG configuration to enable knowledge retrieval for agents.
            </p>
            <Link href="/settings/rag/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Configuration
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RAG Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this RAG configuration? This action cannot be
              undone. Agents using this configuration will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
