import { ROOM_CODE_LENGTH, ALGORITHM_VERSIONS, ABLY_EVENTS, TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { AlgorithmType, SwipeDirection, RoomStatus } from '@reelrank/shared';

describe('Shared Constants', () => {
  it('room code length is 6', () => {
    expect(ROOM_CODE_LENGTH).toBe(6);
  });

  it('has all algorithm versions', () => {
    expect(ALGORITHM_VERSIONS.SIMPLE_MAJORITY).toBe('simple_majority_v1');
    expect(ALGORITHM_VERSIONS.RANKED_CHOICE).toBe('ranked_choice_v1');
    expect(ALGORITHM_VERSIONS.ELO_GROUP).toBe('elo_group_v1');
  });

  it('has all Ably events', () => {
    expect(ABLY_EVENTS.MEMBER_JOINED).toBe('member:joined');
    expect(ABLY_EVENTS.MEMBER_LEFT).toBe('member:left');
    expect(ABLY_EVENTS.ROOM_STATUS_CHANGED).toBe('room:status');
    expect(ABLY_EVENTS.MOVIE_SUBMITTED).toBe('movie:submitted');
    expect(ABLY_EVENTS.SWIPE_PROGRESS).toBe('swipe:progress');
    expect(ABLY_EVENTS.RESULTS_READY).toBe('results:ready');
  });

  it('has TMDB image constants', () => {
    expect(TMDB_IMAGE_BASE_URL).toContain('image.tmdb.org');
    expect(TMDB_POSTER_SIZES.small).toBe('w185');
    expect(TMDB_POSTER_SIZES.large).toBe('w500');
  });
});

describe('Type Exports', () => {
  it('AlgorithmType values are valid', () => {
    const valid: AlgorithmType[] = ['simple_majority_v1', 'elo_group_v1', 'ranked_choice_v1'];
    expect(valid).toHaveLength(3);
  });

  it('SwipeDirection values are valid', () => {
    const valid: SwipeDirection[] = ['left', 'right'];
    expect(valid).toHaveLength(2);
  });

  it('RoomStatus values are valid', () => {
    const valid: RoomStatus[] = ['lobby', 'submitting', 'swiping', 'results'];
    expect(valid).toHaveLength(4);
  });
});
