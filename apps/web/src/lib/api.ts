import type { ApiResponse } from "@reelrank/shared";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const cache = new Map<string, { data: unknown; expiry: number }>();
const DEFAULT_TTL = 60_000;

let authReady = false;
const authReadyPromise = new Promise<void>((resolve) => {
  if (typeof window === "undefined") {
    authReady = true;
    resolve();
    return;
  }
  const unsubscribe = onAuthStateChanged(auth, () => {
    authReady = true;
    unsubscribe();
    resolve();
  });
});

export function clearCache() {
  cache.clear();
}

async function getToken(forceRefresh = false): Promise<string | null> {
  try {
    if (!authReady) await authReadyPromise;
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

async function rawFetch<T>(
  path: string,
  options: RequestInit,
  token: string | null
): Promise<{ response: ApiResponse<T>; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { response: { error: `Server error (${res.status})` }, status: res.status };
  }

  const json = await res.json();
  if (!res.ok) {
    return {
      response: { error: json.error ?? `Request failed (${res.status})` },
      status: res.status,
    };
  }
  return { response: json as ApiResponse<T>, status: res.status };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    let token = await getToken();
    let { response, status } = await rawFetch<T>(path, options, token);

    if (status === 401 && auth.currentUser) {
      token = await getToken(true);
      if (token) {
        ({ response, status } = await rawFetch<T>(path, options, token));
      }
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { error: message };
  }
}

export async function cachedGet<T>(
  path: string,
  ttl = DEFAULT_TTL
): Promise<ApiResponse<T>> {
  const key = path;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiry > now) {
    return hit.data as ApiResponse<T>;
  }

  const result = await apiFetch<T>(path);
  if (result.data) {
    cache.set(key, { data: result, expiry: now + ttl });
  }
  return result;
}

