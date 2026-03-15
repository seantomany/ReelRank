import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUser } from './helpers';

const mockVerifyIdToken = vi.fn();
const mockGetAuth = vi.fn().mockReturnValue({ verifyIdToken: mockVerifyIdToken });

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdmin: vi.fn().mockReturnValue({ auth: { verifyIdToken: mockVerifyIdToken } }),
}));

const mockDocGet = vi.fn();
const mockDocSet = vi.fn();
const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet, set: mockDocSet });
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

vi.mock('@/lib/firestore', () => ({
  getDb: vi.fn().mockReturnValue({ collection: mockCollection }),
  COLLECTIONS: {
    users: 'users',
    soloSwipes: 'soloSwipes',
    pairwiseChoices: 'pairwiseChoices',
    watchedMovies: 'watchedMovies',
    rooms: 'rooms',
    roomMembers: (id: string) => `rooms/${id}/members`,
    roomMovies: (id: string) => `rooms/${id}/movies`,
    roomSwipes: (id: string) => `rooms/${id}/swipes`,
    roomResults: (id: string) => `rooms/${id}/results`,
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: vi.fn().mockResolvedValue(null),
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59 }),
}));

vi.mock('@/lib/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('@/lib/ably', () => ({
  publishToRoom: vi.fn().mockResolvedValue(undefined),
}));

describe('Auth - authenticateRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests without authorization header', async () => {
    const { authenticateRequest } = await import('@/lib/auth');
    const req = new Request('http://localhost/api/auth/verify', {
      method: 'POST',
    }) as any;

    await expect(authenticateRequest(req)).rejects.toThrow('Missing or invalid authorization header');
  });

  it('rejects requests with invalid token format', async () => {
    const { authenticateRequest } = await import('@/lib/auth');
    const req = new Request('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: 'InvalidFormat token123' },
    }) as any;

    await expect(authenticateRequest(req)).rejects.toThrow('Missing or invalid authorization header');
  });

  it('rejects expired or invalid tokens', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expired'));

    const { authenticateRequest } = await import('@/lib/auth');
    const req = new Request('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer expired-token' },
    }) as any;

    await expect(authenticateRequest(req)).rejects.toThrow('Invalid or expired token');
  });

  it('creates new user when not found in Firestore', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-uid-new',
      email: 'new@test.com',
      name: 'New User',
      picture: null,
    });
    mockDocGet.mockResolvedValueOnce({ exists: false });
    mockDocSet.mockResolvedValueOnce(undefined);

    const { authenticateRequest } = await import('@/lib/auth');
    const req = new Request('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    }) as any;

    const result = await authenticateRequest(req);
    expect(result.user.email).toBe('new@test.com');
    expect(result.user.displayName).toBe('New User');
    expect(mockDocSet).toHaveBeenCalledOnce();
  });

  it('returns existing user from Firestore', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-uid-1',
      email: 'test@test.com',
    });
    const existingUser = createMockUser();
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      id: 'firebase-uid-1',
      data: () => ({
        ...existingUser,
        createdAt: { toDate: () => existingUser.createdAt },
        updatedAt: { toDate: () => existingUser.updatedAt },
      }),
    });

    const { authenticateRequest } = await import('@/lib/auth');
    const req = new Request('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    }) as any;

    const result = await authenticateRequest(req);
    expect(result.user.email).toBe('test@test.com');
    expect(mockDocSet).not.toHaveBeenCalled();
  });
});
