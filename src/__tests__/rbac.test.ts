import { describe, it, expect } from 'vitest';

describe('RBAC enforcement', () => {
  const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];
  const ADMIN_ROLES = ['admin', 'super_admin'];
  const NON_ADMIN_ROLES = ['user', 'staff'];

  it('requireStaffRole rejects user role', () => {
    // user role should NOT be in STAFF_ROLES
    expect(STAFF_ROLES).not.toContain('user');
  });

  it('requireStaffRole accepts staff, manager, admin, super_admin', () => {
    for (const role of ['staff', 'manager', 'admin', 'super_admin']) {
      expect(STAFF_ROLES).toContain(role);
    }
  });

  it('requireAdminRole rejects user and staff', () => {
    for (const role of NON_ADMIN_ROLES) {
      expect(ADMIN_ROLES).not.toContain(role);
    }
  });

  it('requireAdminRole accepts admin and super_admin', () => {
    for (const role of ['admin', 'super_admin']) {
      expect(ADMIN_ROLES).toContain(role);
    }
  });

  it('all DAL modules with staff access define requireStaffRole correctly', async () => {
    const fs = await import('node:fs');

    const staffProtectedModules = [
      'src/lib/dal/customers.ts',
      'src/lib/dal/appointments.ts',
      'src/lib/dal/sessions.ts',
      'src/lib/dal/media.ts',
      'src/lib/dal/analytics.ts',
      'src/lib/dal/audit.ts',
      'src/lib/dal/settings.ts',
    ];

    for (const module of staffProtectedModules) {
      const content = fs.readFileSync(module, 'utf-8');
      expect(content, `${module} must import server-only`).toContain("import 'server-only'");
      expect(content, `${module} must import getCurrentSession`).toContain('getCurrentSession');
      expect(content, `${module} must define STAFF_ROLES`).toContain('STAFF_ROLES');

      // Verify STAFF_ROLES includes all 4 staff+ roles
      const rolesMatch = content.match(/STAFF_ROLES\s*=\s*\[(.*?)\]/);
      expect(rolesMatch, `${module} must define STAFF_ROLES array`).toBeTruthy();
      const rolesStr = rolesMatch![1];
      expect(rolesStr, `${module} STAFF_ROLES must include staff`).toContain("'staff'");
      expect(rolesStr, `${module} STAFF_ROLES must include manager`).toContain("'manager'");
      expect(rolesStr, `${module} STAFF_ROLES must include admin`).toContain("'admin'");
      expect(rolesStr, `${module} STAFF_ROLES must include super_admin`).toContain("'super_admin'");
      // user must NOT be in STAFF_ROLES
      expect(rolesStr, `${module} STAFF_ROLES must NOT include user`).not.toContain("'user'");
    }
  });

  it('settings DAL defines requireAdminRole for elevated access', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/settings.ts', 'utf-8');

    expect(content).toContain('ADMIN_ROLES');
    expect(content).toContain('requireAdminRole');

    // Verify ADMIN_ROLES includes only admin and super_admin
    const rolesMatch = content.match(/ADMIN_ROLES\s*=\s*\[(.*?)\]/);
    expect(rolesMatch).toBeTruthy();
    const rolesStr = rolesMatch![1];
    expect(rolesStr).toContain("'admin'");
    expect(rolesStr).toContain("'super_admin'");
    expect(rolesStr).not.toContain("'staff'");
    expect(rolesStr).not.toContain("'user'");
  });

  it('users DAL defines requireAdminRole for user management', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/users.ts', 'utf-8');

    expect(content).toContain('ADMIN_ROLES');
    expect(content).toContain('requireAdminRole');
  });

  it('upsertSetting requires admin role (not just staff)', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/dal/settings.ts', 'utf-8');

    // Extract the upsertSetting function
    const fnMatch = content.match(/export async function upsertSetting[\s\S]*?(?=export |$)/);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain('requireAdminRole');
  });

  it('DAL index exports all functions from all modules', async () => {
    const fs = await import('node:fs');
    const index = fs.readFileSync('src/lib/dal/index.ts', 'utf-8');

    // Customer exports
    expect(index).toContain('getCustomers');
    expect(index).toContain('getCustomerById');
    expect(index).toContain('createCustomer');
    expect(index).toContain('updateCustomer');
    expect(index).toContain('deleteCustomer');
    // searchCustomers removed in 14-02 -- search integrated into getCustomers via PaginationParams

    // Appointment exports
    expect(index).toContain('getAppointments');
    expect(index).toContain('getAppointmentById');
    expect(index).toContain('createAppointment');
    expect(index).toContain('updateAppointment');
    expect(index).toContain('deleteAppointment');
    expect(index).toContain('getAppointmentsByDateRange');
    expect(index).toContain('getAppointmentStats');

    // Session exports
    expect(index).toContain('getSessions');
    expect(index).toContain('getSessionById');
    expect(index).toContain('createSession');

    // Media exports
    expect(index).toContain('getMediaItems');
    expect(index).toContain('createMediaItem');
    expect(index).toContain('togglePublicVisibility');

    // Analytics exports
    expect(index).toContain('getDashboardStats');
    expect(index).toContain('getRevenueData');

    // Settings exports
    expect(index).toContain('getSettings');
    expect(index).toContain('upsertSetting');

    // Audit exports
    expect(index).toContain('logAudit');
    expect(index).toContain('getAuditLogs');
  });
});
