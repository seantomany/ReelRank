import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, Snackbar } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { api } from '../utils/api';
import { SwipeDeck, SwipeDeckRef } from '../components/SwipeDeck';
import { SkeletonCard } from '../components/SkeletonCard';
import { colors, spacing } from '../theme';
import type { Movie, SwipeDirection } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

interface GroupSwipeScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

export function GroupSwipeScreen({ navigation, route }: GroupSwipeScreenProps) {
  const { roomCode } = route.params as { roomCode: string };
  const { getIdToken } = useAuth();
  const { room } = useRoom(roomCode);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const deckRef = useRef<SwipeDeckRef>(null);

  useEffect(() => {
    if (room?.movies) {
      const movieList = (room.movies as any[])
        .map((m) => m.movie)
        .filter(Boolean) as Movie[];
      setMovies(movieList);
    }
  }, [room?.movies]);

  useEffect(() => {
    if (room?.status === 'results') {
      navigation.replace('GroupResults', { roomCode });
    }
  }, [room?.status, navigation, roomCode]);

  const handleSwipe = useCallback(async (movie: Movie, direction: SwipeDirection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex((prev) => prev + 1);
    try {
      const token = await getIdToken();
      await api.rooms.swipe(roomCode, movie.id, direction, token);
    } catch (error) {
      console.error('Failed to record swipe:', error);
      setSnackbar({ visible: true, message: 'Failed to save swipe' });
    }
  }, [roomCode, getIdToken]);

  useEffect(() => {
    if (movies.length > 0 && currentIndex >= movies.length) {
      const fetchResults = async () => {
        try {
          const token = await getIdToken();
          await api.rooms.results(roomCode, token);
        } catch {
          // results will come via Ably event
        }
      };
      fetchResults();
    }
  }, [currentIndex, movies.length, roomCode, getIdToken]);

  const progress = movies.length > 0 ? currentIndex / movies.length : 0;
  const done = movies.length > 0 && currentIndex >= movies.length;

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {done ? 'All done! Waiting for others...' : `${currentIndex + 1} of ${movies.length}`}
        </Text>
        <ProgressBar progress={progress} color={colors.primary} style={styles.progressBar} />
      </View>

      <View style={styles.deckContainer}>
        {movies.length === 0 ? (
          <SkeletonCard />
        ) : done ? (
          <View style={styles.doneContainer}>
            <Text style={styles.doneEmoji}>✅</Text>
            <Text style={styles.doneText}>
              You've swiped on all movies!{'\n'}Waiting for everyone to finish...
            </Text>
          </View>
        ) : (
          <SwipeDeck
            ref={deckRef}
            movies={movies}
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
          />
        )}
      </View>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  doneEmoji: {
    fontSize: 64,
  },
  doneText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});
