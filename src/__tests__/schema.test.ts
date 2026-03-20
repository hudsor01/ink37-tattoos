import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Prisma schema', () => {
  it('validates without errors', () => {
    const result = execSync('npx prisma validate', { encoding: 'utf-8' });
    expect(result).toContain('valid');
  });

  it('generates client without errors', () => {
    expect(() => {
      execSync('npx prisma generate', { encoding: 'utf-8', stdio: 'pipe' });
    }).not.toThrow();
  });
});
