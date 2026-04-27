import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { forbidden, unauthorized } from 'next/navigation';
import { eq, and, desc, sql, gt, lte, max } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!STAFF_ROLES.includes(session.user.role)) {
    forbidden();
  }
  return session;
}

async function requireAnyUser() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  return session;
}

/**
 * Get all consent form versions, ordered by version desc.
 * Requires staff role.
 */
export const getConsentForms = cache(async () => {
  await requireStaffRole();
  return db.query.consentForm.findMany({
    orderBy: [desc(schema.consentForm.version)],
  });
});

/**
 * Get the single active consent form (latest version with isActive=true).
 * When requireStaff is true (default), requires staff role.
 * When requireStaff is false, requires only any authenticated user (for portal use).
 */
export const getActiveConsentForm = cache(
  async (options?: { requireStaff?: boolean }) => {
    const requireStaff = options?.requireStaff ?? true;
    if (requireStaff) {
      await requireStaffRole();
    } else {
      await requireAnyUser();
    }

    return db.query.consentForm.findFirst({
      where: eq(schema.consentForm.isActive, true),
      orderBy: [desc(schema.consentForm.version)],
    });
  }
);

/**
 * Get consent data for all sessions belonging to a customer.
 * Requires staff role.
 */
export const getConsentFormsByCustomer = cache(async (customerId: string) => {
  await requireStaffRole();
  return db
    .select({
      id: schema.tattooSession.id,
      designDescription: schema.tattooSession.designDescription,
      appointmentDate: schema.tattooSession.appointmentDate,
      consentSigned: schema.tattooSession.consentSigned,
      consentSignedAt: schema.tattooSession.consentSignedAt,
      consentSignedBy: schema.tattooSession.consentSignedBy,
      consentFormVersion: schema.tattooSession.consentFormVersion,
      consentExpiresAt: schema.tattooSession.consentExpiresAt,
    })
    .from(schema.tattooSession)
    .where(eq(schema.tattooSession.customerId, customerId))
    .orderBy(desc(schema.tattooSession.appointmentDate));
});

/**
 * Get paginated consent records with expired/active/pending status.
 * Requires staff role.
 */
export async function getSignedConsentsWithExpiration(filters: {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'active' | 'expired' | 'pending';
}) {
  await requireStaffRole();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;
  const now = new Date();

  const conditions = [];

  // Filter by consent status
  if (filters.filter === 'active') {
    conditions.push(eq(schema.tattooSession.consentSigned, true));
    conditions.push(gt(schema.tattooSession.consentExpiresAt, now));
  } else if (filters.filter === 'expired') {
    conditions.push(eq(schema.tattooSession.consentSigned, true));
    conditions.push(lte(schema.tattooSession.consentExpiresAt, now));
  } else if (filters.filter === 'pending') {
    conditions.push(eq(schema.tattooSession.consentSigned, false));
  }

  // Search on customer name
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      sql`(${schema.customer.firstName} ILIKE ${searchTerm} OR ${schema.customer.lastName} ILIKE ${searchTerm})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, countResult] = await Promise.all([
    db
      .select({
        sessionId: schema.tattooSession.id,
        designDescription: schema.tattooSession.designDescription,
        appointmentDate: schema.tattooSession.appointmentDate,
        consentSigned: schema.tattooSession.consentSigned,
        consentSignedAt: schema.tattooSession.consentSignedAt,
        consentSignedBy: schema.tattooSession.consentSignedBy,
        consentFormVersion: schema.tattooSession.consentFormVersion,
        consentExpiresAt: schema.tattooSession.consentExpiresAt,
        customerId: schema.customer.id,
        customerFirstName: schema.customer.firstName,
        customerLastName: schema.customer.lastName,
        customerEmail: schema.customer.email,
      })
      .from(schema.tattooSession)
      .innerJoin(
        schema.customer,
        eq(schema.tattooSession.customerId, schema.customer.id)
      )
      .where(whereClause)
      .orderBy(desc(schema.tattooSession.appointmentDate))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.tattooSession)
      .innerJoin(
        schema.customer,
        eq(schema.tattooSession.customerId, schema.customer.id)
      )
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data: results.map((r) => ({
      ...r,
      status: !r.consentSigned
        ? ('pending' as const)
        : r.consentExpiresAt && r.consentExpiresAt <= now
          ? ('expired' as const)
          : ('active' as const),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Create a new consent form version.
 * Uses a transaction to deactivate all existing active versions and insert the new one.
 * Requires staff role.
 */
export async function createConsentFormVersion(data: {
  title: string;
  content: string;
}) {
  await requireStaffRole();

  return db.transaction(async (tx) => {
    // Get the current max version
    const [maxResult] = await tx
      .select({ maxVersion: max(schema.consentForm.version) })
      .from(schema.consentForm);

    const nextVersion = (maxResult?.maxVersion ?? 0) + 1;

    // Deactivate all existing active versions
    await tx
      .update(schema.consentForm)
      .set({ isActive: false })
      .where(eq(schema.consentForm.isActive, true));

    // Insert new version
    const [newForm] = await tx
      .insert(schema.consentForm)
      .values({
        version: nextVersion,
        title: data.title,
        content: data.content,
        isActive: true,
      })
      .returning();

    return newForm;
  });
}
