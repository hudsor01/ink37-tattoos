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
