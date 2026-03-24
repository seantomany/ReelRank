export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  username: string | null;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
}

export type SwipeDirection = 'left' | 'right';

export interface SoloSwipe {
  id: string;
  userId: string;
  movieId: number;
  direction: SwipeDirection;
  createdAt: Date;
}

export interface PairwiseChoice {
  id: string;
  userId: string;
  movieAId: number;
  movieBId: number;
  chosenId: number;
  createdAt: Date;
}

export type TriageZone = 'loved' | 'liked' | 'okay' | 'disliked';

export interface RankedList {
  userId: string;
  movieIds: number[];
  updatedAt: Date;
}

export type RoomStatus = 'lobby' | 'submitting' | 'swiping' | 'results';
export type AlgorithmType = 'simple_majority_v1' | 'elo_group_v1' | 'ranked_choice_v1';

export interface Room {
  id: string;
  code: string;
  name?: string;
  hostId: string;
  status: RoomStatus;
  algorithmVersion: AlgorithmType;
  memberUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
  members?: RoomMember[];
  movies?: RoomMovie[];
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'photoUrl'>;
  joinedAt: Date;
}

export interface RoomMovie {
  id: string;
  roomId: string;
  movieId: number;
  movie?: Movie;
  submittedByUserId: string;
  createdAt: Date;
}

export interface RoomSwipe {
  id: string;
  roomId: string;
  userId: string;
  movieId: number;
  direction: SwipeDirection;
  createdAt: Date;
}

export interface MovieScore {
  movieId: number;
  movie: Movie;
  score: number;
  rightSwipes: number;
  leftSwipes: number;
  totalVoters: number;
  popularityBonus: number;
  ratingBonus: number;
  finalScore: number;
}

export interface RoomResult {
  id: string;
  roomId: string;
  computedAt: Date;
  algorithmVersion: string;
  rankedMovies: MovieScore[];
}

export interface SoloRanking {
  movieId: number;
  movie: Movie;
  beliScore: number;
  eloScore: number;
  swipeSignal: number;
  rank: number;
}

export interface WatchedMovie {
  id: string;
  userId: string;
  movieId: number;
  rating: number;
  watchedAt: string;
  venue: string;
  notes?: string;
  movie?: Movie;
  createdAt: string;
  updatedAt: string;
}

export interface MovieUserStatus {
  swipeDirection?: SwipeDirection;
  watched?: WatchedMovie;
  beliScore?: number;
  eloScore?: number;
  rank?: number;
}

export interface RoomResultExtended extends RoomResult {
  memberVotes: { userId: string; username: string | null; movieId: number; direction: SwipeDirection }[];
  submissions: { movieId: number; submittedBy: { userId: string; username: string | null } }[];
  memberStats: { userId: string; username: string | null; rightCount: number; leftCount: number; agreementScore: number }[];
}

export interface SoloInsights {
  genreBreakdown: { genreId: number; genreName: string; rightCount: number; leftCount: number; percentage: number }[];
  swipeRate: { rightSwipes: number; leftSwipes: number; ratio: number };
  ratingDistribution: { bucket: string; count: number }[];
  watchPatterns: { month: string; count: number; avgRating: number }[];
  venueBreakdown: { venue: string; count: number }[];
  topGenresByScore: { genreId: number; genreName: string; avgScore: number }[];
  decadeBreakdown: { decade: string; count: number }[];
  averageRating: number;
  ratingByGenre: { genreId: number; genreName: string; avgRating: number; count: number }[];
  dayOfWeekActivity: { day: string; count: number }[];
  watchlistConversion: { rightSwiped: number; watched: number; rate: number };
  crowdAgreement: { movies: { movieId: number; title: string; userRating: number; tmdbRating: number; diff: number }[]; avgDiff: number };
  moviePersonality: { title: string; description: string; traits: string[] };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  warnings?: string[];
  requestId?: string;
}
