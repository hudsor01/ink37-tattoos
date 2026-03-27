import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const {
  mockBetterAuth,
  mockSelectLimit,
  mockSetFn,
  mockUpdateWhere,
  mockInsertValues,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn().mockResolvedValue([]);
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockSetFn = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockInsertValues = vi.fn().mockResolvedValue(undefined);
  return {
    mockBetterAuth: vi.fn().mockReturnValue({
      api: { getSession: vi.fn() },
      handler: vi.fn(),
    }),
    mockSelectLimit,
    mockSetFn,
    mockUpdateWhere,
    mockInsertValues,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('pg', () => ({ Pool: vi.fn() }));
vi.mock('better-auth', () => ({ betterAuth: mockBetterAuth }));
vi.mock('better-auth/next-js', () => ({ nextCookies: vi.fn(() => ({})) }));
vi.mock('better-auth/plugins', () => ({ admin: vi.fn(() => ({})) }));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/env', () => ({
  env: () => ({
    BETTER_AUTH_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'test-secret-at-least-32-chars-long!',
  }),
}));
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockSelectLimit,
        })),
      })),
    })),
    update: vi.fn(() => ({ set: mockSetFn })),
    insert: vi.fn(() => ({ values: mockInsertValues })),
  },
}));
vi.mock('@/lib/db/schema', () => ({
  customer: { email: 'email', userId: 'userId', id: 'id' },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

describe('Auth databaseHooks - user.create.after', () => {
  let afterHook: (user: { id: string; email: string; name?: string }) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockSelectLimit.mockResolvedValue([]);
    mockInsertValues.mockResolvedValue(undefined);
    mockUpdateWhere.mockResolvedValue(undefined);
    mockSetFn.mockImplementation(() => ({ where: mockUpdateWhere }));

    // Import auth module and trigger Proxy -> getAuth() -> createAuth() -> betterAuth()
    const authModule = await import('@/lib/auth');
    void (authModule.auth as any).api;

    // Extract databaseHooks callback from captured betterAuth() call
    const config = mockBetterAuth.mock.calls[0]?.[0];
    afterHook = config?.databaseHooks?.user?.create?.after;
    expect(afterHook).toBeDefined();
  });

  it('links existing customer without userId', async () => {
    mockSelectLimit.mockResolvedValue([{ id: 'c1', email: 'user@test.com', userId: null }]);
    await afterHook({ id: 'u1', email: 'user@test.com' });
    expect(mockSetFn).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('creates new customer when no email match', async () => {
    mockSelectLimit.mockResolvedValue([]);
    await afterHook({ id: 'u1', email: 'new@test.com', name: 'John Smith' });
    expect(mockInsertValues).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Smith',
      email: 'new@test.com',
      userId: 'u1',
    });
  });

  it('parses single-word name correctly', async () => {
    mockSelectLimit.mockResolvedValue([]);
    await afterHook({ id: 'u1', email: 'madonna@test.com', name: 'Madonna' });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Madonna', lastName: '' }),
    );
  });

  it('defaults to "Client" when name is undefined', async () => {
    mockSelectLimit.mockResolvedValue([]);
    await afterHook({ id: 'u1', email: 'noname@test.com' });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Client', lastName: '' }),
    );
  });

  it('does nothing when customer already has userId', async () => {
    mockSelectLimit.mockResolvedValue([{ id: 'c1', email: 'user@test.com', userId: 'other-user' }]);
    await afterHook({ id: 'u1', email: 'user@test.com' });
    expect(mockSetFn).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('catches db select error without propagating', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSelectLimit.mockRejectedValue(new Error('DB connection failed'));
    await afterHook({ id: 'u1', email: 'error@test.com' });
    expect(errorSpy).toHaveBeenCalledWith(
      '[Auth Hook] Customer auto-link failed:',
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it('catches insert error without propagating', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSelectLimit.mockResolvedValue([]);
    mockInsertValues.mockRejectedValue(new Error('Insert failed'));
    await afterHook({ id: 'u1', email: 'fail@test.com', name: 'Test' });
    expect(errorSpy).toHaveBeenCalledWith(
      '[Auth Hook] Customer auto-link failed:',
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});
