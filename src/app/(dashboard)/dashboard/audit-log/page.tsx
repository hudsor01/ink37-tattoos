import { connection } from 'next/server';
import { getAuditLogs, getAuditLogUsers } from '@/lib/dal/audit';
import { AuditLogClient } from './audit-log-client';

interface AuditLogPageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    resource?: string;
    userId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  await connection();
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;

  const [logsResult, auditUsers] = await Promise.all([
    getAuditLogs({
      page,
      pageSize: 25,
      action: params.action || undefined,
      resource: params.resource || undefined,
      userId: params.userId || undefined,
      search: params.search || undefined,
      dateFrom,
      dateTo,
    }),
    getAuditLogUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all administrative actions and changes.
        </p>
      </div>
      <AuditLogClient
        logs={JSON.parse(JSON.stringify(logsResult.data))}
        total={logsResult.total}
        page={logsResult.page}
        pageSize={logsResult.pageSize}
        totalPages={logsResult.totalPages}
        auditUsers={JSON.parse(JSON.stringify(auditUsers))}
        filters={{
          action: params.action || '',
          resource: params.resource || '',
          userId: params.userId || '',
          search: params.search || '',
          dateFrom: params.dateFrom || '',
          dateTo: params.dateTo || '',
        }}
      />
    </div>
  );
}
