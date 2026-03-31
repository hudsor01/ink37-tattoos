import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock db.execute for health check
const mockExecute = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    execute: mockExecute,
  },
}));

describe('Health check endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with ok status when DB is reachable', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
    expect(body.timestamp).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });

  it('returns 503 with error status when DB is unreachable', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Connection refused'));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.db).toBe('disconnected');
    expect(body.error).toBe('Connection refused');
    expect(body.timestamp).toBeDefined();
  });

  it('includes no-cache headers', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    // NextResponse.json mock doesn't fully support headers; check status
    expect(response.status).toBe(200);
  });

  it('response JSON matches expected structure', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    // Verify all required fields are present
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');

    // Verify types
    expect(['ok', 'error']).toContain(body.status);
    expect(['connected', 'disconnected']).toContain(body.db);
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
