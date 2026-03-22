import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Portal authentication helper.
 * Verifies the user is authenticated AND has a linked Customer record.
 * Redirects to /login if no session, /portal/no-account if no Customer.
 */
async function requirePortalAuth() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  const customer = await db.customer.findUnique({
    where: { userId: session.user.id },
  });

  if (!customer) {
    // User exists but has no linked Customer record.
    // Shouldn't normally happen if databaseHooks works, but handle gracefully.
    redirect('/portal/no-account');
  }

  return { session, customer };
}

/**
 * Get all appointments for the authenticated user's customer.
 * Omits admin-only notes (D-17).
 */
export const getPortalAppointments = cache(async () => {
  const { customer } = await requirePortalAuth();
  return db.appointment.findMany({
    where: { customerId: customer.id },
    orderBy: { scheduledDate: 'desc' },
    select: {
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
  return db.tattooSession.findMany({
    where: { customerId: customer.id },
    orderBy: { appointmentDate: 'desc' },
    select: {
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
      appointment: {
        select: {
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
  return db.payment.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    select: {
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
  return db.tattooDesign.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    select: {
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

  const [nextAppointment, recentPayment, totalAppointments, totalSessions, unsignedConsents] =
    await Promise.all([
      db.appointment.findFirst({
        where: {
          customerId: customer.id,
          scheduledDate: { gte: new Date() },
          status: { not: 'CANCELLED' },
        },
        orderBy: { scheduledDate: 'asc' },
        select: {
          id: true,
          scheduledDate: true,
          duration: true,
          status: true,
          type: true,
          placement: true,
          description: true,
        },
      }),
      db.payment.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          type: true,
          createdAt: true,
          receiptUrl: true,
        },
      }),
      db.appointment.count({
        where: { customerId: customer.id },
      }),
      db.tattooSession.count({
        where: { customerId: customer.id },
      }),
      db.tattooSession.count({
        where: {
          customerId: customer.id,
          consentSigned: false,
        },
      }),
    ]);

  return {
    nextAppointment,
    recentPayment,
    stats: {
      totalAppointments,
      totalSessions,
      unsignedConsents,
    },
  };
});

/**
 * Get the authenticated user's customer profile.
 * Omits medical info and emergency contacts (D-04, D-18).
 */
export const getPortalProfile = cache(async () => {
  const { session } = await requirePortalAuth();
  return db.customer.findUnique({
    where: { userId: session.user.id },
    select: {
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
