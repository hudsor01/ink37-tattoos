import { describe, it, expect } from 'vitest';

describe('Audit logging', () => {
  it('logAudit function exists and catches errors (never throws)', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/audit.ts', 'utf-8');

    // Must export logAudit
    expect(content).toContain('export async function logAudit');

    // Must have try-catch to prevent throws
    expect(content).toContain('try {');
    expect(content).toContain('catch (error)');
    expect(content).toContain('console.error');
  });

  it('logAudit writes to db via Drizzle insert', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/audit.ts', 'utf-8');

    expect(content).toContain('db.insert(schema.auditLog)');
  });

  it('getAuditLogs returns entries ordered by timestamp desc', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/audit.ts', 'utf-8');

    // Exported as cache-wrapped const or async function
    const hasAsyncFn = content.includes('export async function getAuditLogs');
    const hasConstFn = content.includes('export const getAuditLogs');
    expect(hasAsyncFn || hasConstFn).toBe(true);
    expect(content).toContain('desc(schema.auditLog.timestamp)');
  });

  it('getAuditLogs enforces staff role', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/audit.ts', 'utf-8');

    expect(content).toContain('requireStaffRole');
  });

  it('audit.ts imports server-only', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/audit.ts', 'utf-8');
    expect(content).toContain("import 'server-only'");
  });

  it('all server actions call logAudit after mutations', async () => {
    const fs = await import('node:fs');

    const customerActions = fs.readFileSync('src/lib/actions/customer-actions.ts', 'utf-8');
    const appointmentActions = fs.readFileSync('src/lib/actions/appointment-actions.ts', 'utf-8');
    const sessionActions = fs.readFileSync('src/lib/actions/session-actions.ts', 'utf-8');
    const mediaActions = fs.readFileSync('src/lib/actions/media-actions.ts', 'utf-8');
    const settingsActions = fs.readFileSync('src/lib/actions/settings-actions.ts', 'utf-8');

    // All action files must import and call logAudit
    for (const [name, content] of [
      ['customer-actions', customerActions],
      ['appointment-actions', appointmentActions],
      ['session-actions', sessionActions],
      ['media-actions', mediaActions],
      ['settings-actions', settingsActions],
    ]) {
      expect(content, `${name} must import logAudit`).toContain("import { logAudit }");
      expect(content, `${name} must call logAudit`).toContain("logAudit({");
      expect(content, `${name} must use fire-and-forget`).toContain(".catch(() => {})");
    }
  });

  it('server actions validate input with Zod schemas', async () => {
    const fs = await import('node:fs');

    const customerActions = fs.readFileSync('src/lib/actions/customer-actions.ts', 'utf-8');
    expect(customerActions).toContain('CreateCustomerSchema');

    const appointmentActions = fs.readFileSync('src/lib/actions/appointment-actions.ts', 'utf-8');
    expect(appointmentActions).toContain('CreateAppointmentSchema');

    const sessionActions = fs.readFileSync('src/lib/actions/session-actions.ts', 'utf-8');
    expect(sessionActions).toContain('CreateSessionSchema');

    const settingsActions = fs.readFileSync('src/lib/actions/settings-actions.ts', 'utf-8');
    expect(settingsActions).toContain('UpdateSettingsSchema');
  });

  it('all server actions use "use server" directive', async () => {
    const fs = await import('node:fs');

    const files = [
      'src/lib/actions/customer-actions.ts',
      'src/lib/actions/appointment-actions.ts',
      'src/lib/actions/session-actions.ts',
      'src/lib/actions/media-actions.ts',
      'src/lib/actions/settings-actions.ts',
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content, `${file} must have 'use server' directive`).toContain("'use server'");
    }
  });
});
