'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  appointments: 'Appointments',
  sessions: 'Sessions',
  payments: 'Payments',
  products: 'Products',
  orders: 'Orders',
  contacts: 'Contacts',
  media: 'Media',
  analytics: 'Analytics',
  settings: 'Settings',
  'audit-log': 'Audit Log',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(segment: string): boolean {
  return UUID_PATTERN.test(segment);
}

export function DynamicBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items, skipping UUID-like segments
  const items: { label: string; href: string; isLast: boolean }[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    currentPath += `/${segment}`;

    // Skip UUID segments
    if (isUUID(segment)) continue;

    const label = ROUTE_LABELS[segment] ?? segment;
    items.push({
      label,
      href: currentPath,
      isLast: i === segments.length - 1,
    });
  }

  // If the last visible segment was not the actual last segment
  // (e.g., we skipped a trailing UUID), mark the last item as current
  if (items.length > 0) {
    items[items.length - 1]!.isLast = true;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={item.href}>
            {index > 0 && <BreadcrumbSeparator />}
            {item.isLast ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link href={item.href} />}>
                {item.label}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
