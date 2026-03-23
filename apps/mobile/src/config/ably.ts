import * as Ably from 'ably';
import { API_URL } from './api';
import { getRoomChannelName, ABLY_EVENTS } from '@reelrank/shared';

let realtimeClient: Ably.Realtime | null = null;

function getAblyClient(getToken: () => Promise<string>): Ably.Realtime {
  if (!realtimeClient) {
    realtimeClient = new Ably.Realtime({
      authCallback: async (tokenParams, callback) => {
        try {
          const idToken = await getToken();
          const res = await fetch(`${API_URL}/api/auth/ably-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ roomCode: tokenParams.clientId }),
          });
          const json = await res.json();
          if (json.data) {
            callback(null, json.data);
          } else {
            callback(new Error(json.error ?? 'Failed to get Ably token'), null);
          }
        } catch (err) {
          callback(err as Error, null);
        }
      },
    });
  }
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

const activeSubscriptions = new Map<string, Ably.RealtimeChannel>();

export function subscribeToRoom(
  roomCode: string,
  handlers: RoomEventHandlers,
  getToken: () => Promise<string>
): void {
  const client = getAblyClient(getToken);
  const channelName = getRoomChannelName(roomCode);
  const channel = client.channels.get(channelName);

  if (handlers.onMemberJoined) {
    channel.subscribe(ABLY_EVENTS.MEMBER_JOINED, (msg) => handlers.onMemberJoined!(msg.data));
  }
  if (handlers.onMemberLeft) {
    channel.subscribe(ABLY_EVENTS.MEMBER_LEFT, (msg) => handlers.onMemberLeft!(msg.data));
  }
  if (handlers.onRoomStatus) {
    channel.subscribe(ABLY_EVENTS.ROOM_STATUS, (msg) => handlers.onRoomStatus!(msg.data));
  }
  if (handlers.onMovieSubmitted) {
    channel.subscribe(ABLY_EVENTS.MOVIE_SUBMITTED, (msg) => handlers.onMovieSubmitted!(msg.data));
  }
  if (handlers.onSwipeProgress) {
    channel.subscribe(ABLY_EVENTS.SWIPE_PROGRESS, (msg) => handlers.onSwipeProgress!(msg.data));
  }
  if (handlers.onResultsReady) {
    channel.subscribe(ABLY_EVENTS.RESULTS_READY, (msg) => handlers.onResultsReady!(msg.data));
  }

  activeSubscriptions.set(roomCode, channel);
}

export function unsubscribeFromRoom(roomCode: string): void {
  const channel = activeSubscriptions.get(roomCode);
  if (channel) {
    channel.unsubscribe();
    activeSubscriptions.delete(roomCode);
  }
}
