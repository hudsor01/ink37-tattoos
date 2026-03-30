'use client';

import { useCallback } from 'react';
import { SortableImageGrid } from '@/components/dashboard/sortable-image-grid';
import {
  addProductImageAction,
  toggleImageVisibilityAction,
  reorderProductImagesAction,
  deleteProductImageAction,
} from '@/lib/actions/product-image-actions';
import { toast } from 'sonner';

type ProductImage = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: Date;
};

interface ProductImageGalleryProps {
  productId: string;
  images: ProductImage[];
}

export function ProductImageGallery({ productId, images }: ProductImageGalleryProps) {
  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      const result = await reorderProductImagesAction(productId, orderedIds);
      if (!result.success) {
        throw new Error('Failed to reorder');
      }
    },
    [productId]
  );

  const handleToggleVisibility = useCallback(
    async (imageId: string, visible: boolean) => {
      try {
        const result = await toggleImageVisibilityAction(imageId, visible, productId);
        if (!result.success) throw new Error('Failed');
        toast.success(visible ? 'Image visible in store' : 'Image hidden from store');
      } catch {
        toast.error('Failed to update visibility. Please try again.');
      }
    },
    [productId]
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      try {
        const result = await deleteProductImageAction(imageId, productId);
        if (!result.success) throw new Error('Failed');
        toast.success('Image deleted.');
      } catch {
        toast.error('Failed to delete image. Please try again.');
      }
    },
    [productId]
  );

  const handleAdd = useCallback(
    async (url: string) => {
      const result = await addProductImageAction(productId, url);
      if (!result.success) {
        throw new Error('Failed to add image');
      }
    },
    [productId]
  );

  return (
    <SortableImageGrid
      images={images}
      onReorder={handleReorder}
      onToggleVisibility={handleToggleVisibility}
      onDelete={handleDelete}
      onAdd={handleAdd}
    />
  );
}
