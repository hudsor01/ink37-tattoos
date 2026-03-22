'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Palette, CreditCard } from 'lucide-react';

const navItems = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard },
  { href: '/portal/appointments', label: 'Appointments', icon: Calendar },
  { href: '/portal/tattoos', label: 'My Tattoos', icon: Palette },
  { href: '/portal/payments', label: 'Payments', icon: CreditCard },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-5xl overflow-x-auto">
        <div className="flex min-w-max gap-1 px-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/portal' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
