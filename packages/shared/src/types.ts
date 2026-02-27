export interface User {
  id: string;
  firebaseUid: string;
  email: string;
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

export type RoomStatus = 'lobby' | 'submitting' | 'swiping' | 'results';

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
  members?: RoomMember[];
  movies?: RoomMovie[];
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  user?: Pick<User, 'id' | 'displayName' | 'photoUrl'>;
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
  eloScore?: number;
  rank?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  requestId?: string;
}
