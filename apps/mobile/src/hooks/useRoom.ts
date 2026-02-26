import { useEffect, useState, useCallback, useRef } from 'react';
import { subscribeToRoom, unsubscribeFromRoom } from '../config/ably';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ABLY_EVENTS } from '@reelrank/shared';
import type { Room, RoomMember } from '@reelrank/shared';

interface UseRoomReturn {
  room: Room | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRoom(roomCode: string | null): UseRoomReturn {
  const { getIdToken } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribers = useRef<Array<() => void>>([]);

  const refresh = useCallback(async () => {
    if (!roomCode) return;
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');
      const data = await api.rooms.get(roomCode, token);
      setRoom(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomCode, getIdToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!roomCode) return;

    const unsub1 = subscribeToRoom(roomCode, ABLY_EVENTS.MEMBER_JOINED, () => {
      refresh();
    });

    const unsub2 = subscribeToRoom(roomCode, ABLY_EVENTS.ROOM_STATUS_CHANGED, () => {
      refresh();
    });

    const unsub3 = subscribeToRoom(roomCode, ABLY_EVENTS.MOVIE_SUBMITTED, () => {
      refresh();
    });

    const unsub4 = subscribeToRoom(roomCode, ABLY_EVENTS.RESULTS_READY, () => {
      refresh();
    });

    unsubscribers.current = [unsub1, unsub2, unsub3, unsub4];

    return () => {
      unsubscribers.current.forEach((fn) => fn());
      unsubscribeFromRoom(roomCode);
    };
  }, [roomCode, refresh]);

  return { room, loading, error, refresh };
}
