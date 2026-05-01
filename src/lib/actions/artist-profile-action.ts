'use server';

import { z } from 'zod';
import { updateArtistProfile } from '@/lib/dal/artists';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const ADMIN_ROLES = ['admin', 'super_admin'];

const ArtistProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(20).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  specialties: z.array(z.string()).default([]),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive'),
  profileImage: z.string().url().optional().nullable(),
  instagramHandle: z.string().max(50).optional().nullable(),
  yearsExperience: z.number().int().min(0).max(60).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type ArtistProfileData = z.infer<typeof ArtistProfileSchema>;

export async function updateArtistProfileAction(
  id: string,
  data: ArtistProfileData
): Promise<ActionResult<void>> {
  try {
    const session = await getCurrentSession();
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const validated = ArtistProfileSchema.parse(data);
    await updateArtistProfile(id, validated);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'artist_profile',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/dashboard/profile');
    return { success: true, data: undefined };
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return { success: false, error: 'Validation failed', fieldErrors };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
