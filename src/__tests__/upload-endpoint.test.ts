import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks (replaces vi.hoisted)
const mockGetCurrentSession = vi.fn();
const mockHandleUpload = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
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
  });

  it('rejects unauthenticated users (no session)', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/upload/token/route');
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('rejects user role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    const { POST } = await import('@/app/api/upload/token/route');
    const response = await POST(makeRequest());
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 500 when handleUpload throws', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    mockHandleUpload.mockRejectedValue(new Error('Upload failed'));
    const { POST } = await import('@/app/api/upload/token/route');
    const response = await POST(makeRequest());
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
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
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
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
