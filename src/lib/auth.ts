import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),
  plugins: [
    nextCookies(),
    admin({ defaultRole: 'user' }),
  ],
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // D-01: Auto-link by email match
            const existingCustomer = await db.customer.findUnique({
              where: { email: user.email },
            });
            if (existingCustomer && !existingCustomer.userId) {
              await db.customer.update({
                where: { id: existingCustomer.id },
                data: { userId: user.id },
              });
            } else if (!existingCustomer) {
              // D-02: No match -- create new Customer record
              const [firstName, ...rest] = (user.name || 'Client').split(' ');
              await db.customer.create({
                data: {
                  firstName,
                  lastName: rest.join(' ') || '',
                  email: user.email,
                  userId: user.id,
                },
              });
            }
            // If existingCustomer already has a userId, do nothing (admin resolves)
          } catch (error) {
            // Never fail registration due to customer linking errors
            console.error('[Auth Hook] Customer auto-link failed:', error);
          }
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,       // refresh after 24 hours
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user', input: false },
      banned: { type: 'boolean', defaultValue: false, input: false },
      banReason: { type: 'string', required: false, input: false },
      banExpires: { type: 'date', required: false, input: false },
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  advanced: {
    database: {
      generateId: false, // Use Prisma's default UUID generation
    },
  },
});

// Helper to get current session in server components / DAL
export async function getCurrentSession() {
  const { headers } = await import('next/headers');
  return auth.api.getSession({ headers: await headers() });
}

export type Session = typeof auth.$Infer.Session;
