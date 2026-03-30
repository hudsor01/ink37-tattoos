import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getSessionWithDetails } from '@/lib/dal/sessions';
import { Button } from '@/components/ui/button';
import { SessionDetailClient } from './session-detail-client';

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  await connection();
  const { id } = await params;
  const sessionData = await getSessionWithDetails(id);

  if (!sessionData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/sessions" />}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Session #{id.slice(0, 8)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {sessionData.customer.firstName} {sessionData.customer.lastName} &mdash;{' '}
          {new Date(sessionData.appointmentDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <SessionDetailClient session={sessionData} />
    </div>
  );
}
