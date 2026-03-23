export const ROOM_CODE_LENGTH = 6;
export const ROOM_MAX_MEMBERS = 20;
export const ROOM_MAX_MOVIES = 30;
export const SWIPE_DECK_PRELOAD = 5;
export const ELO_K_FACTOR = 32;
export const ELO_INITIAL_RATING = 1500;

export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const TMDB_POSTER_SIZES = {
  small: 'w185',
  medium: 'w342',
  large: 'w500',
  original: 'original',
} as const;

export const TMDB_BACKDROP_SIZES = {
  small: 'w300',
  medium: 'w780',
  large: 'w1280',
  original: 'original',
} as const;

export function getPosterUrl(
  path: string | null,
  size: keyof typeof TMDB_POSTER_SIZES = 'medium'
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES[size]}${path}`;
}

export function getBackdropUrl(
  path: string | null,
  size: keyof typeof TMDB_BACKDROP_SIZES = 'medium'
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${TMDB_BACKDROP_SIZES[size]}${path}`;
}

export const ABLY_CHANNEL_PREFIX = 'room';

export function getRoomChannelName(roomCode: string): string {
  return `${ABLY_CHANNEL_PREFIX}:${roomCode}`;
}

export const ABLY_EVENTS = {
  MEMBER_JOINED: 'member:joined',
  MEMBER_LEFT: 'member:left',
  ROOM_STATUS: 'room:status',
  MOVIE_SUBMITTED: 'movie:submitted',
  SWIPE_PROGRESS: 'swipe:progress',
  RESULTS_READY: 'results:ready',
} as const;
