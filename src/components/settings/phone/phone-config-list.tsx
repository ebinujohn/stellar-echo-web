'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Phone, MoreHorizontal, Pencil, Trash2, ChevronLeft, User } from 'lucide-react';
import { toast } from 'sonner';
import { usePhoneConfigs, useDeletePhoneConfig } from '@/lib/hooks/use-phone-configs';
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

function formatPhoneNumber(phone: string): string {
  // Simple E.164 to display format
  if (phone.startsWith('+1') && phone.length === 12) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }
  return phone;
}

export function PhoneConfigList() {
  const router = useRouter();
  const { data: configs, isLoading, error } = usePhoneConfigs();
  const deleteConfig = useDeletePhoneConfig();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteConfig.mutateAsync(deleteId);
      toast.success('Phone number deleted');
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete phone number');
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
            <h1 className="text-2xl font-bold tracking-tight">Phone Numbers</h1>
            <p className="text-muted-foreground">Manage phone number pool and agent mappings</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load phone numbers. Please try again later.
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
            <h1 className="text-2xl font-bold tracking-tight">Phone Numbers</h1>
            <p className="text-muted-foreground">Manage phone number pool and agent mappings</p>
          </div>
        </div>
        <Link href="/settings/phone/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Phone Number
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
              onClick={() => router.push(`/settings/phone/${config.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-mono">
                      {formatPhoneNumber(config.phoneNumber)}
                    </CardTitle>
                    {config.name && (
                      <CardDescription className="mt-1 line-clamp-1">
                        {config.name}
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
                        router.push(`/settings/phone/${config.id}`);
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
                  {config.mapping ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {config.mapping.agentName || 'Agent'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Unmapped
                    </Badge>
                  )}
                </div>
                {config.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {config.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No phone numbers</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add phone numbers to your pool and map them to agents for call routing.
            </p>
            <Link href="/settings/phone/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Phone Number
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phone Number</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this phone number? This will also remove any
              agent mapping. This action cannot be undone.
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
