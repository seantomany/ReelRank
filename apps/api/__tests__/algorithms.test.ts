import { describe, it, expect } from 'vitest';
import {
  computeSimpleMajority,
  computeEloGroup,
  computeRankedChoice,
} from '@/lib/algorithms';
import type { Movie, RoomSwipe } from '@reelrank/shared';

function makeMovie(id: number, overrides?: Partial<Movie>): Movie {
  return {
    id,
    title: `Movie ${id}`,
    overview: 'Test movie',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-01-01',
    voteAverage: 7.0,
    voteCount: 1000,
    popularity: 50,
    genreIds: [28],
    ...overrides,
  };
}

function makeSwipe(userId: string, movieId: number, direction: 'left' | 'right'): RoomSwipe {
  return {
    id: `${userId}_${movieId}`,
    roomId: 'room1',
    userId,
    movieId,
    direction,
    createdAt: new Date(),
  };
}

describe('computeSimpleMajority', () => {
  it('ranks movies by majority approval', () => {
    const movies = [makeMovie(1), makeMovie(2), makeMovie(3)];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u2', 1, 'right'),
      makeSwipe('u3', 1, 'left'),
      makeSwipe('u1', 2, 'right'),
      makeSwipe('u2', 2, 'left'),
      makeSwipe('u3', 2, 'left'),
      makeSwipe('u1', 3, 'right'),
      makeSwipe('u2', 3, 'right'),
      makeSwipe('u3', 3, 'right'),
    ];

    const result = computeSimpleMajority(swipes, movies, 3);

    expect(result[0].movieId).toBe(3);
    expect(result[0].rightSwipes).toBe(3);
    expect(result[0].leftSwipes).toBe(0);
    expect(result[1].movieId).toBe(1);
    expect(result[2].movieId).toBe(2);
  });

  it('scores purely on vote percentage with no TMDB bonuses', () => {
    const movies = [
      makeMovie(1, { popularity: 100, voteAverage: 8.0 }),
      makeMovie(2, { popularity: 10, voteAverage: 5.0 }),
    ];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u1', 2, 'right'),
    ];

    const result = computeSimpleMajority(swipes, movies, 1);
    expect(result[0].popularityBonus).toBe(0);
    expect(result[0].ratingBonus).toBe(0);
    expect(result[0].finalScore).toBe(result[0].score);
    expect(result[0].finalScore).toBe(100);
  });

  it('handles empty swipes', () => {
    const movies = [makeMovie(1)];
    const result = computeSimpleMajority([], movies, 0);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0);
  });
});

describe('computeEloGroup', () => {
  it('gives higher ELO to universally liked movies', () => {
    const movies = [makeMovie(1), makeMovie(2)];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u1', 2, 'left'),
      makeSwipe('u2', 1, 'right'),
      makeSwipe('u2', 2, 'left'),
    ];

    const result = computeEloGroup(swipes, movies, 2);
    expect(result[0].movieId).toBe(1);
    expect(result[0].score).toBeGreaterThan(1500);
    expect(result[1].score).toBeLessThan(1500);
  });

  it('handles single voter', () => {
    const movies = [makeMovie(1), makeMovie(2)];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u1', 2, 'left'),
    ];

    const result = computeEloGroup(swipes, movies, 1);
    expect(result).toHaveLength(2);
    expect(result[0].movieId).toBe(1);
  });

  it('handles all same direction', () => {
    const movies = [makeMovie(1), makeMovie(2)];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u1', 2, 'right'),
    ];

    const result = computeEloGroup(swipes, movies, 1);
    expect(result).toHaveLength(2);
  });
});

describe('computeRankedChoice', () => {
  it('finds majority winner through elimination', () => {
    const movies = [makeMovie(1), makeMovie(2), makeMovie(3)];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u1', 2, 'right'),
      makeSwipe('u1', 3, 'left'),
      makeSwipe('u2', 2, 'right'),
      makeSwipe('u2', 3, 'right'),
      makeSwipe('u2', 1, 'left'),
      makeSwipe('u3', 1, 'right'),
      makeSwipe('u3', 3, 'right'),
      makeSwipe('u3', 2, 'left'),
    ];

    const result = computeRankedChoice(swipes, movies, 3);
    expect(result).toHaveLength(3);
    expect(result[0].finalScore).toBeGreaterThanOrEqual(result[1].finalScore);
  });

  it('handles ties by elimination order', () => {
    const movies = [makeMovie(1), makeMovie(2)];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u1', 2, 'left'),
      makeSwipe('u2', 2, 'right'),
      makeSwipe('u2', 1, 'left'),
    ];

    const result = computeRankedChoice(swipes, movies, 2);
    expect(result).toHaveLength(2);
  });

  it('includes movies with no votes', () => {
    const movies = [makeMovie(1), makeMovie(2), makeMovie(3)];
    const swipes: RoomSwipe[] = [
      makeSwipe('u1', 1, 'right'),
      makeSwipe('u1', 2, 'left'),
      makeSwipe('u1', 3, 'left'),
    ];

    const result = computeRankedChoice(swipes, movies, 1);
    expect(result).toHaveLength(3);
  });
});
