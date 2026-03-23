import { API_URL } from '../config/api';
import type { ApiResponse } from '@reelrank/shared';

type GetToken = () => Promise<string>;

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 60000;

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {
        error: `Server error (${res.status})`,
        requestId: undefined,
      };
    }

    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      requestId: undefined,
    };
  }
}

export async function cachedGet<T>(path: string): Promise<ApiResponse<T>> {
  const cacheKey = path;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return { data: cached.data as T };
  }

  const result = await apiFetch<T>(path);
  if (result.data) {
    cache.set(cacheKey, { data: result.data, expiry: Date.now() + CACHE_TTL });
  }
  return result;
}

export const api = {
  auth: {
    verify: (token: string) =>
      apiFetch('/api/auth/verify', { method: 'POST', token }),
  },

  movies: {
    search: (query: string, page = 1) =>
      cachedGet(`/api/movies/search?query=${encodeURIComponent(query)}&page=${page}`),
    trending: (page = 1) =>
      cachedGet(`/api/movies/trending?page=${page}`),
    genres: () =>
      cachedGet('/api/movies/genres'),
    discover: (genre: number, page = 1) =>
      cachedGet(`/api/movies/discover?genre=${genre}&page=${page}`),
    getMovie: (id: number) =>
      cachedGet(`/api/movies/${id}`),
  },

  solo: {
    swipe: (movieId: number, direction: string, token: string) =>
      apiFetch('/api/solo/swipe', { method: 'POST', body: { movieId, direction }, token }),
    pairwise: (movieAId: number, movieBId: number, chosenId: number, token: string) =>
      apiFetch('/api/solo/pairwise', { method: 'POST', body: { movieAId, movieBId, chosenId }, token }),
    ranking: (token: string) =>
      apiFetch('/api/solo/ranking', { token }),
    lists: (type: string, token: string) =>
      apiFetch(`/api/solo/lists?type=${type}`, { token }),
    stats: (token: string) =>
      apiFetch('/api/solo/stats', { token }),
    status: (movieId: number, token: string) =>
      apiFetch(`/api/solo/status?movieId=${movieId}`, { token }),
    logWatched: (data: unknown, token: string) =>
      apiFetch('/api/solo/watched', { method: 'POST', body: data, token }),
    getWatched: (token: string) =>
      apiFetch('/api/solo/watched', { token }),
  },

  rooms: {
    create: (data: unknown, token: string) =>
      apiFetch('/api/rooms/create', { method: 'POST', body: data, token }),
    join: (code: string, token: string) =>
      apiFetch('/api/rooms/join', { method: 'POST', body: { code }, token }),
    history: (token: string) =>
      apiFetch('/api/rooms/history', { token }),
    getRoom: (code: string, token: string) =>
      apiFetch(`/api/rooms/${code}`, { token }),
    submit: (code: string, movieId: number, token: string) =>
      apiFetch(`/api/rooms/${code}/submit`, { method: 'POST', body: { movieId }, token }),
    start: (code: string, phase: string, token: string) =>
      apiFetch(`/api/rooms/${code}/start`, { method: 'POST', body: { phase }, token }),
    swipe: (code: string, movieId: number, direction: string, token: string) =>
      apiFetch(`/api/rooms/${code}/swipe`, { method: 'POST', body: { movieId, direction }, token }),
    results: (code: string, token: string) =>
      apiFetch(`/api/rooms/${code}/results`, { token }),
    leave: (code: string, token: string) =>
      apiFetch(`/api/rooms/${code}/leave`, { method: 'POST', token }),
  },
};
