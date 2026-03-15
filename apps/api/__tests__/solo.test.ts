import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SoloSwipeInputSchema,
  PairwiseChoiceInputSchema,
  WatchedMovieInputSchema,
  ELO_INITIAL_RATING,
  ELO_K_FACTOR,
} from '@reelrank/shared';

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdmin: vi.fn().mockReturnValue({
    auth: { verifyIdToken: vi.fn() },
  }),
}));

vi.mock('@/lib/firestore', () => ({
  getDb: vi.fn().mockReturnValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn(),
        update: vi.fn(),
      }),
      add: vi.fn().mockResolvedValue({ id: 'new-id' }),
      get: vi.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }),
  }),
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
}));

vi.mock('@/lib/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('@/lib/ably', () => ({
  publishToRoom: vi.fn(),
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieById: vi.fn().mockResolvedValue({
    id: 1,
    title: 'Test Movie',
    overview: 'A test movie',
    posterPath: '/test.jpg',
    backdropPath: '/backdrop.jpg',
    releaseDate: '2024-01-01',
    voteAverage: 7.5,
    voteCount: 1000,
    popularity: 85,
    genreIds: [28],
  }),
}));

describe('Solo Swipe Schema', () => {
  it('accepts valid swipe input', () => {
    const result = SoloSwipeInputSchema.safeParse({ movieId: 123, direction: 'right' });
    expect(result.success).toBe(true);
  });

  it('rejects negative movieId', () => {
    const result = SoloSwipeInputSchema.safeParse({ movieId: -1, direction: 'right' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid direction', () => {
    const result = SoloSwipeInputSchema.safeParse({ movieId: 1, direction: 'up' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer movieId', () => {
    const result = SoloSwipeInputSchema.safeParse({ movieId: 1.5, direction: 'left' });
    expect(result.success).toBe(false);
  });
});

describe('Pairwise Choice Schema', () => {
  it('accepts valid pairwise input', () => {
    const result = PairwiseChoiceInputSchema.safeParse({
      movieAId: 1,
      movieBId: 2,
      chosenId: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects when chosenId is not A or B', () => {
    const result = PairwiseChoiceInputSchema.safeParse({
      movieAId: 1,
      movieBId: 2,
      chosenId: 3,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when movieAId equals movieBId', () => {
    const result = PairwiseChoiceInputSchema.safeParse({
      movieAId: 1,
      movieBId: 1,
      chosenId: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('Watched Movie Schema', () => {
  it('accepts valid watched movie input', () => {
    const result = WatchedMovieInputSchema.safeParse({
      movieId: 1,
      rating: 8,
      watchedAt: '2024-03-15',
      venue: 'AMC Theater',
    });
    expect(result.success).toBe(true);
  });

  it('rejects rating out of range', () => {
    expect(
      WatchedMovieInputSchema.safeParse({
        movieId: 1,
        rating: 0,
        watchedAt: '2024-03-15',
        venue: 'Theater',
      }).success,
    ).toBe(false);

    expect(
      WatchedMovieInputSchema.safeParse({
        movieId: 1,
        rating: 11,
        watchedAt: '2024-03-15',
        venue: 'Theater',
      }).success,
    ).toBe(false);
  });

  it('accepts optional notes', () => {
    const result = WatchedMovieInputSchema.safeParse({
      movieId: 1,
      rating: 7,
      watchedAt: '2024-03-15',
      venue: 'Home',
      notes: 'Great movie!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes over 500 chars', () => {
    const result = WatchedMovieInputSchema.safeParse({
      movieId: 1,
      rating: 7,
      watchedAt: '2024-03-15',
      venue: 'Home',
      notes: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('ELO Rating Computation', () => {
  function computeEloRatings(
    choices: { movieAId: number; movieBId: number; chosenId: number }[],
  ): Map<number, number> {
    const ratings = new Map<number, number>();
    const getOrInit = (id: number) => {
      if (!ratings.has(id)) ratings.set(id, ELO_INITIAL_RATING);
      return ratings.get(id)!;
    };

    for (const choice of choices) {
      const rA = getOrInit(choice.movieAId);
      const rB = getOrInit(choice.movieBId);
      const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
      const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));
      const sA = choice.chosenId === choice.movieAId ? 1 : 0;
      const sB = 1 - sA;
      ratings.set(choice.movieAId, rA + ELO_K_FACTOR * (sA - eA));
      ratings.set(choice.movieBId, rB + ELO_K_FACTOR * (sB - eB));
    }

    return ratings;
  }

  it('winner gains rating and loser loses', () => {
    const ratings = computeEloRatings([
      { movieAId: 1, movieBId: 2, chosenId: 1 },
    ]);
    expect(ratings.get(1)!).toBeGreaterThan(ELO_INITIAL_RATING);
    expect(ratings.get(2)!).toBeLessThan(ELO_INITIAL_RATING);
  });

  it('ratings are zero-sum', () => {
    const ratings = computeEloRatings([
      { movieAId: 1, movieBId: 2, chosenId: 1 },
    ]);
    const totalChange = (ratings.get(1)! - ELO_INITIAL_RATING) + (ratings.get(2)! - ELO_INITIAL_RATING);
    expect(Math.abs(totalChange)).toBeLessThan(0.001);
  });

  it('repeated wins lead to divergent ratings', () => {
    const ratings = computeEloRatings([
      { movieAId: 1, movieBId: 2, chosenId: 1 },
      { movieAId: 1, movieBId: 2, chosenId: 1 },
      { movieAId: 1, movieBId: 2, chosenId: 1 },
    ]);
    expect(ratings.get(1)! - ratings.get(2)!).toBeGreaterThan(80);
  });

  it('handles multiple movies', () => {
    const ratings = computeEloRatings([
      { movieAId: 1, movieBId: 2, chosenId: 1 },
      { movieAId: 2, movieBId: 3, chosenId: 2 },
      { movieAId: 1, movieBId: 3, chosenId: 1 },
    ]);

    const sorted = Array.from(ratings.entries()).sort((a, b) => b[1] - a[1]);
    expect(sorted[0][0]).toBe(1);
    expect(sorted[sorted.length - 1][0]).toBe(3);
  });

  it('handles no choices', () => {
    const ratings = computeEloRatings([]);
    expect(ratings.size).toBe(0);
  });
});
