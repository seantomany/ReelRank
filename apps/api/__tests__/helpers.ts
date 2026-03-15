import { vi } from 'vitest';

export function createMockFirestore() {
  const mockDoc = (data: Record<string, unknown> | null = null) => ({
    exists: data !== null,
    id: data?.id ?? 'mock-doc-id',
    data: () => data,
    ref: { id: data?.id ?? 'mock-doc-id' },
  });

  const mockQuerySnapshot = (docs: Array<{ id: string; data: Record<string, unknown> }> = []) => ({
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
      ref: { id: d.id },
    })),
  });

  const docRef = {
    get: vi.fn().mockResolvedValue(mockDoc(null)),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const collectionRef = {
    doc: vi.fn().mockReturnValue(docRef),
    add: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    get: vi.fn().mockResolvedValue(mockQuerySnapshot()),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  const db = {
    collection: vi.fn().mockReturnValue(collectionRef),
  };

  return { db, collectionRef, docRef, mockDoc, mockQuerySnapshot };
}

export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    firebaseUid: 'firebase-uid-1',
    email: 'test@test.com',
    displayName: 'Test User',
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockMovie(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Movie ${id}`,
    overview: `Overview for movie ${id}`,
    posterPath: `/poster${id}.jpg`,
    backdropPath: `/backdrop${id}.jpg`,
    releaseDate: '2024-01-15',
    voteAverage: 7.5,
    voteCount: 1000,
    popularity: 85,
    genreIds: [28, 12],
    ...overrides,
  };
}
