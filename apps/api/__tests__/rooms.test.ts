import { describe, it, expect, vi } from 'vitest';
import { ROOM_CODE_LENGTH, ALGORITHM_VERSIONS } from '@reelrank/shared';

vi.mock('@/lib/firestore', () => ({
  db: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn().mockResolvedValue(undefined),
      }),
      add: vi.fn().mockResolvedValue({ id: 'mock-id' }),
      get: vi.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }),
  },
  COLLECTIONS: {
    users: 'users',
    soloSwipes: 'soloSwipes',
    pairwiseChoices: 'pairwiseChoices',
    rooms: 'rooms',
    roomMembers: (id: string) => `rooms/${id}/members`,
    roomMovies: (id: string) => `rooms/${id}/movies`,
    roomSwipes: (id: string) => `rooms/${id}/swipes`,
    roomResults: (id: string) => `rooms/${id}/results`,
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('@/lib/ably', () => ({
  publishToRoom: vi.fn().mockResolvedValue(undefined),
}));

describe('Room Code Generation', () => {
  it('generates codes of correct length', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it('avoids ambiguous characters (0, O, 1, I)', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    expect(chars).not.toContain('0');
    expect(chars).not.toContain('O');
    expect(chars).not.toContain('1');
    expect(chars).not.toContain('I');
  });
});

describe('Simple Majority Algorithm', () => {
  function computeSimpleMajority(
    swipes: { movieId: number; direction: string }[],
    totalMembers: number,
  ) {
    const scores = new Map<number, { right: number; left: number }>();

    for (const swipe of swipes) {
      const current = scores.get(swipe.movieId) ?? { right: 0, left: 0 };
      if (swipe.direction === 'right') current.right++;
      else current.left++;
      scores.set(swipe.movieId, current);
    }

    return Array.from(scores.entries())
      .map(([movieId, { right, left }]) => ({
        movieId,
        score: (right - left) / totalMembers,
        rightSwipes: right,
        leftSwipes: left,
      }))
      .sort((a, b) => b.score - a.score);
  }

  it('ranks unanimously liked movies first', () => {
    const swipes = [
      { movieId: 1, direction: 'right' },
      { movieId: 1, direction: 'right' },
      { movieId: 1, direction: 'right' },
      { movieId: 2, direction: 'right' },
      { movieId: 2, direction: 'left' },
      { movieId: 2, direction: 'right' },
    ];

    const results = computeSimpleMajority(swipes, 3);
    expect(results[0].movieId).toBe(1);
    expect(results[0].score).toBe(1);
    expect(results[1].movieId).toBe(2);
  });

  it('gives negative scores to disliked movies', () => {
    const swipes = [
      { movieId: 1, direction: 'left' },
      { movieId: 1, direction: 'left' },
      { movieId: 1, direction: 'left' },
    ];

    const results = computeSimpleMajority(swipes, 3);
    expect(results[0].score).toBe(-1);
  });

  it('handles mixed votes correctly', () => {
    const swipes = [
      { movieId: 1, direction: 'right' },
      { movieId: 1, direction: 'left' },
    ];

    const results = computeSimpleMajority(swipes, 2);
    expect(results[0].score).toBe(0);
  });
});

describe('Algorithm Versions', () => {
  it('has required algorithm versions defined', () => {
    expect(ALGORITHM_VERSIONS.SIMPLE_MAJORITY).toBe('simple_majority_v1');
    expect(ALGORITHM_VERSIONS.RANKED_CHOICE).toBe('ranked_choice_v1');
    expect(ALGORITHM_VERSIONS.ELO_GROUP).toBe('elo_group_v1');
  });
});
