import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES, ELO_INITIAL_RATING, ELO_K_FACTOR } from '@reelrank/shared';

describe('Poster URL Construction', () => {
  it('constructs small poster URL', () => {
    const posterPath = '/abc123.jpg';
    const url = `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${posterPath}`;
    expect(url).toBe('https://image.tmdb.org/t/p/w185/abc123.jpg');
  });

  it('constructs large poster URL', () => {
    const posterPath = '/movie.jpg';
    const url = `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.large}${posterPath}`;
    expect(url).toBe('https://image.tmdb.org/t/p/w500/movie.jpg');
  });

  it('constructs original poster URL', () => {
    const posterPath = '/full.jpg';
    const url = `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.original}${posterPath}`;
    expect(url).toBe('https://image.tmdb.org/t/p/original/full.jpg');
  });
});

describe('ELO Constants', () => {
  it('initial rating is 1500', () => {
    expect(ELO_INITIAL_RATING).toBe(1500);
  });

  it('k factor is 32', () => {
    expect(ELO_K_FACTOR).toBe(32);
  });

  it('computes expected score correctly', () => {
    const rA = ELO_INITIAL_RATING;
    const rB = ELO_INITIAL_RATING;
    const expected = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    expect(expected).toBeCloseTo(0.5);
  });

  it('higher rated player has higher expected score', () => {
    const rA = 1600;
    const rB = 1400;
    const expectedA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (rA - rB) / 400));
    expect(expectedA).toBeGreaterThan(expectedB);
  });
});

describe('Room Code Formatting', () => {
  it('uppercases user input', () => {
    const input = 'abc123';
    const formatted = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    expect(formatted).toBe('ABC123');
  });

  it('strips special characters', () => {
    const input = 'AB@#12';
    const formatted = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    expect(formatted).toBe('AB12');
  });

  it('truncates to 6 characters', () => {
    const input = 'ABCDEFGH';
    const formatted = input.slice(0, 6);
    expect(formatted).toBe('ABCDEF');
    expect(formatted).toHaveLength(6);
  });
});
