import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

// PUBLIC -- no auth required (gallery content is public per locked decision)
export const getPublicDesigns = cache(async (filters?: { style?: string }) => {
  return db.tattooDesign.findMany({
    where: {
      isApproved: true,
      isPublic: true,
      ...(filters?.style && { designType: filters.style }),
    },
    orderBy: { createdAt: 'desc' },
  });
});

// PUBLIC -- single design detail
export const getPublicDesignById = cache(async (id: string) => {
  return db.tattooDesign.findFirst({
    where: { id, isApproved: true, isPublic: true },
    include: { artist: { select: { name: true } } },
  });
});

// ADMIN -- all designs including unapproved
export const getAllDesigns = cache(async () => {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  return db.tattooDesign.findMany({
    orderBy: { createdAt: 'desc' },
    include: { artist: { select: { name: true } } },
  });
});
