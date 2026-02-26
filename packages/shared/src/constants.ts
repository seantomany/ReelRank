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

export const ALGORITHM_VERSIONS = {
  SIMPLE_MAJORITY: 'simple_majority_v1',
  RANKED_CHOICE: 'ranked_choice_v1',
  ELO_GROUP: 'elo_group_v1',
} as const;

export const ABLY_CHANNELS = {
  room: (code: string) => `room:${code}`,
} as const;

export const ABLY_EVENTS = {
  MEMBER_JOINED: 'member:joined',
  MEMBER_LEFT: 'member:left',
  ROOM_STATUS_CHANGED: 'room:status',
  MOVIE_SUBMITTED: 'movie:submitted',
  SWIPE_PROGRESS: 'swipe:progress',
  RESULTS_READY: 'results:ready',
} as const;
