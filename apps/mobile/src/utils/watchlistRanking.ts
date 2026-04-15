import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'reelrank:watchlist-ranking:v1:';
const INITIAL_ELO = 1500;
const K = 32;

export type WatchlistScores = Record<number, { score: number; n: number }>;

export async function loadWatchlistScores(userId: string): Promise<WatchlistScores> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as WatchlistScores) : {};
  } catch {
    return {};
  }
}

export async function saveWatchlistScores(
  userId: string,
  scores: WatchlistScores,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + userId, JSON.stringify(scores));
  } catch {}
}

export function applyEloUpdate(
  scores: WatchlistScores,
  winnerId: number,
  loserId: number,
): WatchlistScores {
  const winner = scores[winnerId] ?? { score: INITIAL_ELO, n: 0 };
  const loser = scores[loserId] ?? { score: INITIAL_ELO, n: 0 };
  const expectedW = 1 / (1 + Math.pow(10, (loser.score - winner.score) / 400));
  return {
    ...scores,
    [winnerId]: { score: winner.score + K * (1 - expectedW), n: winner.n + 1 },
    [loserId]: { score: loser.score + K * (0 - (1 - expectedW)), n: loser.n + 1 },
  };
}

export async function recordWatchlistChoice(
  userId: string,
  winnerId: number,
  loserId: number,
): Promise<WatchlistScores> {
  const current = await loadWatchlistScores(userId);
  const next = applyEloUpdate(current, winnerId, loserId);
  await saveWatchlistScores(userId, next);
  return next;
}

export const WATCHLIST_INITIAL_ELO = INITIAL_ELO;
