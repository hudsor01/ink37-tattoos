import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockCreateAppointment = vi.fn();
const mockUpdateAppointment = vi.fn();
const mockDeleteAppointment = vi.fn();
const mockCheckSchedulingConflict = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('@/lib/dal/appointments', () => ({
  createAppointment: (...args: unknown[]) => mockCreateAppointment(...args),
  updateAppointment: (...args: unknown[]) => mockUpdateAppointment(...args),
  deleteAppointment: (...args: unknown[]) => mockDeleteAppointment(...args),
  checkSchedulingConflict: (...args: unknown[]) => mockCheckSchedulingConflict(...args),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}));

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };
const TEST_CUSTOMER_UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Appointment Actions - createAppointmentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { createAppointmentAction } = await import('@/lib/actions/appointment-actions');
    const formData = new FormData();
    formData.set('customerId', TEST_CUSTOMER_UUID);
    formData.set('scheduledDate', '2026-04-01T10:00:00.000Z');
    formData.set('type', 'TATTOO_SESSION');
    formData.set('firstName', 'John');
    formData.set('lastName', 'Doe');
    formData.set('email', 'john@test.com');
    await expect(createAppointmentAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('throws validation error with invalid data', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { createAppointmentAction } = await import('@/lib/actions/appointment-actions');
    const formData = new FormData();
    formData.set('customerId', 'not-a-uuid');
    formData.set('scheduledDate', 'bad-date');
    formData.set('type', 'INVALID_TYPE');
    formData.set('firstName', '');
    formData.set('lastName', '');
    formData.set('email', 'not-email');
    await expect(createAppointmentAction(formData)).rejects.toThrow();
  });

  it('returns scheduling conflict error', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockCheckSchedulingConflict.mockResolvedValue(true);
    const { createAppointmentAction } = await import('@/lib/actions/appointment-actions');
    const formData = new FormData();
    formData.set('customerId', TEST_CUSTOMER_UUID);
    formData.set('scheduledDate', '2026-04-01T10:00:00.000Z');
    formData.set('type', 'TATTOO_SESSION');
    formData.set('firstName', 'John');
    formData.set('lastName', 'Doe');
    formData.set('email', 'john@test.com');
    const result = await createAppointmentAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('SCHEDULING_CONFLICT');
    }
  });

  it('creates appointment on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockCheckSchedulingConflict.mockResolvedValue(false);
    mockCreateAppointment.mockResolvedValue({ id: 'appt-1' });
    const { createAppointmentAction } = await import('@/lib/actions/appointment-actions');
    const formData = new FormData();
    formData.set('customerId', TEST_CUSTOMER_UUID);
    formData.set('scheduledDate', '2026-04-01T10:00:00.000Z');
    formData.set('type', 'TATTOO_SESSION');
    formData.set('firstName', 'John');
    formData.set('lastName', 'Doe');
    formData.set('email', 'john@test.com');
    const result = await createAppointmentAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'appt-1' });
    }
    expect(mockCreateAppointment).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/appointments');
  });
});

describe('Appointment Actions - updateAppointmentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { updateAppointmentAction } = await import('@/lib/actions/appointment-actions');
    const formData = new FormData();
    formData.set('status', 'CONFIRMED');
    await expect(updateAppointmentAction('appt-1', formData)).rejects.toThrow('Unauthorized');
  });

  it('updates appointment on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockUpdateAppointment.mockResolvedValue({ id: 'appt-1' });
    const { updateAppointmentAction } = await import('@/lib/actions/appointment-actions');
    const formData = new FormData();
    formData.set('status', 'CONFIRMED');
    const result = await updateAppointmentAction('appt-1', formData);
    expect(result.success).toBe(true);
    expect(mockUpdateAppointment).toHaveBeenCalledTimes(1);
  });
});

describe('Appointment Actions - deleteAppointmentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { deleteAppointmentAction } = await import('@/lib/actions/appointment-actions');
    await expect(deleteAppointmentAction('appt-1')).rejects.toThrow('Unauthorized');
  });

  it('deletes appointment on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockDeleteAppointment.mockResolvedValue(undefined);
    const { deleteAppointmentAction } = await import('@/lib/actions/appointment-actions');
    await deleteAppointmentAction('appt-1');
    expect(mockDeleteAppointment).toHaveBeenCalledWith('appt-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/appointments');
  });
});
