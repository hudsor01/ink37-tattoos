import { describe, it, expect } from 'vitest';

// Test that DAL files import server-only (build-time boundary)
describe('DAL security boundary', () => {
  it('customers.ts imports server-only', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/customers.ts', 'utf-8');
    expect(content).toContain("import 'server-only'");
  });

  it('appointments.ts imports server-only', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/appointments.ts', 'utf-8');
    expect(content).toContain("import 'server-only'");
  });

  it('designs.ts imports server-only', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/designs.ts', 'utf-8');
    expect(content).toContain("import 'server-only'");
  });

  it('users.ts imports server-only', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/users.ts', 'utf-8');
    expect(content).toContain("import 'server-only'");
  });

  it('all protected DAL functions call getCurrentSession', async () => {
    const fs = await import('node:fs');
    const customersDal = fs.readFileSync('src/lib/dal/customers.ts', 'utf-8');
    const appointmentsDal = fs.readFileSync('src/lib/dal/appointments.ts', 'utf-8');
    const usersDal = fs.readFileSync('src/lib/dal/users.ts', 'utf-8');

    expect(customersDal).toContain('getCurrentSession');
    expect(appointmentsDal).toContain('getCurrentSession');
    expect(usersDal).toContain('getCurrentSession');
  });

  it('public designs function does NOT require auth', async () => {
    const fs = await import('node:fs');
    const designsDal = fs.readFileSync('src/lib/dal/designs.ts', 'utf-8');
    // getPublicDesigns should exist and not call requireStaffRole
    expect(designsDal).toContain('getPublicDesigns');
    // The function body between export const getPublicDesigns and the next export should not contain requireStaffRole
    const publicFnMatch = designsDal.match(/export const getPublicDesigns[\s\S]*?(?=export const|export async|$)/);
    expect(publicFnMatch).toBeTruthy();
    expect(publicFnMatch![0]).not.toContain('requireStaffRole');
    expect(publicFnMatch![0]).not.toContain('requireAdminRole');
  });

  it('DAL index re-exports all functions', async () => {
    const fs = await import('node:fs');
    const index = fs.readFileSync('src/lib/dal/index.ts', 'utf-8');
    expect(index).toContain('getCustomers');
    expect(index).toContain('getAppointments');
    expect(index).toContain('getPublicDesigns');
    expect(index).toContain('getUsers');
  });
});
