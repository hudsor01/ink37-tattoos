import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeCallbackUrl } from '@/lib/safe-callback';

/**
 * Portal-segment unauthorized boundary. The AuthGuard in
 * src/app/(portal)/layout.tsx (via requireAuthSession) handles
 * unauthenticated visitors with a direct redirect, so this boundary
 * is the defensive last-resort: if any nested server component or
 * DAL helper inside the portal tree throws via unauthorized()
 * (e.g. src/lib/dal/notifications.ts, src/lib/dal/orders.ts,
 * src/lib/dal/appointments.ts), this catches it and routes the
 * visitor through the auth flow rather than letting it fall through
 * to the root unauthorized.tsx (which renders a static "Sign in"
 * CTA — wrong UX for a portal user).
 *
 * Mirrors src/app/(dashboard)/unauthorized.tsx — the two segments
 * have the same defensive needs and only differ in fallback path.
 */
export default async function PortalUnauthorized() {
  const hdrs = await headers();
  const target = safeCallbackUrl(hdrs.get('x-pathname'), '/portal');
  redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
}
