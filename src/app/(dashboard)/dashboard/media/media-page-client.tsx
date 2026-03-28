'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { mediaQueryOptions } from '@/lib/query-options';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { MediaUploader } from '@/components/dashboard/media-uploader';
import {
  deleteMediaAction,
  toggleVisibilityAction,
} from '@/lib/actions/media-actions';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  size: string | null;
  style: string | null;
  tags: string[];
  isPublic: boolean;
  isApproved: boolean;
  artist: { name: string };
  customer: { firstName: string; lastName: string } | null;
  createdAt: string | Date;
}

export function MediaPageClient() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);

  const { data: media = [] } = useQuery(mediaQueryOptions);

  const visibilityMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      toggleVisibilityAction(id, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMediaAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setDeleteConfirm(null);
    },
  });

  function handleToggleVisibility(id: string, current: boolean) {
    toast.promise(visibilityMutation.mutateAsync({ id, isPublic: !current }), {
      loading: current ? 'Setting to private...' : 'Setting to public...',
      success: current ? 'Set to private' : 'Set to public',
      error: "Changes couldn't be saved. Please try again.",
    });
  }

  function handleDelete(id: string) {
    toast.promise(deleteMutation.mutateAsync(id), {
      loading: 'Deleting media...',
      success: 'Media deleted',
      error: "Changes couldn't be saved. Please try again.",
    });
  }

  if (!media || media.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No media uploaded</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload photos and videos of your work to build your portfolio.
          </p>
          <Button className="mt-4" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Media
          </Button>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
              <DialogDescription>
                Add photos and videos to your portfolio.
              </DialogDescription>
            </DialogHeader>
            <MediaUploader
              onSuccess={() => {
                setUploadOpen(false);
                queryClient.invalidateQueries({ queryKey: ['media'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {media.length} item{media.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Media
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item: MediaItem) => (
          <div
            key={item.id}
            className="group relative rounded-lg border bg-card overflow-hidden"
          >
            <div className="aspect-square relative bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnailUrl || item.fileUrl}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <div className="flex flex-wrap gap-1">
                {item.style && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                    {item.style}
                  </span>
                )}
                {item.size && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                    {item.size}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={item.isPublic}
                    onCheckedChange={() =>
                      handleToggleVisibility(item.id, item.isPublic)
                    }
                    size="sm"
                  />
                  {item.isPublic ? 'Public' : 'Private'}
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>
              Add photos and videos to your portfolio.
            </DialogDescription>
          </DialogHeader>
          <MediaUploader
            onSuccess={() => {
              setUploadOpen(false);
              queryClient.invalidateQueries({ queryKey: ['media'] });
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this media file. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
