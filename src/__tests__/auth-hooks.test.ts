import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// Module-scope mocks (replaces vi.hoisted)
const mockSelectLimit = vi.fn().mockResolvedValue([]);
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockSetFn = vi.fn((_arg?: unknown) => ({ where: mockUpdateWhere }));
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockBetterAuth = vi.fn().mockReturnValue({
  api: { getSession: vi.fn() },
  handler: vi.fn(),
});

const mockLoggerError = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: mockLoggerError,
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('pg', () => ({ Pool: vi.fn() }));
vi.mock('better-auth', () => ({ betterAuth: (...args: unknown[]) => mockBetterAuth(...args) }));
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
          limit: (...args: unknown[]) => mockSelectLimit(...args),
        })),
      })),
    })),
    update: vi.fn(() => ({ set: (arg: unknown) => mockSetFn(arg) })),
    insert: vi.fn(() => ({ values: (arg: unknown) => mockInsertValues(arg) })),
  },
}));
vi.mock('@/lib/db/schema', () => ({
  customer: { email: 'email', userId: 'userId', id: 'id' },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

describe('Auth databaseHooks - user.create.after', () => {
  let afterHook: (user: { id: string; email: string; name?: string }) => Promise<void>;

  beforeAll(async () => {
    // Import auth module and trigger Proxy -> getAuth() -> createAuth() -> betterAuth()
    const authModule = await import('@/lib/auth');
    void (authModule.auth as any).api;

    // Extract databaseHooks callback from captured betterAuth() call
    const config = mockBetterAuth.mock.calls[0]?.[0];
    afterHook = config?.databaseHooks?.user?.create?.after;
    expect(afterHook).toBeDefined();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectLimit.mockResolvedValue([]);
    mockInsertValues.mockResolvedValue(undefined);
    mockUpdateWhere.mockResolvedValue(undefined);
    mockSetFn.mockImplementation(() => ({ where: mockUpdateWhere }));
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
    mockLoggerError.mockClear();
    mockSelectLimit.mockRejectedValue(new Error('DB connection failed'));
    await afterHook({ id: 'u1', email: 'error@test.com' });
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('auto-link failed'),
    );
  });

  it('catches insert error without propagating', async () => {
    mockLoggerError.mockClear();
    mockSelectLimit.mockResolvedValue([]);
    mockInsertValues.mockRejectedValue(new Error('Insert failed'));
    await afterHook({ id: 'u1', email: 'fail@test.com', name: 'Test' });
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('auto-link failed'),
    );
  });
});
