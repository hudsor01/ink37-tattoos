import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockUpdateArtistProfile = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('@/lib/dal/artists', () => ({
  updateArtistProfile: (...args: unknown[]) => mockUpdateArtistProfile(...args),
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
const userSession = { user: { id: 'user-2', role: 'user', email: 'user@test.com' } };

const validProfileData = {
  name: 'Artist Name',
  email: 'artist@test.com',
  phone: '555-0100',
  bio: 'Experienced tattoo artist',
  specialties: ['Japanese', 'Blackwork'],
  hourlyRate: 150,
  profileImage: null,
  instagramHandle: '@ink37',
  yearsExperience: 10,
  isActive: true,
};

describe('Artist Profile Actions - updateArtistProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when no session (not admin)', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { updateArtistProfileAction } = await import('@/lib/actions/artist-profile-action');
    const result = await updateArtistProfileAction('artist-1', validProfileData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });

  it('returns error when user lacks admin role', async () => {
    mockGetCurrentSession.mockResolvedValue(userSession);
    const { updateArtistProfileAction } = await import('@/lib/actions/artist-profile-action');
    const result = await updateArtistProfileAction('artist-1', validProfileData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });

  it('returns validation error with invalid data', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { updateArtistProfileAction } = await import('@/lib/actions/artist-profile-action');
    const result = await updateArtistProfileAction('artist-1', {
      ...validProfileData,
      name: '', // too short
      email: 'not-an-email',
      hourlyRate: -10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
      expect(result.fieldErrors).toBeDefined();
    }
  });

  it('updates artist profile on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockUpdateArtistProfile.mockResolvedValue(undefined);
    const { updateArtistProfileAction } = await import('@/lib/actions/artist-profile-action');
    const result = await updateArtistProfileAction('artist-1', validProfileData);
    expect(result.success).toBe(true);
    expect(mockUpdateArtistProfile).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/profile');
  });
});
