import { describe, it, expect } from 'vitest';

describe('State management setup', () => {
  it('providers.tsx wraps with QueryClientProvider', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/components/providers.tsx', 'utf-8');
    expect(content).toContain('QueryClientProvider');
    expect(content).toContain('QueryClient');
    expect(content).toContain("'use client'");
  });

  it('ui-store.ts exports useUIStore with Zustand', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/stores/ui-store.ts', 'utf-8');
    expect(content).toContain("from 'zustand'");
    expect(content).toContain('useUIStore');
    expect(content).toContain('sidebarOpen');
  });

  it('root layout imports Providers', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/app/layout.tsx', 'utf-8');
    expect(content).toContain('Providers');
    expect(content).toContain("@/components/providers");
  });
});
