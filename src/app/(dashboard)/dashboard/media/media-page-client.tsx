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
import { EmptyState } from '@/components/dashboard/empty-state';
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
        <EmptyState
          icon={ImageIcon}
          title="No media yet"
          description="Upload photos of your work to build your portfolio."
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Media
            </Button>
          }
        />
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

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              This will permanently remove this file from your portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
