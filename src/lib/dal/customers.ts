import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, or, ilike, desc, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { CreateCustomerData, UpdateCustomerData } from '@/lib/security/validation';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

export const getCustomers = cache(async () => {
  await requireStaffRole();
  return db.query.customer.findMany({
    orderBy: [desc(schema.customer.createdAt)],
    columns: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, createdAt: true,
    },
  });
});

export const getCustomerById = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.customer.findFirst({
    where: eq(schema.customer.id, id),
  });
});

export const getCustomerWithDetails = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.customer.findFirst({
    where: eq(schema.customer.id, id),
    with: {
      user: true,
      appointments: true,
      tattooSessions: true,
      designs: true,
    },
  });
});

export interface TimelineEntry {
  type: 'appointment' | 'contact';
  date: Date;
  summary: string;
  status: string;
  id: string;
}

export const getCustomerTimeline = cache(async (customerId: string): Promise<TimelineEntry[]> => {
  await requireStaffRole();

  // Get customer to find their email for contact matching
  const customer = await db.query.customer.findFirst({
    where: eq(schema.customer.id, customerId),
    columns: { email: true },
  });

  // Fetch appointments for this customer
  const appointments = await db.query.appointment.findMany({
    where: eq(schema.appointment.customerId, customerId),
    orderBy: [desc(schema.appointment.scheduledDate)],
    limit: 10,
    columns: {
      id: true,
      scheduledDate: true,
      type: true,
      status: true,
      description: true,
    },
  });

  const appointmentEntries: TimelineEntry[] = appointments.map((a) => ({
    type: 'appointment' as const,
    date: new Date(a.scheduledDate),
    summary: `${a.type.replace(/_/g, ' ')}${a.description ? ` - ${a.description}` : ''}`,
    status: a.status,
    id: a.id,
  }));

  // Fetch contacts by matching customer email
  let contactEntries: TimelineEntry[] = [];
  if (customer?.email) {
    const contacts = await db.query.contact.findMany({
      where: eq(schema.contact.email, customer.email),
      orderBy: [desc(schema.contact.createdAt)],
      limit: 10,
      columns: {
        id: true,
        createdAt: true,
        message: true,
        status: true,
      },
    });

    contactEntries = contacts.map((c) => ({
      type: 'contact' as const,
      date: new Date(c.createdAt),
      summary: c.message.length > 80 ? c.message.slice(0, 80) + '...' : c.message,
      status: c.status,
      id: c.id,
    }));
  }

  // Merge and sort by date desc, cap at 20
  const merged = [...appointmentEntries, ...contactEntries]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20);

  return merged;
});

export async function createCustomer(data: CreateCustomerData) {
  await requireStaffRole();
  const [result] = await db.insert(schema.customer).values({
    ...data,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
  }).returning();
  return result;
}

export async function updateCustomer(id: string, data: UpdateCustomerData) {
  await requireStaffRole();
  const setData: Record<string, unknown> = { ...data };
  if (data.dateOfBirth !== undefined) {
    setData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  }
  const [result] = await db.update(schema.customer)
    .set(setData)
    .where(eq(schema.customer.id, id))
    .returning();
  return result;
}

export async function deleteCustomer(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.customer)
    .where(eq(schema.customer.id, id))
    .returning();
  return result;
}

export async function checkDuplicateEmails(emails: string[]): Promise<string[]> {
  await requireStaffRole();
  if (emails.length === 0) return [];

  const results = await db.query.customer.findMany({
    where: inArray(schema.customer.email, emails),
    columns: { email: true },
  });

  return results
    .map((r) => r.email)
    .filter((e): e is string => e !== null);
}

export const searchCustomers = cache(async (query: string) => {
  await requireStaffRole();
  return db.query.customer.findMany({
    where: or(
      ilike(schema.customer.firstName, `%${query}%`),
      ilike(schema.customer.lastName, `%${query}%`),
      ilike(schema.customer.email, `%${query}%`),
    ),
    orderBy: [desc(schema.customer.createdAt)],
    columns: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, createdAt: true,
    },
  });
});
