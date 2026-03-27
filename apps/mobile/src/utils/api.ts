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
    getProviders: (id: number) =>
      cachedGet(`/api/movies/${id}/providers`),
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
    dailyRec: (token: string) =>
      apiFetch('/api/solo/daily-rec', { token }),
    insights: (token: string) =>
      apiFetch('/api/solo/insights', { token }),
    suggestions: (token: string) =>
      apiFetch('/api/solo/suggestions', { token }),
    rank: (movieId: number, insertAtIndex: number, token: string) =>
      apiFetch('/api/solo/rank', { method: 'POST', body: { movieId, insertAtIndex }, token }),
    swipedIds: (token: string) =>
      apiFetch('/api/solo/swiped-ids', { token }),
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
    removeMovie: (code: string, movieId: number, token: string) =>
      apiFetch(`/api/rooms/${code}/submit`, { method: 'DELETE', body: { movieId }, token }),
    start: (code: string, phase: string, token: string) =>
      apiFetch(`/api/rooms/${code}/start`, { method: 'POST', body: { phase }, token }),
    swipe: (code: string, movieId: number, direction: string, token: string) =>
      apiFetch(`/api/rooms/${code}/swipe`, { method: 'POST', body: { movieId, direction }, token }),
    results: (code: string, token: string) =>
      apiFetch(`/api/rooms/${code}/results`, { token }),
    leave: (code: string, token: string) =>
      apiFetch(`/api/rooms/${code}/leave`, { method: 'POST', token }),
    bonusRound: (code: string, data: unknown, token: string) =>
      apiFetch(`/api/rooms/${code}/bonus-round`, { method: 'POST', body: data, token }),
    rename: (code: string, name: string, token: string) =>
      apiFetch(`/api/rooms/${code}`, { method: 'PATCH', body: { name }, token }),
    pin: (roomCode: string, token: string) =>
      apiFetch('/api/rooms/pin', { method: 'POST', body: { roomCode }, token }),
    unpin: (roomCode: string, token: string) =>
      apiFetch('/api/rooms/pin', { method: 'DELETE', body: { roomCode }, token }),
  },

  users: {
    savePushToken: (pushToken: string, token: string) =>
      apiFetch('/api/users/push-token', { method: 'POST', body: { pushToken }, token }),
  },

  auth: {
    verify: (token: string) =>
      apiFetch('/api/auth/verify', { method: 'POST', token }),
    updateProfile: (data: { username: string }, token: string) =>
      apiFetch('/api/auth/profile', { method: 'PATCH', body: data, token }),
    uploadPhoto: (photoUrl: string, token: string) =>
      apiFetch('/api/auth/photo', { method: 'POST', body: { photoUrl }, token }),
    removePhoto: (token: string) =>
      apiFetch('/api/auth/photo', { method: 'DELETE', token }),
  },

  ai: {
    chat: (messages: { role: string; content: string }[], token: string) =>
      apiFetch('/api/ai/chat', { method: 'POST', body: { messages }, token }),
    movieSearch: (query: string) =>
      cachedGet(`/api/ai/movie-search?q=${encodeURIComponent(query)}`),
    movieCard: (id: number) =>
      cachedGet(`/api/ai/movie-card/${id}`),
  },

  social: {
    searchUsers: (query: string, token: string) =>
      apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`, { token }),
    getFriends: (token: string) =>
      apiFetch('/api/social/friends', { token }),
    getRequests: (token: string) =>
      apiFetch('/api/social/requests', { token }),
    sendRequest: (toUserId: string, token: string) =>
      apiFetch('/api/social/requests', { method: 'POST', body: { toUserId }, token }),
    handleRequest: (requestId: string, action: 'accept' | 'reject', token: string) =>
      apiFetch('/api/social/requests', { method: 'PATCH', body: { requestId, action }, token }),
    getFriendProfile: (userId: string, token: string) =>
      apiFetch(`/api/social/profile/${userId}`, { token }),
    getComments: (watchedId: string, token: string) =>
      apiFetch(`/api/social/comments?watchedId=${watchedId}`, { token }),
    addComment: (watchedId: string, targetUserId: string, text: string, token: string) =>
      apiFetch('/api/social/comments', { method: 'POST', body: { watchedId, targetUserId, text }, token }),
    movieFriends: (movieId: number, token: string) =>
      apiFetch(`/api/social/movie-friends?movieId=${movieId}`, { token }),
    feed: (token: string) =>
      apiFetch('/api/social/feed', { token }),
  },
};
