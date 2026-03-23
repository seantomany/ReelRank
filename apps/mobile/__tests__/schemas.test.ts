import { describe, it, expect } from 'vitest';
import {
  SoloSwipeInputSchema,
  RoomCodeSchema,
  WatchedMovieInputSchema,
  ROOM_CODE_LENGTH,
} from '@reelrank/shared';

describe('Shared Schemas (mobile)', () => {
  it('validates solo swipe input', () => {
    expect(SoloSwipeInputSchema.safeParse({ movieId: 1, direction: 'right' }).success).toBe(true);
    expect(SoloSwipeInputSchema.safeParse({ movieId: -1, direction: 'right' }).success).toBe(false);
    expect(SoloSwipeInputSchema.safeParse({ movieId: 1, direction: 'up' }).success).toBe(false);
  });

  it('validates room code', () => {
    expect(RoomCodeSchema.safeParse('ABCDEF').success).toBe(true);
    expect(RoomCodeSchema.safeParse('ABC12').success).toBe(false);
    expect(RoomCodeSchema.safeParse('abcdef').success).toBe(false);
  });

  it('uses ROOM_CODE_LENGTH constant correctly', () => {
    expect(ROOM_CODE_LENGTH).toBe(6);
    const code = 'A'.repeat(ROOM_CODE_LENGTH);
    expect(RoomCodeSchema.safeParse(code).success).toBe(true);
  });

  it('validates watched movie input', () => {
    const valid = {
      movieId: 550,
      rating: 8,
      watchedAt: '2024-06-15',
      venue: 'Theater',
    };
    expect(WatchedMovieInputSchema.safeParse(valid).success).toBe(true);

    const invalid = { ...valid, rating: 15 };
    expect(WatchedMovieInputSchema.safeParse(invalid).success).toBe(false);
  });
});
