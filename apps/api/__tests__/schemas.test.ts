import { describe, it, expect } from 'vitest';
import {
  SoloSwipeInputSchema,
  PairwiseChoiceInputSchema,
  JoinRoomInputSchema,
  SubmitMovieInputSchema,
  RoomSwipeInputSchema,
  MovieSearchQuerySchema,
  StartRoomInputSchema,
  WatchedMovieInputSchema,
  RoomCodeSchema,
  ListTypeSchema,
  TrendingPageSchema,
  ROOM_CODE_LENGTH,
  ROOM_MAX_MEMBERS,
  ROOM_MAX_MOVIES,
  ALGORITHM_VERSIONS,
  ABLY_EVENTS,
  ABLY_CHANNELS,
  ELO_INITIAL_RATING,
  ELO_K_FACTOR,
  TMDB_IMAGE_BASE_URL,
  TMDB_POSTER_SIZES,
  SWIPE_DECK_PRELOAD,
} from '@reelrank/shared';

describe('Shared Schemas', () => {
  describe('SoloSwipeInputSchema', () => {
    it('valid', () => expect(SoloSwipeInputSchema.safeParse({ movieId: 1, direction: 'right' }).success).toBe(true));
    it('invalid direction', () => expect(SoloSwipeInputSchema.safeParse({ movieId: 1, direction: 'up' }).success).toBe(false));
  });

  describe('JoinRoomInputSchema', () => {
    it('valid', () => expect(JoinRoomInputSchema.safeParse({ code: 'ABCDEF' }).success).toBe(true));
    it('too short', () => expect(JoinRoomInputSchema.safeParse({ code: 'ABC' }).success).toBe(false));
    it('uppercases', () => {
      const result = JoinRoomInputSchema.safeParse({ code: 'abcdef' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.code).toBe('ABCDEF');
    });
  });

  describe('SubmitMovieInputSchema', () => {
    it('valid', () => expect(SubmitMovieInputSchema.safeParse({ movieId: 42 }).success).toBe(true));
    it('zero', () => expect(SubmitMovieInputSchema.safeParse({ movieId: 0 }).success).toBe(false));
  });

  describe('RoomSwipeInputSchema', () => {
    it('valid', () => expect(RoomSwipeInputSchema.safeParse({ movieId: 1, direction: 'left' }).success).toBe(true));
  });

  describe('StartRoomInputSchema', () => {
    it('valid phases', () => {
      expect(StartRoomInputSchema.safeParse({ phase: 'submitting' }).success).toBe(true);
      expect(StartRoomInputSchema.safeParse({ phase: 'swiping' }).success).toBe(true);
      expect(StartRoomInputSchema.safeParse({ phase: 'results' }).success).toBe(true);
    });
    it('invalid phase', () => expect(StartRoomInputSchema.safeParse({ phase: 'invalid' }).success).toBe(false));
  });

  describe('RoomCodeSchema', () => {
    it('valid', () => expect(RoomCodeSchema.safeParse('AB3DEF').success).toBe(true));
    it('too short', () => expect(RoomCodeSchema.safeParse('ABC').success).toBe(false));
    it('invalid chars', () => expect(RoomCodeSchema.safeParse('abc***').success).toBe(false));
  });

  describe('ListTypeSchema', () => {
    it('valid', () => {
      expect(ListTypeSchema.safeParse('want').success).toBe(true);
      expect(ListTypeSchema.safeParse('pass').success).toBe(true);
    });
    it('invalid', () => expect(ListTypeSchema.safeParse('other').success).toBe(false));
  });

  describe('MovieSearchQuerySchema', () => {
    it('coerces page to number', () => {
      const result = MovieSearchQuerySchema.safeParse({ query: 'test', page: '5' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.page).toBe(5);
    });
    it('defaults page to 1', () => {
      const result = MovieSearchQuerySchema.safeParse({ query: 'test' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.page).toBe(1);
    });
  });
});

describe('Shared Constants', () => {
  it('room constants', () => {
    expect(ROOM_CODE_LENGTH).toBe(6);
    expect(ROOM_MAX_MEMBERS).toBe(20);
    expect(ROOM_MAX_MOVIES).toBe(30);
  });

  it('elo constants', () => {
    expect(ELO_INITIAL_RATING).toBe(1500);
    expect(ELO_K_FACTOR).toBe(32);
  });

  it('tmdb constants', () => {
    expect(TMDB_IMAGE_BASE_URL).toBe('https://image.tmdb.org/t/p');
    expect(TMDB_POSTER_SIZES.small).toBe('w185');
    expect(TMDB_POSTER_SIZES.medium).toBe('w342');
    expect(TMDB_POSTER_SIZES.large).toBe('w500');
    expect(TMDB_POSTER_SIZES.original).toBe('original');
  });

  it('algorithm versions', () => {
    expect(Object.keys(ALGORITHM_VERSIONS)).toHaveLength(3);
  });

  it('ably events', () => {
    expect(ABLY_EVENTS.MEMBER_JOINED).toBe('member:joined');
    expect(ABLY_EVENTS.ROOM_STATUS_CHANGED).toBe('room:status');
    expect(ABLY_EVENTS.SWIPE_PROGRESS).toBe('swipe:progress');
    expect(ABLY_EVENTS.RESULTS_READY).toBe('results:ready');
  });

  it('ably channels', () => {
    expect(ABLY_CHANNELS.room('ABC')).toBe('room:ABC');
  });

  it('swipe deck preload', () => {
    expect(SWIPE_DECK_PRELOAD).toBe(5);
  });
});
