import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { subscribeToRoom, unsubscribeFromRoom, RoomEventHandlers } from '../config/ably';
import type { Room } from '@reelrank/shared';

const POLL_INTERVAL = 4000;

interface UseRoomReturn {
  room: Room | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRoom(roomCode: string): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getIdToken } = useAuth();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getIdToken();
      const result = await api.rooms.getRoom(roomCode, token);
      if (result.data) {
        setRoom(result.data as unknown as Room);
        setError(null);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
    }
  }, [roomCode, getIdToken]);

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      setLoading(true);
      try {
        const token = await getIdToken();
        const result = await api.rooms.getRoom(roomCode, token);
        if (!cancelled) {
          if (result.data) {
            setRoom(result.data as unknown as Room);
          } else if (result.error) {
            setError(result.error);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load room');
          setLoading(false);
        }
      }
    };

    loadRoom();

    const debouncedRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        if (!cancelled) refresh();
      }, 500);
    };

    const handlers: RoomEventHandlers = {
      onMemberJoined: () => debouncedRefresh(),
      onMemberLeft: () => debouncedRefresh(),
      onRoomStatus: () => debouncedRefresh(),
      onMovieSubmitted: () => debouncedRefresh(),
      onSwipeProgress: () => debouncedRefresh(),
      onResultsReady: () => debouncedRefresh(),
    };

    subscribeToRoom(roomCode, handlers, getIdToken);

    pollRef.current = setInterval(() => {
      if (!cancelled && AppState.currentState === 'active') {
        refresh();
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
      unsubscribeFromRoom(roomCode);
    };
  }, [roomCode, getIdToken, refresh]);

  return { room, loading, error, refresh };
}
