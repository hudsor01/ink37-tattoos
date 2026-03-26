'use client';

import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createMediaAction } from '@/lib/actions/media-actions';
import { Upload, FileImage } from 'lucide-react';
import { toast } from 'sonner';

interface MediaUploaderProps {
  onSuccess?: () => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function MediaUploader({ onSuccess }: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formFields, setFormFields] = useState({
    name: '',
    designType: '',
    size: '',
    style: '',
    tags: '',
    artistId: '',
  });

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Accepted: JPEG, PNG, WebP, MP4';
    }
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum size is 10MB.';
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading(true);
    setFileName(file.name);

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
      setUploadedUrl(url);
      setFormFields((prev) => ({ ...prev, name: file.name.replace(/\.[^.]+$/, '') }));
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

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
    [uploadFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleSave = async () => {
    if (!uploadedUrl || !formFields.name || !formFields.artistId) {
      toast.error('Name and Artist ID are required');
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('name', formFields.name);
    formData.append('fileUrl', uploadedUrl);
    formData.append('artistId', formFields.artistId);
    if (formFields.designType) formData.append('designType', formFields.designType);
    if (formFields.size) formData.append('size', formFields.size);
    if (formFields.style) formData.append('style', formFields.style);
    if (formFields.tags) {
      formFields.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((tag) => formData.append('tags', tag));
    }

    toast.promise(
      createMediaAction(formData).then((result) => {
        onSuccess?.();
        return result;
      }),
      {
        loading: 'Saving to portfolio...',
        success: 'Media saved to portfolio',
        error: "Changes couldn't be saved. Please try again.",
      }
    );
    setSaving(false);
  };

  if (uploadedUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md bg-muted p-3">
          <FileImage className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm truncate">{fileName}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name *
              <Input
                value={formFields.name}
                onChange={(e) =>
                  setFormFields((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Design name"
              />
            </label>
          </div>
          <div>
            <label className="text-sm font-medium">Artist ID *
              <Input
                value={formFields.artistId}
                onChange={(e) =>
                  setFormFields((prev) => ({ ...prev, artistId: e.target.value }))
                }
                placeholder="Artist UUID"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Type
                <Input
                  value={formFields.designType}
                  onChange={(e) =>
                    setFormFields((prev) => ({ ...prev, designType: e.target.value }))
                  }
                  placeholder="e.g., Flash"
                />
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">Size
                <Input
                  value={formFields.size}
                  onChange={(e) =>
                    setFormFields((prev) => ({ ...prev, size: e.target.value }))
                  }
                  placeholder="e.g., Medium"
                />
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">Style
                <Input
                  value={formFields.style}
                  onChange={(e) =>
                    setFormFields((prev) => ({ ...prev, style: e.target.value }))
                  }
                  placeholder="e.g., Realism"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tags
              <Input
                value={formFields.tags}
                onChange={(e) =>
                  setFormFields((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="Comma-separated tags"
              />
            </label>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? 'Saving...' : 'Save to Portfolio'}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium">
        {uploading ? 'Uploading...' : 'Drag and drop or click to browse'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        JPEG, PNG, WebP, or MP4 (max 10MB)
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
