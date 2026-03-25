'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useTransition } from 'react';
import {
  CreateProductSchema,
  type CreateProductData,
} from '@/lib/security/validation';
import {
  createProductAction,
  updateProductAction,
} from '@/lib/actions/product-actions';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileImage } from 'lucide-react';
import Image from 'next/image';

interface ProductFormProps {
  product?: {
    id: string;
    name: string;
    description: string | null;
    price: number | { toString(): string };
    productType: string;
    imageUrl: string | null;
    digitalFilePathname: string | null;
    digitalFileName: string | null;
    isActive: boolean;
    sortOrder: number;
  };
  mode: 'create' | 'edit';
}

export function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateProductData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver typing mismatch with .default() in Zod schema
    resolver: zodResolver(CreateProductSchema) as any,
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? undefined,
      price: product ? Number(product.price.toString()) : undefined,
      productType: (product?.productType as 'PHYSICAL' | 'DIGITAL' | 'GIFT_CARD') ?? 'PHYSICAL',
      imageUrl: product?.imageUrl ?? undefined,
      digitalFilePathname: product?.digitalFilePathname ?? undefined,
      digitalFileName: product?.digitalFileName ?? undefined,
      isActive: product?.isActive ?? true,
      sortOrder: product?.sortOrder ?? 0,
    },
  });

  const watchProductType = form.watch('productType');

  async function uploadFile(file: File) {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { url } = await res.json();
      setImageUrl(url);
      form.setValue('imageUrl', url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  async function onSubmit(data: CreateProductData) {
    startTransition(async () => {
      try {
        const formData = new FormData();

        if (mode === 'edit' && product) {
          formData.append('id', product.id);
        }

        formData.append('name', data.name);
        if (data.description) formData.append('description', data.description);
        formData.append('price', String(data.price));
        formData.append('productType', data.productType);
        if (data.imageUrl) formData.append('imageUrl', data.imageUrl);
        if (data.digitalFilePathname) formData.append('digitalFilePathname', data.digitalFilePathname);
        if (data.digitalFileName) formData.append('digitalFileName', data.digitalFileName);
        formData.append('isActive', String(data.isActive));
        formData.append('sortOrder', String(data.sortOrder));

        const result = mode === 'create'
          ? await createProductAction(formData)
          : await updateProductAction(formData);

        if (result.success) {
          toast.success(mode === 'create' ? 'Product created successfully' : 'Product updated successfully');
          router.push('/dashboard/products');
        }
      } catch {
        toast.error("Changes couldn't be saved. Please try again.");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Product description..."
                    rows={4}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PHYSICAL">Physical (Merch)</SelectItem>
                      <SelectItem value="DIGITAL">Digital (Print)</SelectItem>
                      <SelectItem value="GIFT_CARD">Gift Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Product Image</span>
            {imageUrl ? (
              <div className="flex items-center gap-4">
                <Image
                  src={imageUrl}
                  alt="Product image"
                  width={80}
                  height={80}
                  className="rounded object-cover"
                />
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    Image uploaded
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageUrl(null);
                      form.setValue('imageUrl', undefined);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">
                  {uploading ? 'Uploading...' : 'Drag and drop or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, or WebP (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Digital File Upload - shown only for DIGITAL products */}
          {watchProductType === 'DIGITAL' && (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-medium">Digital File</h3>
              <FormField
                control={form.control}
                name="digitalFileName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="high-res-print.pdf"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      The filename customers will see when downloading.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="digitalFilePathname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Path</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="uploads/prints/filename.pdf"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The Vercel Blob pathname for private storage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-end">
                  <FormLabel>Active</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <span className="text-sm text-muted-foreground">
                      {field.value ? 'Visible in store' : 'Hidden from store'}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/products')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create Product'
                  : 'Update Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
