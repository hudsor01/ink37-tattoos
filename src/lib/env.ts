import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  CAL_API_KEY: z.string().optional(),
  NEXT_PUBLIC_CAL_USERNAME: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  VERCEL_BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
