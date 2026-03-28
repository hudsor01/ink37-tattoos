import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

/**
 * Get the artist profile. Solo artist studio -- returns the first active tattooArtist record.
 * Requires staff role.
 */
export const getArtistProfile = cache(async () => {
  await requireStaffRole();
  return db.query.tattooArtist.findFirst({
    where: eq(schema.tattooArtist.isActive, true),
  });
});

/**
 * Update the artist profile (solo artist studio).
 * Requires staff role.
 */
export async function updateArtistProfile(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    bio?: string;
    specialties?: string[];
    hourlyRate?: number;
    portfolio?: string[];
  }
) {
  await requireStaffRole();
  const [result] = await db.update(schema.tattooArtist)
    .set(data)
    .where(eq(schema.tattooArtist.id, id))
    .returning();
  if (!result) throw new Error('Artist profile not found');
  return result;
}
