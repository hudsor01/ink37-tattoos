import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { forbidden, unauthorized } from 'next/navigation';
import { logger } from '@/lib/logger';

// WebSocket support for Node.js/Bun (not needed in Edge but harmless)
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const auth = betterAuth({
  database: pool,
  plugins: [
    admin({ defaultRole: 'user' }),
    nextCookies(), // must be last — handles cookie setting in Route Handlers & Server Actions
  ],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
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
                const message = linkError instanceof Error ? linkError.message : String(linkError);
                if (message.includes('unique constraint') || message.includes('duplicate key')) {
                  logger.error({ email: user.email, customerId: existing[0].id }, 'Auth hook: customer userId conflict -- admin resolution needed');
                } else {
                  throw linkError;
                }
              }
            } else if (!existing[0]) {
              const [firstName, ...rest] = (user.name || 'Client').split(' ');
              await db.insert(schema.customer).values({
                firstName,
                lastName: rest.join(' ') || '',
                email: user.email,
                userId: user.id,
              });
            }
          } catch (error) {
            logger.error({ err: error }, 'Auth hook: customer auto-link failed');
          }
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user', input: false },
      banned: { type: 'boolean', defaultValue: false, input: false },
      banReason: { type: 'string', required: false, input: false },
      banExpires: { type: 'date', required: false, input: false },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL?.replace('://', '://www.'),
    process.env.NEXT_PUBLIC_APP_URL?.replace('://', '://www.'),
  ].filter(Boolean) as string[],
  advanced: {
    database: {
      generateId: false,
    },
  },
});

// Helper to get current session in server components / DAL
export async function getCurrentSession() {
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

export async function requireRole(minimumRole: Role) {
  const session = await getCurrentSession();
  if (!session?.user) {
    unauthorized();
  }
  const userLevel = ROLE_HIERARCHY[session.user.role as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  if (userLevel < requiredLevel) {
    forbidden();
  }
  return session;
}
