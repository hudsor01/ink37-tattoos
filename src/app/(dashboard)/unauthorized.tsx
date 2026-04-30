import { redirect } from 'next/navigation';

/**
 * Dashboard-segment unauthorized boundary. AuthGuard in
 * src/app/(dashboard)/layout.tsx calls unauthorized() when there is no
 * session; Next walks up looking for the nearest unauthorized.tsx and
 * the root one is fine, but anchoring it inside the segment makes the
 * resolution local and avoids any rendering-tree edge case.
 *
 * We redirect to /login with a callbackUrl so the user lands back on
 * the dashboard after signing in. (Returning a static 401 page also
 * works, but for an admin-only segment a forced login is the obvious
 * UX.)
 */
export default function DashboardUnauthorized() {
  redirect('/login?callbackUrl=/dashboard');
}
