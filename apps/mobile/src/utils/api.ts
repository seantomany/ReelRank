import { API_URL } from '../config/api';
import type { ApiResponse, Movie, Room, SoloRanking, MovieScore, WatchedMovie, MovieUserStatus } from '@reelrank/shared';

type FetchOptions = RequestInit & { token?: string };

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
  const json: ApiResponse<T> = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }

  return json.data as T;
}

export const api = {
  movies: {
    search: (query: string, page = 1) =>
      apiFetch<{ movies: Movie[]; totalPages: number }>(`/api/movies/search?query=${encodeURIComponent(query)}&page=${page}`),

    trending: (page = 1) =>
      apiFetch<{ movies: Movie[]; totalPages: number }>(`/api/movies/trending?page=${page}`),

    getById: (id: number) =>
      apiFetch<Movie>(`/api/movies/${id}`),
  },

  auth: {
    verify: (token: string) =>
      apiFetch<{ id: string; email: string }>('/api/auth/verify', {
        method: 'POST',
        token,
      }),
  },

  solo: {
    swipe: (movieId: number, direction: 'left' | 'right', token: string) =>
      apiFetch('/api/solo/swipe', {
        method: 'POST',
        body: JSON.stringify({ movieId, direction }),
        token,
      }),

    pairwise: (movieAId: number, movieBId: number, chosenId: number, token: string) =>
      apiFetch('/api/solo/pairwise', {
        method: 'POST',
        body: JSON.stringify({ movieAId, movieBId, chosenId }),
        token,
      }),

    ranking: (token: string) =>
      apiFetch<SoloRanking[]>('/api/solo/ranking', { token }),

    lists: (type: 'want' | 'seen', token: string) =>
      apiFetch<Array<{ movieId: number; movie: Movie }>>(`/api/solo/lists?type=${type}`, { token }),

    movieStatus: (movieId: number, token: string) =>
      apiFetch<MovieUserStatus>(`/api/solo/status?movieId=${movieId}`, { token }),

    logWatched: (data: { movieId: number; rating: number; watchedAt: string; venue: string; notes?: string }, token: string) =>
      apiFetch<WatchedMovie>('/api/solo/watched', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),

    watchedList: (token: string) =>
      apiFetch<WatchedMovie[]>('/api/solo/watched', { token }),
  },

  rooms: {
    create: (token: string) =>
      apiFetch<Room>('/api/rooms/create', { method: 'POST', token }),

    join: (code: string, token: string) =>
      apiFetch<Room>('/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.toUpperCase() }),
        token,
      }),

    get: (code: string, token: string) =>
      apiFetch<Room>(`/api/rooms/${code}`, { token }),

    start: (code: string, phase: string, token: string) =>
      apiFetch<Room>(`/api/rooms/${code}/start`, {
        method: 'POST',
        body: JSON.stringify({ phase }),
        token,
      }),

    submitMovie: (code: string, movieId: number, token: string) =>
      apiFetch(`/api/rooms/${code}/submit`, {
        method: 'POST',
        body: JSON.stringify({ movieId }),
        token,
      }),

    swipe: (code: string, movieId: number, direction: 'left' | 'right', token: string) =>
      apiFetch(`/api/rooms/${code}/swipe`, {
        method: 'POST',
        body: JSON.stringify({ movieId, direction }),
        token,
      }),

    results: (code: string, token: string) =>
      apiFetch<{ rankedMovies: MovieScore[] }>(`/api/rooms/${code}/results`, { token }),
  },
};
