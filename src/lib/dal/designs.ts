import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// PUBLIC -- no auth required (gallery content is public per locked decision)
export const getPublicDesigns = cache(async (filters?: { style?: string }) => {
  const conditions = [
    eq(schema.tattooDesign.isApproved, true),
    eq(schema.tattooDesign.isPublic, true),
  ];
  if (filters?.style) {
    conditions.push(eq(schema.tattooDesign.designType, filters.style));
  }

  return db.query.tattooDesign.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.tattooDesign.createdAt)],
  });
});

// PUBLIC -- single design detail
export const getPublicDesignById = cache(async (id: string) => {
  return db.query.tattooDesign.findFirst({
    where: and(
      eq(schema.tattooDesign.id, id),
      eq(schema.tattooDesign.isApproved, true),
      eq(schema.tattooDesign.isPublic, true),
    ),
    with: { artist: { columns: { name: true } } },
  });
});

// ADMIN -- all designs including unapproved
export const getAllDesigns = cache(async () => {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  return db.query.tattooDesign.findMany({
    orderBy: [desc(schema.tattooDesign.createdAt)],
    with: { artist: { columns: { name: true } } },
  });
});
