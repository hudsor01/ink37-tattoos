import 'server-only';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

let _db: NeonDatabase<typeof schema> | undefined;
export function getDb() {
  if (!_db) {
    _db = drizzle({
      connection: process.env.DATABASE_URL!,
      ws: ws,
      schema,
    });
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
