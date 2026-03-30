import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockPut = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

vi.mock('@vercel/blob', () => ({
  put: (...args: unknown[]) => mockPut(...args),
}));

function makeFormDataRequest(file?: File): Request {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('Upload API Route (direct)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session (unauthenticated)', async () => {
    mockGetCurrentSession.mockResolvedValue(null);

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for user role (non-admin)', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 400 when no file provided', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No file provided');
  });

  it('returns 400 for invalid file type', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest(file));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid file type');
  });

  it('returns 400 for file exceeding size limit', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    // Create a file > 10MB by providing size property
    const largeContent = new Uint8Array(11 * 1024 * 1024);
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest(file));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('File too large (max 10MB)');
  });

  it('returns 200 with blob URL on successful upload', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const file = new File(['imagedata'], 'photo.jpg', { type: 'image/jpeg' });
    mockPut.mockResolvedValue({
      url: 'https://blob.example.com/portfolio/photo-abc.jpg',
      pathname: 'portfolio/photo-abc.jpg',
    });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest(file));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe('https://blob.example.com/portfolio/photo-abc.jpg');
    expect(data.pathname).toBe('portfolio/photo-abc.jpg');
  });

  it('accepts admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const file = new File(['imagedata'], 'photo.png', { type: 'image/png' });
    mockPut.mockResolvedValue({ url: 'https://blob.example.com/x.png', pathname: 'x.png' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest(file));
    expect(response.status).toBe(200);
  });

  it('accepts super_admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'super_admin' } });
    const file = new File(['imagedata'], 'photo.webp', { type: 'image/webp' });
    mockPut.mockResolvedValue({ url: 'https://blob.example.com/x.webp', pathname: 'x.webp' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest(file));
    expect(response.status).toBe(200);
  });

  it('returns 500 when blob upload fails', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const file = new File(['imagedata'], 'photo.jpg', { type: 'image/jpeg' });
    mockPut.mockRejectedValue(new Error('Blob service unavailable'));

    const { POST } = await import('@/app/api/upload/route');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await POST(makeFormDataRequest(file));
    errorSpy.mockRestore();
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });

  it('accepts video/mp4 file type', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const file = new File(['videodata'], 'clip.mp4', { type: 'video/mp4' });
    mockPut.mockResolvedValue({ url: 'https://blob.example.com/x.mp4', pathname: 'x.mp4' });

    const { POST } = await import('@/app/api/upload/route');
    const response = await POST(makeFormDataRequest(file));
    expect(response.status).toBe(200);
  });
});
