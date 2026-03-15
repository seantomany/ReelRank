import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockMovie } from './helpers';

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
      }),
    }),
  }),
  COLLECTIONS: {
    users: 'users',
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));

const mockSearchMovies = vi.fn();
const mockGetTrendingMovies = vi.fn();
const mockGetMovieById = vi.fn();
const mockGetGenres = vi.fn();
const mockDiscoverMovies = vi.fn();

vi.mock('@/lib/tmdb', () => ({
  searchMovies: (...args: unknown[]) => mockSearchMovies(...args),
  getTrendingMovies: (...args: unknown[]) => mockGetTrendingMovies(...args),
  getMovieById: (...args: unknown[]) => mockGetMovieById(...args),
  getGenres: (...args: unknown[]) => mockGetGenres(...args),
  discoverMovies: (...args: unknown[]) => mockDiscoverMovies(...args),
}));

describe('TMDB Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchMovies', () => {
    it('returns mapped movie results', async () => {
      const mockMovies = [createMockMovie(1), createMockMovie(2)];
      mockSearchMovies.mockResolvedValue({
        movies: mockMovies,
        page: 1,
        totalPages: 5,
        totalResults: 100,
      });

      const { searchMovies } = await import('@/lib/tmdb');
      const result = await searchMovies('test', 1);
      expect(result.movies).toHaveLength(2);
      expect(result.movies[0].id).toBe(1);
    });
  });

  describe('getTrendingMovies', () => {
    it('returns trending results', async () => {
      const mockMovies = [createMockMovie(10)];
      mockGetTrendingMovies.mockResolvedValue({
        movies: mockMovies,
        page: 1,
        totalPages: 10,
        totalResults: 200,
      });

      const { getTrendingMovies } = await import('@/lib/tmdb');
      const result = await getTrendingMovies(1);
      expect(result.movies).toHaveLength(1);
    });
  });

  describe('getMovieById', () => {
    it('returns a single movie', async () => {
      const movie = createMockMovie(42);
      mockGetMovieById.mockResolvedValue(movie);

      const { getMovieById } = await import('@/lib/tmdb');
      const result = await getMovieById(42);
      expect(result.id).toBe(42);
    });

    it('throws on invalid ID', async () => {
      mockGetMovieById.mockRejectedValue(new Error('TMDB API error: 404'));

      const { getMovieById } = await import('@/lib/tmdb');
      await expect(getMovieById(-1)).rejects.toThrow();
    });
  });

  describe('getGenres', () => {
    it('returns genre list', async () => {
      mockGetGenres.mockResolvedValue([
        { id: 28, name: 'Action' },
        { id: 35, name: 'Comedy' },
      ]);

      const { getGenres } = await import('@/lib/tmdb');
      const genres = await getGenres();
      expect(genres).toHaveLength(2);
      expect(genres[0].name).toBe('Action');
    });
  });
});

describe('Schema Validation', () => {
  it('validates MovieSearchQuery', async () => {
    const { MovieSearchQuerySchema } = await import('@reelrank/shared');

    const valid = MovieSearchQuerySchema.safeParse({ query: 'Inception', page: '1' });
    expect(valid.success).toBe(true);

    const noQuery = MovieSearchQuerySchema.safeParse({ query: '', page: '1' });
    expect(noQuery.success).toBe(false);

    const highPage = MovieSearchQuerySchema.safeParse({ query: 'test', page: '999' });
    expect(highPage.success).toBe(false);
  });

  it('validates TrendingPageSchema', async () => {
    const { TrendingPageSchema } = await import('@reelrank/shared');

    expect(TrendingPageSchema.safeParse('1').success).toBe(true);
    expect(TrendingPageSchema.safeParse('500').success).toBe(true);
    expect(TrendingPageSchema.safeParse('0').success).toBe(false);
    expect(TrendingPageSchema.safeParse('501').success).toBe(false);
    expect(TrendingPageSchema.safeParse('abc').success).toBe(false);
  });
});
