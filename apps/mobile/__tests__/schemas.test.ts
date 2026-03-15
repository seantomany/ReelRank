import {
  SoloSwipeInputSchema,
  PairwiseChoiceInputSchema,
  JoinRoomInputSchema,
  WatchedMovieInputSchema,
  SubmitMovieInputSchema,
  RoomSwipeInputSchema,
  StartRoomInputSchema,
  MovieSearchQuerySchema,
} from '@reelrank/shared';

describe('Schema Validation', () => {
  describe('SoloSwipeInputSchema', () => {
    it('accepts valid', () => {
      expect(SoloSwipeInputSchema.safeParse({ movieId: 1, direction: 'right' }).success).toBe(true);
    });
    it('rejects invalid direction', () => {
      expect(SoloSwipeInputSchema.safeParse({ movieId: 1, direction: 'up' }).success).toBe(false);
    });
  });

  describe('PairwiseChoiceInputSchema', () => {
    it('accepts valid', () => {
      expect(PairwiseChoiceInputSchema.safeParse({ movieAId: 1, movieBId: 2, chosenId: 1 }).success).toBe(true);
    });
    it('rejects same movies', () => {
      expect(PairwiseChoiceInputSchema.safeParse({ movieAId: 1, movieBId: 1, chosenId: 1 }).success).toBe(false);
    });
  });

  describe('JoinRoomInputSchema', () => {
    it('transforms to uppercase', () => {
      const result = JoinRoomInputSchema.safeParse({ code: 'abcdef' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.code).toBe('ABCDEF');
    });
  });

  describe('WatchedMovieInputSchema', () => {
    it('accepts valid', () => {
      const result = WatchedMovieInputSchema.safeParse({
        movieId: 1, rating: 8, watchedAt: '2024-03-15', venue: 'Theater',
      });
      expect(result.success).toBe(true);
    });
    it('rejects rating < 1', () => {
      expect(WatchedMovieInputSchema.safeParse({
        movieId: 1, rating: 0, watchedAt: '2024-03-15', venue: 'Home',
      }).success).toBe(false);
    });
  });

  describe('MovieSearchQuerySchema', () => {
    it('defaults page', () => {
      const result = MovieSearchQuerySchema.safeParse({ query: 'test' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.page).toBe(1);
    });
  });

  describe('SubmitMovieInputSchema', () => {
    it('accepts positive int', () => {
      expect(SubmitMovieInputSchema.safeParse({ movieId: 42 }).success).toBe(true);
    });
    it('rejects zero', () => {
      expect(SubmitMovieInputSchema.safeParse({ movieId: 0 }).success).toBe(false);
    });
  });

  describe('RoomSwipeInputSchema', () => {
    it('accepts valid', () => {
      expect(RoomSwipeInputSchema.safeParse({ movieId: 1, direction: 'left' }).success).toBe(true);
    });
  });

  describe('StartRoomInputSchema', () => {
    it('accepts valid phases', () => {
      expect(StartRoomInputSchema.safeParse({ phase: 'submitting' }).success).toBe(true);
      expect(StartRoomInputSchema.safeParse({ phase: 'swiping' }).success).toBe(true);
    });
    it('rejects invalid', () => {
      expect(StartRoomInputSchema.safeParse({ phase: 'unknown' }).success).toBe(false);
    });
  });
});
