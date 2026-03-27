import { connection } from 'next/server';
import { getAuditLogs } from '@/lib/dal/audit';
import { AuditLogClient } from './audit-log-client';

export default async function AuditLogPage() {
  await connection();
  const logs = await getAuditLogs({ limit: 50 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all administrative actions and changes.
        </p>
      </div>
      <AuditLogClient initialLogs={JSON.parse(JSON.stringify(logs))} />
    </div>
  );
}
