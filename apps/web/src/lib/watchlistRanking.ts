const KEY_PREFIX = "reelrank:watchlist-ranking:v1:";
export const WATCHLIST_INITIAL_ELO = 1500;
const K = 32;

export type WatchlistScores = Record<number, { score: number; n: number }>;

export function loadWatchlistScores(userId: string): WatchlistScores {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as WatchlistScores) : {};
  } catch {
    return {};
  }
}

export function saveWatchlistScores(userId: string, scores: WatchlistScores): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(scores));
  } catch {}
}

export function applyEloUpdate(
  scores: WatchlistScores,
  winnerId: number,
  loserId: number,
): WatchlistScores {
  const winner = scores[winnerId] ?? { score: WATCHLIST_INITIAL_ELO, n: 0 };
  const loser = scores[loserId] ?? { score: WATCHLIST_INITIAL_ELO, n: 0 };
  const expectedW = 1 / (1 + Math.pow(10, (loser.score - winner.score) / 400));
  return {
    ...scores,
    [winnerId]: { score: winner.score + K * (1 - expectedW), n: winner.n + 1 },
    [loserId]: { score: loser.score + K * (0 - (1 - expectedW)), n: loser.n + 1 },
  };
}

export function recordWatchlistChoice(
  userId: string,
  winnerId: number,
  loserId: number,
): WatchlistScores {
  const current = loadWatchlistScores(userId);
  const next = applyEloUpdate(current, winnerId, loserId);
  saveWatchlistScores(userId, next);
  return next;
}
