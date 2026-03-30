import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Drizzle schema', () => {
  it('schema.ts is valid TypeScript (type-checks with project config)', { timeout: 30000 }, () => {
    // Type-check using the project tsconfig which includes skipLibCheck.
    // We run a full noEmit check -- the same check Next.js build uses.
    // Pre-existing errors in unmodified view files are expected;
    // we verify schema.ts specifically has no errors.
    const result = execSync(
      'npx tsc --noEmit --skipLibCheck 2>&1 || true',
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    // schema.ts must not appear in any error
    expect(result).not.toContain('src/lib/db/schema.ts');
  });

  it('schema exports expected tables', async () => {
    // Verify schema module can be imported and exports key tables
    const schema = await import('@/lib/db/schema');
    expect(schema.user).toBeDefined();
    expect(schema.customer).toBeDefined();
    expect(schema.appointment).toBeDefined();
    expect(schema.tattooSession).toBeDefined();
    expect(schema.payment).toBeDefined();
    expect(schema.tattooDesign).toBeDefined();
    expect(schema.product).toBeDefined();
    expect(schema.order).toBeDefined();
    expect(schema.giftCard).toBeDefined();
    expect(schema.contact).toBeDefined();
  });
});
