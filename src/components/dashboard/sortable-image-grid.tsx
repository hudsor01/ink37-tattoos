'use client';

import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, Trash2, GripVertical, Plus, ImageIcon } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import { toast } from 'sonner';
import Image from 'next/image';

type ProductImage = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: Date;
};

interface SortableImageGridProps {
  images: ProductImage[];
  onReorder: (orderedIds: string[]) => Promise<void>;
  onToggleVisibility: (id: string, visible: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: (url: string) => Promise<void>;
}

function SortableItem({
  image,
  isPrimary,
  onToggleVisibility,
  onDelete,
}: {
  image: ProductImage;
  isPrimary: boolean;
  onToggleVisibility: (id: string, visible: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg border bg-card p-2 ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      } ${!image.isVisible ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <button
        className="absolute top-1 left-1 z-10 rounded-sm bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3 w-3" />
      </button>

      {/* Badges */}
      <div className="absolute top-1 right-1 z-10 flex gap-1">
        {isPrimary && (
          <Badge variant="default" className="text-micro px-1.5 py-0">
            Primary
          </Badge>
        )}
        {!image.isVisible && (
          <Badge variant="secondary" className="text-micro px-1.5 py-0">
            Hidden
          </Badge>
        )}
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-md">
        <Image
          src={image.url}
          alt={image.alt ?? 'Product image'}
          fill
          className="object-cover"
          sizes="120px"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onToggleVisibility(image.id, !image.isVisible)}
          title={image.isVisible ? 'Hide image' : 'Show image'}
        >
          {image.isVisible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Delete image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Image</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this image from the product gallery and storage. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onDelete(image.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function SortableImageGrid({
  images: initialImages,
  onReorder,
  onToggleVisibility,
  onDelete,
  onAdd,
}: SortableImageGridProps) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync with props
  // (when server revalidation comes back, props update)
  if (initialImages !== images && JSON.stringify(initialImages) !== JSON.stringify(images)) {
    setImages(initialImages);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find the first visible image for "Primary" badge
  const sortedVisible = images
    .filter((img) => img.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const primaryImageId = sortedVisible[0]?.id;

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      const newOrder = arrayMove(images, oldIndex, newIndex);

      // Optimistic update
      setImages(newOrder.map((img, i) => ({ ...img, sortOrder: i })));

      try {
        await onReorder(newOrder.map((img) => img.id));
      } catch {
        // Rollback on error
        setImages(initialImages);
        toast.error('Failed to reorder images. Please try again.');
      }
    },
    [images, initialImages, onReorder]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Accepted: JPEG, PNG, WebP.');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/token',
          onUploadProgress: ({ percentage }) => {
            setUploadProgress(percentage);
          },
        });

        await onAdd(blob.url);
        toast.success('Image added to gallery.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onAdd]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map((img) => img.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {images.map((image) => (
              <SortableItem
                key={image.id}
                image={image}
                isPrimary={image.id === primaryImageId}
                onToggleVisibility={onToggleVisibility}
                onDelete={onDelete}
              />
            ))}

            {/* Add new image button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2 px-2 w-full">
                  <span className="text-xs text-muted-foreground">
                    {uploadProgress}%
                  </span>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              ) : (
                <>
                  <Plus className="h-6 w-6 text-muted-foreground/50 mb-1" />
                  <span className="text-xs text-muted-foreground">Add</span>
                </>
              )}
            </button>
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            No images yet. Click the + button to add product images.
          </p>
        </div>
      )}
    </div>
  );
}
