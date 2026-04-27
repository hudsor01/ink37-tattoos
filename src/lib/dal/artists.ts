import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { forbidden, unauthorized } from 'next/navigation';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const ADMIN_ROLES = ['admin', 'super_admin'];

async function requireAdminRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!ADMIN_ROLES.includes(session.user.role)) {
    forbidden();
  }
  return session;
}

export const getArtistProfile = cache(async () => {
  await requireAdminRole();
  // Solo artist studio -- return the first (and only) active artist
  return db.query.tattooArtist.findFirst({
    where: eq(schema.tattooArtist.isActive, true),
  });
});

export async function updateArtistProfile(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    bio?: string | null;
    specialties?: string[];
    hourlyRate?: number;
    portfolio?: string[];
    profileImage?: string | null;
    instagramHandle?: string | null;
    yearsExperience?: number | null;
    isActive?: boolean;
  }
) {
  await requireAdminRole();
  const [result] = await db
    .update(schema.tattooArtist)
    .set(data)
    .where(eq(schema.tattooArtist.id, id))
    .returning();
  return result;
}
