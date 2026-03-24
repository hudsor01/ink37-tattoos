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
  BLOB_PRIVATE_READ_WRITE_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;
export function env(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