export const api = {
  movies: {
    trending: (page = 1) =>
      cachedGet<{
        movies: import("@reelrank/shared").Movie[];
        totalPages: number;
        totalResults: number;
      }>(`/api/movies/trending?page=${page}`),
    search: (query: string, page = 1) =>
      apiFetch<{
        movies: import("@reelrank/shared").Movie[];
        totalPages: number;
        totalResults: number;
      }>(`/api/movies/search?query=${encodeURIComponent(query)}&page=${page}`),
    genres: () =>
      cachedGet<{ id: number; name: string }[]>(`/api/movies/genres`, 300_000),
    discover: (genre: number, page = 1) =>
      cachedGet<{
        movies: import("@reelrank/shared").Movie[];
        totalPages: number;
        totalResults: number;
      }>(`/api/movies/discover?genre=${genre}&page=${page}`),
    get: (id: number) =>
      cachedGet<import("@reelrank/shared").Movie>(
        `/api/movies/${id}`,
        120_000
      ),
  },
  solo: {
    swipe: (movieId: number, direction: "left" | "right") =>
      apiFetch<{ id: string; movieId: number; direction: string }>(
        "/api/solo/swipe",
        { method: "POST", body: JSON.stringify({ movieId, direction }) }
      ),
    pairwise: (movieAId: number, movieBId: number, chosenId: number) =>
      apiFetch<{
        id: string;
        chosenId: number;
        rankings?: import("@reelrank/shared").SoloRanking[];
      }>("/api/solo/pairwise", {
        method: "POST",
        body: JSON.stringify({ movieAId, movieBId, chosenId }),
      }),
    ranking: () =>
      apiFetch<import("@reelrank/shared").SoloRanking[]>(
        "/api/solo/ranking"
      ),
    lists: (type: "want" | "pass") =>
      apiFetch<
        (import("@reelrank/shared").SoloSwipe & {
          movie: import("@reelrank/shared").Movie;
        })[]
      >(`/api/solo/lists?type=${type}`),
    stats: () =>
      apiFetch<{
        totalSwipes: number;
        rightSwipes: number;
        leftSwipes: number;
        pairwiseChoices: number;
        moviesWatched: number;
        winRate: number;
      }>("/api/solo/stats"),
    status: (movieId: number) =>
      apiFetch<import("@reelrank/shared").MovieUserStatus>(
        `/api/solo/status?movieId=${movieId}`
      ),
    logWatched: (data: import("@reelrank/shared").WatchedMovieInput) =>
      apiFetch<{ id: string; movieId: number; rating: number }>(
        "/api/solo/watched",
        { method: "POST", body: JSON.stringify(data) }
      ),
    watched: () =>
      apiFetch<
        (import("@reelrank/shared").WatchedMovie & {
          movie?: import("@reelrank/shared").Movie;
        })[]
      >("/api/solo/watched"),
    rank: (movieId: number, insertAtIndex: number) =>
      apiFetch<import("@reelrank/shared").SoloRanking[]>(
        "/api/solo/rank",
        { method: "POST", body: JSON.stringify({ movieId, insertAtIndex }) }
      ),
    swipedIds: () =>
      apiFetch<number[]>("/api/solo/swiped-ids"),
    insights: () =>
      apiFetch<import("@reelrank/shared").SoloInsights>("/api/solo/insights"),
  },
  rooms: {
    create: (name?: string, algorithmVersion?: string) =>
      apiFetch<{ id: string; code: string; status: string; hostId: string }>(
        "/api/rooms/create",
        {
          method: "POST",
          body: JSON.stringify({ name, algorithmVersion }),
        }
      ),
    join: (code: string) =>
      apiFetch<{
        roomId: string;
        code: string;
        status: string;
        alreadyJoined?: boolean;
      }>("/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    history: () =>
      apiFetch<
        {
          id: string;
          code: string;
          name?: string;
          hostId: string;
          status: string;
          algorithmVersion: string;
          memberCount: number;
          createdAt: string;
          winnerMovie?: import("@reelrank/shared").Movie;
        }[]
      >("/api/rooms/history"),
    get: (code: string) =>
      apiFetch<import("@reelrank/shared").Room>(`/api/rooms/${code}`),
    start: (code: string, phase: "submitting" | "swiping") =>
      apiFetch<{ status: string }>(`/api/rooms/${code}/start`, {
        method: "POST",
        body: JSON.stringify({ phase }),
      }),
    submit: (code: string, movieId: number) =>
      apiFetch<{ movieId: number; submitted: boolean }>(
        `/api/rooms/${code}/submit`,
        { method: "POST", body: JSON.stringify({ movieId }) }
      ),
    swipe: (code: string, movieId: number, direction: "left" | "right") =>
      apiFetch<{ movieId: number; direction: string; progress: number }>(
        `/api/rooms/${code}/swipe`,
        { method: "POST", body: JSON.stringify({ movieId, direction }) }
      ),
    results: (code: string) =>
      apiFetch<import("@reelrank/shared").RoomResult>(
        `/api/rooms/${code}/results`
      ),
    bonusRound: (code: string, data: { movieIds?: number[]; movieId?: number }) =>
      apiFetch<{ bonusRoundId?: string; status: string; winnerId?: number; movie?: import("@reelrank/shared").Movie }>(
        `/api/rooms/${code}/bonus-round`,
        { method: "POST", body: JSON.stringify(data) }
      ),
    leave: (code: string) =>
      apiFetch<{ left: boolean }>(`/api/rooms/${code}/leave`, {
        method: "POST",
      }),
  },
  auth: {
    verify: () =>
      apiFetch<import("@reelrank/shared").User>("/api/auth/verify", {
        method: "POST",
      }),
    updateProfile: (data: { username: string }) =>
      apiFetch<import("@reelrank/shared").User>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    ablyToken: (roomCode: string) =>
      apiFetch<unknown>("/api/auth/ably-token", {
        method: "POST",
        body: JSON.stringify({ roomCode }),
      }),
  },
};
