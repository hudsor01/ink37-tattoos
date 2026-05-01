import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeCallbackUrl } from '@/lib/safe-callback';

/**
 * Dashboard-segment unauthorized boundary. The AuthGuard in
 * src/app/(dashboard)/layout.tsx now handles unauthenticated visitors
 * with a direct redirect, so this boundary is a defensive last-resort:
 * if any nested server component or DAL helper inside the dashboard
 * tree throws via unauthorized(), this catches it and routes the user
 * through the auth flow rather than letting the throw bubble to the
 * Suspense boundary as a 500.
 *
 * We read x-pathname (set by proxy.ts) so the user lands back on the
 * page they tried to visit after signing in. safeCallbackUrl filters
 * out the open-redirect / login-loop edge cases and falls back to the
 * dashboard root.
 */
export default async function DashboardUnauthorized() {
  const hdrs = await headers();
  const target = safeCallbackUrl(hdrs.get('x-pathname'), '/dashboard');
  redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
}
