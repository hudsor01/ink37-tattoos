import 'server-only';
import { drizzle, type NeonServerlessDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

let _db: NeonServerlessDatabase<typeof schema> | undefined;
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

export const db = new Proxy({} as NeonServerlessDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as Record<string | symbol, unknown>)[prop];
  },
});

export type Database = NeonServerlessDatabase<typeof schema>;

export * from './schema';
