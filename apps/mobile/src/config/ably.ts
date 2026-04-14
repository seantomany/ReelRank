import * as Ably from 'ably';
import { API_URL } from './api';
import { getRoomChannelName, ABLY_EVENTS } from '@reelrank/shared';
import type { Movie } from '@reelrank/shared';

let realtimeClient: Ably.Realtime | null = null;
let clientRoomCode: string | null = null;

async function fetchAblyToken(
  roomCode: string,
  getToken: () => Promise<string>
): Promise<unknown> {
  const idToken = await getToken();
  const res = await fetch(`${API_URL}/api/auth/ably-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ roomCode }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to get Ably token: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (!json.data) {
    throw new Error(json.error ?? 'Failed to get Ably token');
  }
  return json.data;
}

/**
 * Returns a realtime client scoped to the given roomCode. If the cached client
 * is for a different room, it's closed and a fresh one is created. The
 * authCallback closure captures roomCode, so token requests always include the
 * correct room — this is what allows non-hosts to actually subscribe to room
 * events (including bonus round).
 */
function getAblyClient(
  roomCode: string,
  getToken: () => Promise<string>
): Ably.Realtime {
  if (realtimeClient && clientRoomCode === roomCode) {
    return realtimeClient;
  }

  if (realtimeClient) {
    try {
      realtimeClient.close();
    } catch {
      // ignore
    }
    realtimeClient = null;
    clientRoomCode = null;
  }

  realtimeClient = new Ably.Realtime({
    authCallback: async (_tokenParams, callback) => {
      try {
        const tokenRequest = await fetchAblyToken(roomCode, getToken);
        callback(null, tokenRequest as Ably.TokenDetails);
      } catch (err) {
        const e = err as Error;
        callback(
          { code: 40000, statusCode: 401, message: e.message } as unknown as Ably.ErrorInfo,
          null
        );
      }
    },
  });
  clientRoomCode = roomCode;
  return realtimeClient;
}

export interface RoomEventHandlers {
  onMemberJoined?: (data: { userId: string; displayName: string }) => void;
  onMemberLeft?: (data: { userId: string }) => void;
  onRoomStatus?: (data: { status: string }) => void;
  onMovieSubmitted?: (data: { movieId: number; submittedBy: string }) => void;
  onSwipeProgress?: (data: { progress: number }) => void;
  onResultsReady?: (data: { resultId: string }) => void;
}

interface RoomSubscription {
  channel: Ably.RealtimeChannel;
  listeners: Array<{ event: string; fn: (msg: Ably.Message) => void }>;
}

const activeSubscriptions = new Map<string, RoomSubscription>();

export function subscribeToRoom(
  roomCode: string,
  handlers: RoomEventHandlers,
  getToken: () => Promise<string>
): void {
  const client = getAblyClient(roomCode, getToken);
  const channelName = getRoomChannelName(roomCode);
  const channel = client.channels.get(channelName);

  const listeners: RoomSubscription['listeners'] = [];

  const register = (event: string, handler: ((data: unknown) => void) | undefined) => {
    if (!handler) return;
    const fn = (msg: Ably.Message) => handler(msg.data);
    channel.subscribe(event, fn);
    listeners.push({ event, fn });
  };

  register(ABLY_EVENTS.MEMBER_JOINED, handlers.onMemberJoined as any);
  register(ABLY_EVENTS.MEMBER_LEFT, handlers.onMemberLeft as any);
  register(ABLY_EVENTS.ROOM_STATUS, handlers.onRoomStatus as any);
  register(ABLY_EVENTS.MOVIE_SUBMITTED, handlers.onMovieSubmitted as any);
  register(ABLY_EVENTS.SWIPE_PROGRESS, handlers.onSwipeProgress as any);
  register(ABLY_EVENTS.RESULTS_READY, handlers.onResultsReady as any);

  activeSubscriptions.set(roomCode, { channel, listeners });
}

export function unsubscribeFromRoom(roomCode: string): void {
  const sub = activeSubscriptions.get(roomCode);
  if (sub) {
    for (const { event, fn } of sub.listeners) {
      sub.channel.unsubscribe(event, fn);
    }
    activeSubscriptions.delete(roomCode);
  }
}

export interface BonusRoundHandlers {
  onBonusStarted?: (data: { bonusRoundId: string; movieIds: number[]; movies?: Movie[] }) => void;
  onBonusVote?: (data: { voteCount: number; totalMembers: number }) => void;
  onBonusCompleted?: (data: {
    winnerId: number;
    movie: Movie;
    voteTally: Record<number, number>;
  }) => void;
}

/**
 * Subscribe to bonus round events on a room channel. Returns an unsubscribe
 * function that removes only the bonus-event listeners (does not affect
 * subscriptions created by subscribeToRoom).
 */
export function subscribeToBonusEvents(
  roomCode: string,
  getToken: () => Promise<string>,
  handlers: BonusRoundHandlers
): () => void {
  const client = getAblyClient(roomCode, getToken);
  const channelName = getRoomChannelName(roomCode);
  const channel = client.channels.get(channelName);

  const startedListener = handlers.onBonusStarted
    ? (msg: Ably.Message) => handlers.onBonusStarted!(msg.data)
    : null;
  const voteListener = handlers.onBonusVote
    ? (msg: Ably.Message) => handlers.onBonusVote!(msg.data)
    : null;
  const completedListener = handlers.onBonusCompleted
    ? (msg: Ably.Message) => handlers.onBonusCompleted!(msg.data)
    : null;

  if (startedListener) channel.subscribe(ABLY_EVENTS.BONUS_STARTED, startedListener);
  if (voteListener) channel.subscribe(ABLY_EVENTS.BONUS_VOTE, voteListener);
  if (completedListener) channel.subscribe(ABLY_EVENTS.BONUS_COMPLETED, completedListener);

  return () => {
    if (startedListener) channel.unsubscribe(ABLY_EVENTS.BONUS_STARTED, startedListener);
    if (voteListener) channel.unsubscribe(ABLY_EVENTS.BONUS_VOTE, voteListener);
    if (completedListener) channel.unsubscribe(ABLY_EVENTS.BONUS_COMPLETED, completedListener);
  };
}
