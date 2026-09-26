import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { Pool, neonConfig, type Client } from '@neondatabase/serverless';
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

/**
 * REQUIRED, not defensive. A pg-style Pool is an EventEmitter, and Node's
 * EventEmitter contract escalates an unhandled 'error' event into an uncaught
 * exception -- which in a serverless function takes the whole instance down.
 *
 * The neon-serverless driver talks to Postgres over a WebSocket, so an idle
 * connection dropping (Neon scale-to-zero, a cold start, an ordinary network
 * blip) is routine rather than exceptional. Without this listener each drop
 * surfaced as:
 *
 *   Error: Connection terminated unexpectedly
 *     at #onSocketClose (node:internal/deps/undici/undici)
 *   level: fatal   handled: no   mechanism: auto.node.onuncaughtexception
 *
 * observed twice in production within a day of error reporting going live
 * (INK37-TATTOOS-3). @neondatabase/serverless documents `pool.on('error')`
 * for exactly this.
 *
 * Logging and swallowing is correct here: the pool discards the dead client
 * and the next query acquires a fresh one, so there is nothing to recover --
 * the only real failure mode was the crash itself.
 */
pool.on('error', (err: Error) => {
  logger.error({ err, component: 'better-auth-pool' }, 'Neon pool client error');
});
/**
 * Second listener, and it is not redundant with pool.on('error').
 *
 * pg-pool attaches its own `idleListener` to each client, but removes it the
 * moment the client is checked out (pg-pool/index.js: `client.removeListener
 * ('error', idleListener)`). So for the entire duration of a query the client
 * has NO error listener, and a socket death there reaches Node as:
 *
 *   Error: Unhandled error. ()
 *     at Connection.reportStreamError -> client.emit('error')
 *   level: fatal   mechanism: auto.node.onuncaughtexception
 *
 * That is INK37-TATTOOS-5, which arrived AFTER the pool-level handler shipped
 * -- the pool handler only ever covered idle clients.
 *
 * Attaching here, on the pool's 'connect' event, gives every client a listener
 * for its whole lifetime. pg-pool removes only its own `idleListener` by
 * reference, so this one survives checkout.
 */
pool.on('connect', (client: Client) => {
  client.on('error', (err: Error) => {
    logger.error({ err, component: 'better-auth-pool-client' }, 'Neon client error');
  });
});

export const auth = betterAuth({
  database: pool,
  plugins: [
    admin({ defaultRole: 'user' }),
    nextCookies(), // must be last — handles cookie setting in Route Handlers & Server Actions
  ],
  emailAndPassword: {
    enabled: true,
    /**
     * Explicitly false -- Better Auth defaults this to TRUE.
     *
     * With auto sign-in, submitting /register while already authenticated
     * calls setSessionCookie and overwrites the caller's session with one for
     * the newly created account. The admin plugin's defaultRole is 'user', so
     * an admin who lands on /register (stale bookmark, the browser back
     * button, a mistyped URL) and submits it silently demotes themselves onto
     * a brand-new user-role account, losing their dashboard access with no
     * error shown.
     *
     * The (auth)/layout.tsx redirect is a UX guard only: under
     * `cacheComponents: true` a redirect() thrown inside a Suspense boundary
     * degrades to a 1-second `<meta http-equiv="refresh">`, so the form is
     * live and submittable in the meantime. This flag is the actual
     * enforcement. Trade-off: new users sign in after registering rather than
     * being logged straight in.
     */
    autoSignIn: false,
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
