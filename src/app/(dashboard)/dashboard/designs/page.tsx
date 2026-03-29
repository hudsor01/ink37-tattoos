import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getDesignsByApprovalStatus } from '@/lib/dal/designs';
import { DesignsClient } from './designs-client';

export const metadata: Metadata = {
  title: 'Design Approvals | Ink 37 Admin',
};

interface DesignsPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    search?: string;
  }>;
}

export default async function DesignsPage({ searchParams }: DesignsPageProps) {
  await connection();
  const params = await searchParams;
  const status = (['pending', 'approved', 'all'] as const).includes(
    params.status as 'pending' | 'approved' | 'all'
  )
    ? (params.status as 'pending' | 'approved' | 'all')
    : 'pending';
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search ?? '';

  const designs = await getDesignsByApprovalStatus(status, {
    page,
    pageSize: 12,
    search: search || undefined,
  });

  const serialized = {
    ...designs,
    data: designs.data.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Design Approvals</h1>
        <p className="text-muted-foreground">
          Manage which designs appear in the public gallery.
        </p>
      </div>
      <DesignsClient
        designs={serialized}
        currentStatus={status}
        currentSearch={search}
      />
    </div>
  );
}
