'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import {
  deleteMediaAction,
  toggleMediaVisibilityAction,
  toggleMediaApprovalAction,
  bulkAssignTagsAction,
  bulkUploadMediaAction,
} from '@/lib/actions/media-actions';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  Tags,
  CheckCircle2,
  Clock,
  Search,
  FileImage,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/dashboard/empty-state';
import type { MediaApprovalStatus } from '@/lib/dal/media';

const MEDIA_TAGS = ['portfolio', 'flash', 'reference', 'client'] as const;
type MediaTag = typeof MEDIA_TAGS[number];

interface MediaItem {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  tags: string[] | null;
  isPublic: boolean;
  isApproved: boolean;
  createdAt: string | Date;
}

interface PaginatedMedia {
  data: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'failed';

interface FileUploadItem {
  file: File;
  status: FileUploadStatus;
  url?: string;
  error?: string;
}

export function MediaPageClient() {
  const [activeTag, setActiveTag] = useState<MediaTag | undefined>(undefined);
  const [approvalStatus, setApprovalStatus] = useState<MediaApprovalStatus>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkTagSelection, setBulkTagSelection] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);

  const queryKey = ['media', {
    tag: activeTag,
    approvalStatus: approvalStatus === 'all' ? undefined : approvalStatus,
    page: 1,
    search: debouncedSearch || undefined,
  }];

  const { data: mediaResult } = useQuery<PaginatedMedia>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTag) params.set('tag', activeTag);
      if (approvalStatus !== 'all') params.set('approvalStatus', approvalStatus);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/admin/media?${params.toString()}`);
      return res.json();
    },
  });

  const media = mediaResult?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMediaAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setDeleteConfirm(null);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      toggleMediaApprovalAction(id, isApproved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });

  function handleToggleVisibility(id: string, currentValue: boolean) {
    const promise = toggleMediaVisibilityAction(id, !currentValue);
    toast.promise(promise, {
      loading: 'Updating visibility...',
      success: 'Media visibility updated',
      error: 'Failed to update visibility',
    });
    promise.then(() => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    }).catch(() => {});
  }

  function handleToggleApproval(id: string, currentValue: boolean) {
    toast.promise(approvalMutation.mutateAsync({ id, isApproved: !currentValue }), {
      loading: currentValue ? 'Removing approval...' : 'Approving...',
      success: currentValue ? 'Approval removed' : 'Media approved for gallery',
      error: 'Failed to update approval status',
    });
  }

  function handleDelete(id: string) {
    toast.promise(deleteMutation.mutateAsync(id), {
      loading: 'Deleting media...',
      success: 'Media deleted',
      error: "Changes couldn't be saved. Please try again.",
    });
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === media.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(media.map((m) => m.id)));
    }
  }

  async function handleBulkAssignTags() {
    const ids = Array.from(selectedIds);
    const tags = Array.from(bulkTagSelection);
    if (ids.length === 0 || tags.length === 0) return;

    toast.promise(bulkAssignTagsAction(ids, tags), {
      loading: `Updating tags for ${ids.length} items...`,
      success: `Tags updated for ${ids.length} items`,
      error: 'Failed to update tags',
    });
    setBulkTagOpen(false);
    setSelectedIds(new Set());
    setBulkTagSelection(new Set());
    queryClient.invalidateQueries({ queryKey: ['media'] });
  }

  if (!media || media.length === 0 && !activeTag && approvalStatus === 'all' && !debouncedSearch) {
    return (
      <>
        <EmptyState
          icon={ImageIcon}
          title="No media uploaded"
          description="Upload photos and videos of your work to build your portfolio."
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Media
            </Button>
          }
        />
        <BulkUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['media'] });
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Tag filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-1">Tags:</span>
        <Badge
          variant={activeTag === undefined ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActiveTag(undefined)}
        >
          All
        </Badge>
        {MEDIA_TAGS.map((tag) => (
          <Badge
            key={tag}
            variant={activeTag === tag ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => setActiveTag(activeTag === tag ? undefined : tag)}
          >
            {tag}
          </Badge>
        ))}

        <span className="ml-4 text-sm font-medium text-muted-foreground mr-1">Status:</span>
        <Badge
          variant={approvalStatus === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setApprovalStatus('all')}
        >
          All
        </Badge>
        <Badge
          variant={approvalStatus === 'approved' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setApprovalStatus('approved')}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Approved
        </Badge>
        <Badge
          variant={approvalStatus === 'pending' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setApprovalStatus('pending')}
        >
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      </div>

      {/* Toolbar row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {mediaResult?.total ?? 0} item{(mediaResult?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkTagOpen(true)}
              >
                <Tags className="mr-2 h-4 w-4" />
                Assign Tags ({selectedIds.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear selection
              </Button>
            </>
          )}
          {media.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedIds.size === media.length ? 'Deselect all' : 'Select all'}
            </Button>
          )}
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Thumbnail grid */}
      {media.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No media found matching your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-lg border bg-card overflow-hidden"
            >
              {/* Selection checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => handleToggleSelect(item.id)}
                  className="bg-background/80 backdrop-blur-sm"
                />
              </div>

              {/* Approval indicator */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => handleToggleApproval(item.id, item.isApproved)}
                  className="rounded-full bg-background/80 backdrop-blur-sm p-1"
                  title={item.isApproved ? 'Approved - click to revoke' : 'Pending - click to approve'}
                >
                  {item.isApproved ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </button>
              </div>

              {/* Thumbnail */}
              <div className="aspect-square relative bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnailUrl || item.fileUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-3 space-y-2">
                {/* Name */}
                <p className="text-sm font-medium truncate">{item.name}</p>

                {/* Tag chips */}
                <div className="flex flex-wrap gap-1">
                  {item.tags && item.tags.length > 0 ? (
                    item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-micro px-1.5 py-0 capitalize">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-micro text-muted-foreground">No tags</span>
                  )}
                </div>

                {/* Controls: visibility toggle + delete */}
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
      )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['media'] });
        }}
      />

      {/* Bulk Tag Assignment Dialog */}
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Tags</DialogTitle>
            <DialogDescription>
              Select tags to assign to {selectedIds.size} selected item{selectedIds.size !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 py-4">
            {MEDIA_TAGS.map((tag) => (
              <label key={tag} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={bulkTagSelection.has(tag)}
                  onCheckedChange={(checked) => {
                    setBulkTagSelection((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(tag);
                      else next.delete(tag);
                      return next;
                    });
                  }}
                />
                <span className="text-sm capitalize">{tag}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkTagOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssignTags}
              disabled={bulkTagSelection.size === 0}
            >
              Assign Tags
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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

// ============================================================================
// Bulk Upload Dialog
// ============================================================================

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function BulkUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [artistId, setArtistId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: FileUploadItem[] = Array.from(selected).map((file) => ({
      file,
      status: 'pending' as FileUploadStatus,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUploadAll() {
    if (files.length === 0 || !artistId) {
      toast.error('Please add files and enter an Artist ID');
      return;
    }

    setIsUploading(true);
    const uploadedFiles: { name: string; fileUrl: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === 'success') continue;

      setCurrentIndex(i);
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      );

      // Validate
      if (!ACCEPTED_TYPES.includes(item.file.type)) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'failed', error: 'Invalid file type' } : f
          )
        );
        continue;
      }
      if (item.file.size > MAX_SIZE) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'failed', error: 'File too large (max 10MB)' } : f
          )
        );
        continue;
      }

      try {
        const blob = await upload(item.file.name, item.file, {
          access: 'public',
          handleUploadUrl: '/api/upload/token',
        });

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'success', url: blob.url } : f
          )
        );
        uploadedFiles.push({
          name: item.file.name.replace(/\.[^.]+$/, ''),
          fileUrl: blob.url,
        });
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    // Create media items in DB
    if (uploadedFiles.length > 0) {
      const tags = Array.from(selectedTags);
      const result = await bulkUploadMediaAction(uploadedFiles, tags, artistId);
      if (result.success) {
        toast.success(`${result.data.count} files uploaded successfully`);
        onSuccess();
      } else {
        toast.error(result.error);
      }
    }

    setIsUploading(false);
  }

  async function retryFile(index: number) {
    const item = files[index];
    if (!item || !artistId) return;

    setFiles((prev) =>
      prev.map((f, idx) => (idx === index ? { ...f, status: 'uploading', error: undefined } : f))
    );

    try {
      const blob = await upload(item.file.name, item.file, {
        access: 'public',
        handleUploadUrl: '/api/upload/token',
      });

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === index ? { ...f, status: 'success', url: blob.url } : f
        )
      );

      // Create single media item
      const tags = Array.from(selectedTags);
      await bulkUploadMediaAction(
        [{ name: item.file.name.replace(/\.[^.]+$/, ''), fileUrl: blob.url }],
        tags,
        artistId
      );
      onSuccess();
      toast.success('File uploaded successfully');
    } catch (err) {
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === index
            ? { ...f, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' }
            : f
        )
      );
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setFiles([]);
      setSelectedTags(new Set());
      setArtistId('');
      setCurrentIndex(0);
      setIsUploading(false);
    }
    onOpenChange(open);
  }

  const successCount = files.filter((f) => f.status === 'success').length;
  const failedCount = files.filter((f) => f.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Media</DialogTitle>
          <DialogDescription>
            Upload multiple files with shared tag assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">Click to browse or drop files</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, WebP, or MP4 (max 10MB each)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {files.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{item.file.name}</span>
                  {item.status === 'pending' && (
                    <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {item.status === 'uploading' && (
                    <span className="text-xs text-muted-foreground animate-pulse">Uploading...</span>
                  )}
                  {item.status === 'success' && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  {item.status === 'failed' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-destructive">{item.error}</span>
                      <button onClick={() => retryFile(index)} className="text-muted-foreground hover:text-foreground" title="Retry">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Uploading {currentIndex + 1} of {files.length}...
              </p>
              <Progress value={((currentIndex + 1) / files.length) * 100} className="h-2" />
            </div>
          )}

          {/* Tag selection */}
          <div>
            <p className="text-sm font-medium mb-2">Assign tags to all files:</p>
            <div className="flex flex-wrap gap-3">
              {MEDIA_TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedTags.has(tag)}
                    onCheckedChange={(checked) => {
                      setSelectedTags((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(tag);
                        else next.delete(tag);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm capitalize">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Artist ID */}
          <div>
            <label className="text-sm font-medium">
              Artist ID *
              <Input
                value={artistId}
                onChange={(e) => setArtistId(e.target.value)}
                placeholder="Artist UUID"
                className="mt-1"
              />
            </label>
          </div>

          {/* Upload summary */}
          {(successCount > 0 || failedCount > 0) && (
            <div className="text-sm text-muted-foreground">
              {successCount > 0 && <span className="text-green-600">{successCount} uploaded</span>}
              {successCount > 0 && failedCount > 0 && ' / '}
              {failedCount > 0 && <span className="text-destructive">{failedCount} failed</span>}
            </div>
          )}

          {/* Upload button */}
          <Button
            onClick={handleUploadAll}
            className="w-full"
            disabled={files.length === 0 || !artistId || isUploading}
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
