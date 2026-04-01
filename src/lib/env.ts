import 'server-only';
import { z } from 'zod';

// Optional field that silently falls back to undefined on bad values
// (prevents a single misconfigured optional var from crashing the app)
const optionalUrl = z.string().url().optional().catch(undefined);
const optionalEmail = z.string().email().optional().catch(undefined);

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  CAL_API_KEY: z.string().optional(),
  NEXT_PUBLIC_CAL_USERNAME: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: optionalEmail,
  VERCEL_BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_PRIVATE_READ_WRITE_TOKEN: z.string().min(1),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  CAL_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;
export function env(): Env {
  if (!_env) {
    // Strip empty strings → undefined so Zod .optional() works correctly
    // (Vercel sets unset optional vars to "" instead of leaving them undefined)
    const cleaned = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== '')
    );
    _env = envSchema.parse(cleaned);
  }
  return _env;
}
