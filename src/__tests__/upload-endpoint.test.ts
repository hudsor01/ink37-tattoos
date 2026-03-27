import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const { mockGetCurrentSession, mockHandleUpload } = vi.hoisted(() => ({
  mockGetCurrentSession: vi.fn(),
  mockHandleUpload: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: mockGetCurrentSession,
}));

vi.mock('@vercel/blob/client', () => ({
  handleUpload: (...args: unknown[]) => mockHandleUpload(...args),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

function makeRequest(body: object = {}): Request {
  return new Request('http://localhost/api/upload/token', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('Upload Token Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 400 when handleUpload throws', async () => {
    mockHandleUpload.mockRejectedValue(new Error('Unauthorized'));
    const { POST } = await import('@/app/api/upload/token/route');
    const response = await POST(makeRequest());
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('rejects unauthenticated users (no session)', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    // Capture onBeforeGenerateToken callback
    let capturedCallback: (() => Promise<unknown>) | null = null;
    mockHandleUpload.mockImplementation(async (opts: { onBeforeGenerateToken: () => Promise<unknown> }) => {
      capturedCallback = opts.onBeforeGenerateToken;
      return await opts.onBeforeGenerateToken();
    });
    const { POST } = await import('@/app/api/upload/token/route');
    // handleUpload will call onBeforeGenerateToken which should throw
    const response = await POST(makeRequest());
    expect(response.status).toBe(400);
    expect(capturedCallback).not.toBeNull();
  });

  it('rejects user role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    mockHandleUpload.mockImplementation(async (opts: { onBeforeGenerateToken: () => Promise<unknown> }) => {
      return await opts.onBeforeGenerateToken();
    });
    const { POST } = await import('@/app/api/upload/token/route');
    const response = await POST(makeRequest());
    expect(response.status).toBe(400);
  });

  it('accepts staff role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'staff' } });
    let tokenResult: unknown = null;
    mockHandleUpload.mockImplementation(async (opts: { onBeforeGenerateToken: () => Promise<unknown> }) => {
      tokenResult = await opts.onBeforeGenerateToken();
      return { success: true };
    });
    const { POST } = await import('@/app/api/upload/token/route');
    await POST(makeRequest());
    expect(tokenResult).toBeDefined();
    expect((tokenResult as { allowedContentTypes: string[] }).allowedContentTypes).toBeDefined();
  });

  it('accepts admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    let tokenResult: unknown = null;
    mockHandleUpload.mockImplementation(async (opts: { onBeforeGenerateToken: () => Promise<unknown> }) => {
      tokenResult = await opts.onBeforeGenerateToken();
      return { success: true };
    });
    const { POST } = await import('@/app/api/upload/token/route');
    await POST(makeRequest());
    expect(tokenResult).toBeDefined();
  });

  it('accepts super_admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'super_admin' } });
    let tokenResult: unknown = null;
    mockHandleUpload.mockImplementation(async (opts: { onBeforeGenerateToken: () => Promise<unknown> }) => {
      tokenResult = await opts.onBeforeGenerateToken();
      return { success: true };
    });
    const { POST } = await import('@/app/api/upload/token/route');
    await POST(makeRequest());
    expect(tokenResult).toBeDefined();
  });

  it('returns correct allowedContentTypes', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'staff' } });
    let tokenResult: unknown = null;
    mockHandleUpload.mockImplementation(async (opts: { onBeforeGenerateToken: () => Promise<unknown> }) => {
      tokenResult = await opts.onBeforeGenerateToken();
      return { success: true };
    });
    const { POST } = await import('@/app/api/upload/token/route');
    await POST(makeRequest());
    const result = tokenResult as { allowedContentTypes: string[]; maximumSizeInBytes: number; tokenPayload: string };
    expect(result.allowedContentTypes).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4']);
    expect(result.maximumSizeInBytes).toBe(10 * 1024 * 1024);
    expect(JSON.parse(result.tokenPayload)).toEqual({ userId: 'u1' });
  });
});
