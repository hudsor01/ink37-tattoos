import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect, unauthorized } from 'next/navigation';
import { eq, and, gte, not, sql, desc, asc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

/**
 * Portal authentication helper.
 * Verifies the user is authenticated AND has a linked Customer record.
 * Redirects to /login if no session, /portal/no-account if no Customer.
 */
async function requirePortalAuth() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();

  const customerRecord = await db.query.customer.findFirst({
    where: eq(schema.customer.userId, session.user.id),
  });

  if (!customerRecord) {
    // User exists but has no linked Customer record.
    // Shouldn't normally happen if databaseHooks works, but handle gracefully.
    redirect('/portal/no-account');
  }

  return { session, customer: customerRecord };
}

/**
 * Get all appointments for the authenticated user's customer.
 * Omits admin-only notes (D-17).
 */
export const getPortalAppointments = cache(async () => {
  const { customer } = await requirePortalAuth();
  return db.query.appointment.findMany({
    where: eq(schema.appointment.customerId, customer.id),
    orderBy: [desc(schema.appointment.scheduledDate)],
    columns: {
      id: true,
      scheduledDate: true,
      duration: true,
      status: true,
      type: true,
      tattooType: true,
      size: true,
      placement: true,
      description: true,
      // OMIT: notes (admin-only per D-17)
    },
  });
});

/**
 * Get all tattoo sessions for the authenticated user's customer.
 * Excludes hourlyRate, estimatedHours, notes (D-16, D-17).
 * Includes linked appointment info.
 */
export const getPortalSessions = cache(async () => {
  const { customer } = await requirePortalAuth();
  return db.query.tattooSession.findMany({
    where: eq(schema.tattooSession.customerId, customer.id),
    orderBy: [desc(schema.tattooSession.appointmentDate)],
    columns: {
      id: true,
      appointmentDate: true,
      duration: true,
      status: true,
      designDescription: true,
      placement: true,
      size: true,
      style: true,
      referenceImages: true,
      totalCost: true,
      depositAmount: true,
      paidAmount: true,
      consentSigned: true,
      consentSignedAt: true,
      consentSignedBy: true,
      aftercareProvided: true,
      // OMIT: hourlyRate, estimatedHours (D-16), notes (D-17)
    },
    with: {
      appointment: {
        columns: {
          id: true,
          scheduledDate: true,
          type: true,
        },
      },
    },
  });
});

/**
 * Get all payments for the authenticated user's customer.
 * Includes receipt URLs for Stripe-hosted receipts (D-20).
 * Omits notes (admin-only).
 */
export const getPortalPayments = cache(async () => {
  const { customer } = await requirePortalAuth();
  return db.query.payment.findMany({
    where: eq(schema.payment.customerId, customer.id),
    orderBy: [desc(schema.payment.createdAt)],
    columns: {
      id: true,
      amount: true,
      status: true,
      type: true,
      receiptUrl: true,
      stripePaymentIntentId: true,
      createdAt: true,
      // OMIT: notes (admin-only per D-17)
    },
  });
});

/**
 * Get all tattoo designs for the authenticated user's customer.
 * Images viewable but no download mechanism (D-19).
 */
export const getPortalDesigns = cache(async () => {
  const { customer } = await requirePortalAuth();
  return db.query.tattooDesign.findMany({
    where: eq(schema.tattooDesign.customerId, customer.id),
    orderBy: [desc(schema.tattooDesign.createdAt)],
    columns: {
      id: true,
      name: true,
      description: true,
      designType: true,
      style: true,
      size: true,
      fileUrl: true,
      thumbnailUrl: true,
      isApproved: true,
      createdAt: true,
    },
  });
});

/**
 * Get overview data for the portal dashboard (D-13).
 * Returns next upcoming appointment, most recent payment, and stats.
 */
export const getPortalOverview = cache(async () => {
  const { customer } = await requirePortalAuth();

  const [nextAppointment, recentPayment, totalAppointmentsResult, totalSessionsResult, unsignedConsentsResult] =
    await Promise.all([
      db.query.appointment.findFirst({
        where: and(
          eq(schema.appointment.customerId, customer.id),
          gte(schema.appointment.scheduledDate, new Date()),
          not(eq(schema.appointment.status, 'CANCELLED')),
        ),
        orderBy: [asc(schema.appointment.scheduledDate)],
        columns: {
          id: true,
          scheduledDate: true,
          duration: true,
          status: true,
          type: true,
          placement: true,
          description: true,
        },
      }),
      db.query.payment.findFirst({
        where: eq(schema.payment.customerId, customer.id),
        orderBy: [desc(schema.payment.createdAt)],
        columns: {
          id: true,
          amount: true,
          status: true,
          type: true,
          createdAt: true,
          receiptUrl: true,
        },
      }),
      db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.appointment)
        .where(eq(schema.appointment.customerId, customer.id)),
      db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.tattooSession)
        .where(eq(schema.tattooSession.customerId, customer.id)),
      db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.tattooSession)
        .where(and(
          eq(schema.tattooSession.customerId, customer.id),
          eq(schema.tattooSession.consentSigned, false),
        )),
    ]);

  return {
    nextAppointment: nextAppointment ?? null,
    recentPayment: recentPayment ?? null,
    stats: {
      totalAppointments: totalAppointmentsResult[0]?.count ?? 0,
      totalSessions: totalSessionsResult[0]?.count ?? 0,
      unsignedConsents: unsignedConsentsResult[0]?.count ?? 0,
    },
  };
});

/**
 * Get the authenticated user's customer profile.
 * Omits medical info and emergency contacts (D-04, D-18).
 */
export const getPortalProfile = cache(async () => {
  const { session } = await requirePortalAuth();
  return db.query.customer.findFirst({
    where: eq(schema.customer.userId, session.user.id),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      // OMIT: allergies, medicalConditions, emergencyName, emergencyPhone,
      // emergencyRel, notes (D-04, D-18)
    },
  });
});
