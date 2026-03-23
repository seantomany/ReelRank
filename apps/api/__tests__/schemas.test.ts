import { describe, it, expect } from 'vitest';
import {
  SoloSwipeInputSchema,
  PairwiseChoiceInputSchema,
  CreateRoomInputSchema,
  JoinRoomInputSchema,
  SubmitMovieInputSchema,
  RoomSwipeInputSchema,
  StartRoomInputSchema,
  MovieSearchQuerySchema,
  ListTypeSchema,
  WatchedMovieInputSchema,
  RoomCodeSchema,
  TrendingPageSchema,
} from '@reelrank/shared';

describe('SoloSwipeInputSchema', () => {
  it('accepts valid swipe', () => {
    const result = SoloSwipeInputSchema.safeParse({ movieId: 123, direction: 'right' });
    expect(result.success).toBe(true);
  });

  it('rejects negative movieId', () => {
    const result = SoloSwipeInputSchema.safeParse({ movieId: -1, direction: 'right' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid direction', () => {
    const result = SoloSwipeInputSchema.safeParse({ movieId: 123, direction: 'up' });
    expect(result.success).toBe(false);
  });
});

describe('PairwiseChoiceInputSchema', () => {
  it('accepts valid choice where chosenId matches movieAId', () => {
    const result = PairwiseChoiceInputSchema.safeParse({
      movieAId: 1, movieBId: 2, chosenId: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects chosenId that does not match either movie', () => {
    const result = PairwiseChoiceInputSchema.safeParse({
      movieAId: 1, movieBId: 2, chosenId: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateRoomInputSchema', () => {
  it('defaults algorithmVersion to simple_majority_v1', () => {
    const result = CreateRoomInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.algorithmVersion).toBe('simple_majority_v1');
    }
  });

  it('accepts explicit algorithm', () => {
    const result = CreateRoomInputSchema.safeParse({ algorithmVersion: 'elo_group_v1' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown algorithm', () => {
    const result = CreateRoomInputSchema.safeParse({ algorithmVersion: 'unknown' });
    expect(result.success).toBe(false);
  });
});

describe('RoomCodeSchema', () => {
  it('accepts valid 6-char alphanumeric', () => {
    expect(RoomCodeSchema.safeParse('ABC123').success).toBe(true);
  });

  it('rejects lowercase', () => {
    expect(RoomCodeSchema.safeParse('abc123').success).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(RoomCodeSchema.safeParse('ABC').success).toBe(false);
    expect(RoomCodeSchema.safeParse('ABCDEFGH').success).toBe(false);
  });
});

describe('JoinRoomInputSchema', () => {
  it('accepts valid code', () => {
    const result = JoinRoomInputSchema.safeParse({ code: 'ABC123' });
    expect(result.success).toBe(true);
  });
});

describe('SubmitMovieInputSchema', () => {
  it('accepts valid movieId', () => {
    const result = SubmitMovieInputSchema.safeParse({ movieId: 550 });
    expect(result.success).toBe(true);
  });
});

describe('RoomSwipeInputSchema', () => {
  it('accepts valid room swipe', () => {
    const result = RoomSwipeInputSchema.safeParse({ movieId: 550, direction: 'left' });
    expect(result.success).toBe(true);
  });
});

describe('StartRoomInputSchema', () => {
  it('accepts submitting phase', () => {
    const result = StartRoomInputSchema.safeParse({ phase: 'submitting' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid phase', () => {
    const result = StartRoomInputSchema.safeParse({ phase: 'results' });
    expect(result.success).toBe(false);
  });
});

describe('MovieSearchQuerySchema', () => {
  it('accepts valid query', () => {
    const result = MovieSearchQuerySchema.safeParse({ query: 'Batman', page: '2' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
    }
  });

  it('defaults page to 1', () => {
    const result = MovieSearchQuerySchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it('rejects empty query', () => {
    const result = MovieSearchQuerySchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });
});

describe('ListTypeSchema', () => {
  it('accepts want', () => {
    expect(ListTypeSchema.safeParse('want').success).toBe(true);
  });

  it('accepts pass', () => {
    expect(ListTypeSchema.safeParse('pass').success).toBe(true);
  });

  it('rejects other values', () => {
    expect(ListTypeSchema.safeParse('all').success).toBe(false);
  });
});

describe('TrendingPageSchema', () => {
  it('coerces string page to number', () => {
    const result = TrendingPageSchema.safeParse({ page: '3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });
});

describe('WatchedMovieInputSchema', () => {
  it('accepts valid watched movie', () => {
    const result = WatchedMovieInputSchema.safeParse({
      movieId: 550,
      rating: 8,
      watchedAt: '2024-06-15',
      venue: 'Theater',
    });
    expect(result.success).toBe(true);
  });

  it('accepts with optional notes', () => {
    const result = WatchedMovieInputSchema.safeParse({
      movieId: 550,
      rating: 7,
      watchedAt: '2024-06-15',
      venue: 'Home',
      notes: 'Great movie!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects rating out of range', () => {
    const result = WatchedMovieInputSchema.safeParse({
      movieId: 550,
      rating: 11,
      watchedAt: '2024-06-15',
      venue: 'Theater',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid venue', () => {
    const result = WatchedMovieInputSchema.safeParse({
      movieId: 550,
      rating: 5,
      watchedAt: '2024-06-15',
      venue: 'Cinema',
    });
    expect(result.success).toBe(false);
  });
});
