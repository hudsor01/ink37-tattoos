import 'server-only';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  ws: ws,
  schema,
});

export type Database = typeof db;

export * from './schema';
