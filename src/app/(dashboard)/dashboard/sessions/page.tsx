import { getSessions } from '@/lib/dal/sessions';
import { SessionListClient } from './session-list-client';

export default async function SessionsPage() {
  const sessions = await getSessions();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Session Tracking</h1>
        <p className="text-muted-foreground">
          Manage tattoo sessions, pricing, and consent tracking.
        </p>
      </div>
      <SessionListClient initialSessions={JSON.parse(JSON.stringify(sessions))} />
    </div>
  );
}
