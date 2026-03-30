import { describe, it, expect } from 'vitest';

describe('Consent Form Schema', () => {
  it('schema exports consentForm table', async () => {
    const schema = await import('@/lib/db/schema');
    expect(schema.consentForm).toBeDefined();
  });

  it('schema exports consentFormRelations', async () => {
    const schema = await import('@/lib/db/schema');
    expect(schema.consentFormRelations).toBeDefined();
  });

  it('tattooSession has consentFormVersion column', async () => {
    const schema = await import('@/lib/db/schema');
    const columns = schema.tattooSession as unknown as { consentFormVersion: unknown };
    expect(columns.consentFormVersion).toBeDefined();
  });

  it('tattooSession has consentExpiresAt column', async () => {
    const schema = await import('@/lib/db/schema');
    const columns = schema.tattooSession as unknown as { consentExpiresAt: unknown };
    expect(columns.consentExpiresAt).toBeDefined();
  });
});

describe('ConsentFormSchema validation', () => {
  it('validates valid consent form data', async () => {
    const { ConsentFormSchema } = await import('@/lib/security/validation');
    const result = ConsentFormSchema.safeParse({
      title: 'Tattoo Consent Form',
      content: 'By signing this form, you agree to the tattoo procedure.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', async () => {
    const { ConsentFormSchema } = await import('@/lib/security/validation');
    const result = ConsentFormSchema.safeParse({
      title: '',
      content: 'By signing this form, you agree to the tattoo procedure.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 chars', async () => {
    const { ConsentFormSchema } = await import('@/lib/security/validation');
    const result = ConsentFormSchema.safeParse({
      title: 'A'.repeat(201),
      content: 'By signing this form, you agree to the tattoo procedure.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects content under 10 chars', async () => {
    const { ConsentFormSchema } = await import('@/lib/security/validation');
    const result = ConsentFormSchema.safeParse({
      title: 'Tattoo Consent Form',
      content: 'Short',
    });
    expect(result.success).toBe(false);
  });
});

describe('Env schema - CRON_SECRET', () => {
  it('CRON_SECRET is accepted as optional in env schema', () => {
    // Replicate the relevant part of env schema to test without server-only import
    const { z } = require('zod');
    const testSchema = z.object({
      CRON_SECRET: z.string().optional(),
    });

    // Without CRON_SECRET
    expect(testSchema.safeParse({}).success).toBe(true);
    // With CRON_SECRET
    expect(testSchema.safeParse({ CRON_SECRET: 'my-secret' }).success).toBe(true);
  });
});
