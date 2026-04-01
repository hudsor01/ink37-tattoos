import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// WebSocket support for Node.js/Bun (not needed in Edge but harmless)
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

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
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        // Fire-and-forget to prevent timing attacks
        void import('@/lib/email/resend').then(({ sendPasswordResetEmail }) =>
          sendPasswordResetEmail({ to: user.email, url })
        );
      },
    },
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
                try {
                  await db.update(schema.customer)
                    .set({ userId: user.id })
                    .where(eq(schema.customer.id, existing[0].id));
                } catch (linkError: unknown) {
                  // Handle unique constraint violation on customer.userId
                  const message = linkError instanceof Error ? linkError.message : String(linkError);
                  if (message.includes('unique constraint') || message.includes('duplicate key')) {
                    logger.error({ email: user.email, customerId: existing[0].id }, 'Auth hook: customer userId conflict -- admin resolution needed');
                  } else {
                    throw linkError;
                  }
                }
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
              logger.error({ err: error }, 'Auth hook: customer auto-link failed');
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

// Role hierarchy for authorization checks
type Role = 'user' | 'staff' | 'manager' | 'admin' | 'super_admin';
const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  staff: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Require the current user to have at least the specified role.
 * Throws 'Unauthorized' if no session, 'Forbidden' if insufficient role.
 * Returns the session with guaranteed non-null user for downstream use.
 */
export async function requireRole(minimumRole: Role) {
  const session = await getCurrentSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  const userLevel = ROLE_HIERARCHY[session.user.role as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  if (userLevel < requiredLevel) {
    throw new Error('Forbidden');
  }
  return session as NonNullable<typeof session>;
}
