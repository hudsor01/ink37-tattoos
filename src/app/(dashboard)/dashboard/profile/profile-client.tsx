'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { upload } from '@vercel/blob/client';
import { toast } from 'sonner';
import {
  updateArtistProfileAction,
  type ArtistProfileData,
} from '@/lib/actions/artist-profile-action';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload } from 'lucide-react';

const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(20).optional().nullable().transform((v) => v || null),
  bio: z.string().max(2000).optional().nullable().transform((v) => v || null),
  specialties: z.array(z.string()).default([]),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate must be positive'),
  profileImage: z.string().url().optional().nullable(),
  instagramHandle: z.string().max(50).optional().nullable().transform((v) => v || null),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional().nullable().transform((v) => (v === 0 || v) ? v : null),
  isActive: z.boolean().default(true),
});

interface ArtistProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialties: string[] | null;
  hourlyRate: number;
  isActive: boolean;
  portfolio: string[] | null;
  bio: string | null;
  profileImage: string | null;
  instagramHandle: string | null;
  yearsExperience: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileClientProps {
  profile: ArtistProfile;
}

export function ProfileClient({ profile }: ProfileClientProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ArtistProfileData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver typing mismatch with transform
    resolver: zodResolver(ProfileSchema) as any,
    defaultValues: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? '',
      bio: profile.bio ?? '',
      specialties: profile.specialties ?? [],
      hourlyRate: profile.hourlyRate,
      profileImage: profile.profileImage ?? undefined,
      instagramHandle: profile.instagramHandle ?? '',
      yearsExperience: profile.yearsExperience ?? undefined,
      isActive: profile.isActive,
    },
  });

  const profileImage = form.watch('profileImage');

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Use JPEG, PNG, or WebP.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.');
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

        form.setValue('profileImage', blob.url, { shouldDirty: true });
        toast.success('Photo uploaded');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [form]
  );

  async function onSubmit(data: ArtistProfileData) {
    toast.promise(
      updateArtistProfileAction(profile.id, data).then((result) => {
        if (!result.success) {
          if (result.fieldErrors) {
            for (const [key, messages] of Object.entries(result.fieldErrors)) {
              form.setError(key as keyof ArtistProfileData, {
                message: messages[0],
              });
            }
          }
          throw new Error(result.error);
        }
        form.reset(data);
        return result;
      }),
      {
        loading: 'Saving profile...',
        success: 'Profile updated successfully',
        error: (err) => err.message ?? "Changes couldn't be saved. Please try again.",
      }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Info Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Personal Info</h2>
            <p className="text-sm text-muted-foreground">
              Your name, contact details, and profile photo.
            </p>
          </div>
          <Separator />

          {/* Profile Photo */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar size="lg" className="!size-20">
                {profileImage ? (
                  <AvatarImage src={profileImage} alt={profile.name} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {profile.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 size-4" />
                {uploading ? 'Uploading...' : 'Change Photo'}
              </Button>
              {uploading && uploadProgress > 0 && (
                <Progress value={uploadProgress} className="w-48" />
              )}
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP. Max 5MB.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 555-5555" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Business Details Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Business Details</h2>
            <p className="text-sm text-muted-foreground">
              Bio, specialties, rates, and experience.
            </p>
          </div>
          <Separator />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell clients about yourself, your style, and your experience..."
                    className="min-h-textarea-md"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialties"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialties</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Realism, Japanese, Blackwork (comma-separated)"
                    value={field.value?.join(', ') ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Rate ($) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="150.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="yearsExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      placeholder="10"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    When inactive, your profile will be hidden from public views.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Social Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Social</h2>
            <p className="text-sm text-muted-foreground">
              Social media and online presence.
            </p>
          </div>
          <Separator />

          <FormField
            control={form.control}
            name="instagramHandle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram Handle</FormLabel>
                <FormControl>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                      @
                    </span>
                    <Input
                      className="rounded-l-none"
                      placeholder="ink37tattoos"
                      {...field}
                      value={(field.value ?? '').replace(/^@/, '')}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^@/, '');
                        field.onChange(val || null);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
