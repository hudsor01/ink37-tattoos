import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate the schema here to test without server-only import
const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  CAL_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

describe('Environment validation', () => {
  it('passes with valid env vars', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'https://db.neon.tech/ink37',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    expect(result.success).toBe(true);
  });

  it('fails when DATABASE_URL is missing', () => {
    const result = envSchema.safeParse({
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    expect(result.success).toBe(false);
  });

  it('fails when BETTER_AUTH_SECRET is too short', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'https://db.neon.tech/ink37',
      BETTER_AUTH_SECRET: 'short',
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    expect(result.success).toBe(false);
  });
});
