import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

import { getCustomerWithDetails, getCustomerTimeline } from '@/lib/dal/customers';
import { Button } from '@/components/ui/button';
import { CustomerDetailClient } from './customer-detail-client';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  await connection();
  const { id } = await params;
  const [customer, timeline] = await Promise.all([
    getCustomerWithDetails(id),
    getCustomerTimeline(id),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/customers" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer since{' '}
            {format(new Date(customer.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <CustomerDetailClient
        customer={customer}
        timeline={timeline}
      />
    </div>
  );
}
