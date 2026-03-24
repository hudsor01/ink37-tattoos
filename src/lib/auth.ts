import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { Pool } from 'pg';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';

let _authPool: Pool | undefined;
function getAuthPool() {
  if (!_authPool) {
    _authPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _authPool;
}

function createAuth() {
  return betterAuth({
    database: getAuthPool(),
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
              const existing = await db.select()
                .from(schema.customer)
                .where(eq(schema.customer.email, user.email))
                .limit(1);
              if (existing[0] && !existing[0].userId) {
                await db.update(schema.customer)
                  .set({ userId: user.id })
                  .where(eq(schema.customer.id, existing[0].id));
              } else if (!existing[0]) {
                // D-02: No match -- create new Customer record
                const [firstName, ...rest] = (user.name || 'Client').split(' ');
                await db.insert(schema.customer).values({
                  firstName,
                  lastName: rest.join(' ') || '',
                  email: user.email,
                  userId: user.id,
                });
              }
              // If existing customer already has a userId, do nothing (admin resolves)
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
    baseURL: env().BETTER_AUTH_URL,
    secret: env().BETTER_AUTH_SECRET,
    advanced: {
      database: {
        generateId: false, // Use database UUID generation
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let _auth: AuthInstance | undefined;
function getAuth(): AuthInstance {
  if (!_auth) {
    _auth = createAuth();
  }
  return _auth;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_, prop) {
    return (getAuth() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Helper to get current session in server components / DAL
export async function getCurrentSession() {
  const { headers } = await import('next/headers');
  return auth.api.getSession({ headers: await headers() });
}

export type Session = Awaited<ReturnType<typeof getCurrentSession>>;
