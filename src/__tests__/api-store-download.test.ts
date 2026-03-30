import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockDownloadTokenFindFirst = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockBlobHead = vi.fn();
const mockFetch = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: () => ({
    BLOB_PRIVATE_READ_WRITE_TOKEN: 'test-blob-token',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  }),
}));

vi.mock('next/server', () => ({
  NextResponse: Object.assign(
    function NextResponseConstructor(body: unknown, init?: { headers?: Record<string, string> }) {
      return {
        status: 200,
        body,
        headers: new Map(Object.entries(init?.headers ?? {})),
      };
    },
    {
      json: (data: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => data,
      }),
    },
  ),
  NextRequest: class {
    url: string;
    nextUrl: { searchParams: URLSearchParams };
    constructor(url: string) {
      this.url = url;
      this.nextUrl = { searchParams: new URL(url).searchParams };
    }
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      downloadToken: {
        findFirst: (...args: unknown[]) => mockDownloadTokenFindFirst(...args),
      },
    },
    update: vi.fn(() => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return {
          where: (...wArgs: unknown[]) => {
            mockUpdateWhere(...wArgs);
            return Promise.resolve();
          },
        };
      },
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  downloadToken: {
    token: 'token',
    downloadCount: 'downloadCount',
    id: 'id',
  },
}));

vi.mock('@vercel/blob', () => ({
  head: (...args: unknown[]) => mockBlobHead(...args),
}));

// Helper to create request with URL search params
function makeRequest(token?: string): { nextUrl: { searchParams: URLSearchParams } } & Request {
  const url = token
    ? `http://localhost/api/store/download?token=${token}`
    : 'http://localhost/api/store/download';
  const req = new Request(url, { method: 'GET' });

  // Add nextUrl property like NextRequest
  return Object.assign(req, {
    nextUrl: { searchParams: new URL(url).searchParams },
  });
}

describe('Store Download API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup global fetch mock
    vi.stubGlobal('fetch', mockFetch);
  });

  it('returns 400 when token is missing', async () => {
    const { GET } = await import('@/app/api/store/download/route');
    const response = await GET(makeRequest() as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing token');
  });

  it('returns 404 when token is invalid (not found in database)', async () => {
    mockDownloadTokenFindFirst.mockResolvedValue(null);

    const { GET } = await import('@/app/api/store/download/route');
    const response = await GET(makeRequest('invalid-token') as never);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Invalid token');
  });

  it('returns 410 when download link has expired', async () => {
    mockDownloadTokenFindFirst.mockResolvedValue({
      token: 'expired-token',
      expiresAt: new Date('2020-01-01'),
      downloadCount: 0,
      maxDownloads: 5,
      orderItem: {
        product: { digitalFilePathname: '/path/to/file.png', digitalFileName: 'print.png' },
      },
    });

    const { GET } = await import('@/app/api/store/download/route');
    const response = await GET(makeRequest('expired-token') as never);
    expect(response.status).toBe(410);
    const data = await response.json();
    expect(data.error).toBe('Download link expired');
  });

  it('returns 410 when download limit is reached', async () => {
    mockDownloadTokenFindFirst.mockResolvedValue({
      token: 'maxed-token',
      expiresAt: new Date('2030-01-01'),
      downloadCount: 5,
      maxDownloads: 5,
      orderItem: {
        product: { digitalFilePathname: '/path/to/file.png', digitalFileName: 'print.png' },
      },
    });

    const { GET } = await import('@/app/api/store/download/route');
    const response = await GET(makeRequest('maxed-token') as never);
    expect(response.status).toBe(410);
    const data = await response.json();
    expect(data.error).toBe('Download limit reached');
  });

  it('returns 404 when digital file pathname is missing', async () => {
    mockDownloadTokenFindFirst.mockResolvedValue({
      token: 'valid-token',
      expiresAt: new Date('2030-01-01'),
      downloadCount: 0,
      maxDownloads: 5,
      orderItem: {
        product: { digitalFilePathname: null, digitalFileName: null },
      },
    });

    const { GET } = await import('@/app/api/store/download/route');
    const response = await GET(makeRequest('valid-token') as never);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Digital file not found');
  });

  it('returns 500 when blob fetch fails', async () => {
    mockDownloadTokenFindFirst.mockResolvedValue({
      token: 'valid-token',
      expiresAt: new Date('2030-01-01'),
      downloadCount: 0,
      maxDownloads: 5,
      orderItem: {
        product: { digitalFilePathname: '/path/file.png', digitalFileName: 'print.png' },
      },
    });
    mockBlobHead.mockResolvedValue({ url: 'https://blob.example.com/file.png', contentType: 'image/png' });
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const { GET } = await import('@/app/api/store/download/route');
    const response = await GET(makeRequest('valid-token') as never);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch file');
  });

  it('returns 500 when blob head throws error', async () => {
    mockDownloadTokenFindFirst.mockResolvedValue({
      token: 'valid-token',
      expiresAt: new Date('2030-01-01'),
      downloadCount: 0,
      maxDownloads: 5,
      orderItem: {
        product: { digitalFilePathname: '/path/file.png', digitalFileName: 'print.png' },
      },
    });
    mockBlobHead.mockRejectedValue(new Error('Blob service error'));

    const { GET } = await import('@/app/api/store/download/route');
    // Suppress console.error in test output
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await GET(makeRequest('valid-token') as never);
    errorSpy.mockRestore();
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to serve download');
  });
});
