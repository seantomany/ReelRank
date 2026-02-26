import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { api } from '../utils/api';
import { SwipeDeck, type SwipeDeckRef } from '../components/SwipeDeck';
import MovieCard from '../components/MovieCard';
import type { Movie } from '@reelrank/shared';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function GroupSwipeScreen({ navigation, route }: RootStackScreenProps<'GroupSwipe'>) {
  const { roomCode } = route.params;
  const { getIdToken } = useAuth();
  const { room } = useRoom(roomCode);
  const deckRef = useRef<SwipeDeckRef>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    if (room?.status === 'results') {
      navigation.replace('GroupResults', { roomCode });
    }
  }, [room?.status, roomCode, navigation]);

  useEffect(() => {
    if (!room?.movies) return;

    Promise.all(
      room.movies.map((rm) => api.movies.getById(rm.movieId).catch(() => null)),
    ).then((results) => {
      setMovies(results.filter(Boolean) as Movie[]);
      setLoading(false);
    });
  }, [room?.movies]);

  const handleSwipe = useCallback(
    async (movie: Movie, direction: 'left' | 'right') => {
      try {
        const token = await getIdToken();
        if (token) {
          await api.rooms.swipe(roomCode, movie.id, direction, token);
        }
      } catch (err) {
        console.error('Group swipe failed:', err);
      }
    },
    [roomCode, getIdToken],
  );

  const handleFinished = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (token) {
        await api.rooms.results(roomCode, token);
      }
    } catch {
      navigation.replace('GroupResults', { roomCode });
    }
  }, [roomCode, getIdToken, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading candidates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          {Math.min(cardIndex + 1, movies.length)} / {movies.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(Math.min(cardIndex, movies.length) / movies.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <SwipeDeck
        ref={deckRef}
        data={movies}
        cardIndex={cardIndex}
        onIndexChange={setCardIndex}
        renderCard={(movie) => <MovieCard movie={movie} />}
        onSwipeLeft={(movie) => handleSwipe(movie, 'left')}
        onSwipeRight={(movie) => handleSwipe(movie, 'right')}
        onEmpty={() => (
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.doneTitle}>All done!</Text>
            <Text style={styles.doneSubtitle}>Waiting for other members to finish...</Text>
            <TouchableOpacity style={styles.resultsButton} onPress={handleFinished}>
              <Text style={styles.resultsButtonText}>View Results</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {cardIndex < movies.length && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={() => deckRef.current?.swipeLeft()}
          >
            <Ionicons name="close" size={32} color={colors.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => deckRef.current?.swipeRight()}
          >
            <Ionicons name="heart" size={32} color={colors.success} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  progress: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xxl,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  skipButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: colors.danger,
    backgroundColor: `${colors.danger}15`,
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  done: {
    alignItems: 'center',
    gap: spacing.md,
  },
  doneTitle: {
    ...typography.h2,
    color: colors.text,
  },
  doneSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  resultsButtonText: {
    ...typography.label,
    color: '#fff',
    fontSize: 16,
  },
});
