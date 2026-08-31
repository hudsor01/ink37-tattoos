'use client';

import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function PortalHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/portal" className="text-lg font-bold tracking-tight">
          Ink 37
        </Link>
        <div className="flex items-center gap-3">
          {session?.user?.name && (
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              // Full page load is deliberate on SIGN OUT; router.push() would be a
              // privacy regression. The TanStack Query cache holds customers,
              // appointments, sessions, media and notifications, and nothing
              // clears it on sign-out -- a client-side nav would leave the
              // previous user's records in memory for whoever uses the browser
              // next. A document navigation destroys the query cache, the Next
              // router cache and all Zustand state in one step.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = '/login';
            }}
          >
            <LogOut className="mr-1.5 size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
