import 'server-only';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';
import { logger } from '@/lib/logger';

let _db: NeonDatabase<typeof schema> | undefined;
export function getDb() {
  if (!_db) {
    // Construct the Pool here rather than letting drizzle() build one from a
    // connection string, so an 'error' listener can be attached. A pg-style
    // Pool is an EventEmitter: an unhandled 'error' becomes an uncaught
    // exception and kills the serverless instance. Over neon-serverless's
    // WebSocket transport, idle-connection drops are routine. See the longer
    // note in src/lib/auth.ts.
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    pool.on('error', (err: Error) => {
      logger.error({ err, component: 'drizzle-pool' }, 'Neon pool client error');
    });
    _db = drizzle({ client: pool, ws, schema });
  }
  return _db;
}

export const db = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Database = NeonDatabase<typeof schema>;

export * from './schema';
