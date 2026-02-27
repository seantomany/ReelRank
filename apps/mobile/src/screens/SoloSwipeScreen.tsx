import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { SwipeDeck, type SwipeDeckRef } from '../components/SwipeDeck';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import type { Movie } from '@reelrank/shared';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function SoloSwipeScreen({ navigation }: RootStackScreenProps<'SoloSwipe'>) {
  const { getIdToken } = useAuth();
  const deckRef = useRef<SwipeDeckRef>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);

  const loadMovies = useCallback(async (p: number) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const data = await api.movies.trending(p);
      setMovies((prev) => (p === 1 ? data.movies : [...prev, ...data.movies]));
    } catch (err) {
      console.error('Failed to load movies:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies(1);
  }, [loadMovies]);

  useEffect(() => {
    if (cardIndex > 0 && cardIndex >= movies.length - 3 && movies.length > 0) {
      pageRef.current += 1;
      loadMovies(pageRef.current);
    }
  }, [cardIndex, movies.length, loadMovies]);

  const handleSwipe = useCallback(
    async (movie: Movie, direction: 'left' | 'right') => {
      try {
        const token = await getIdToken();
        if (token) {
          await api.solo.swipe(movie.id, direction, token);
        }
      } catch (err) {
        console.error('Swipe failed:', err);
      }
    },
    [getIdToken],
  );

  if (loading && movies.length === 0) {
    return (
      <View style={styles.container}>
        <SkeletonCard />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SwipeDeck
        ref={deckRef}
        data={movies}
        cardIndex={cardIndex}
        onIndexChange={setCardIndex}
        renderCard={(movie) => <MovieCard movie={movie} />}
        onSwipeLeft={(movie) => handleSwipe(movie, 'left')}
        onSwipeRight={(movie) => handleSwipe(movie, 'right')}
        onEmpty={() => (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>Check back later for more movies</Text>
          </View>
        )}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.skipButton]}
          onPress={() => deckRef.current?.swipeLeft()}
        >
          <Ionicons name="close" size={32} color={colors.danger} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.infoButton]}
          onPress={() => {
            const movie = movies[cardIndex];
            if (movie) navigation.navigate('MovieDetail', { movieId: movie.id });
          }}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => deckRef.current?.swipeRight()}
        >
          <Ionicons name="heart" size={32} color={colors.success} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.rankButton}
        onPress={() => navigation.navigate('ThisOrThat')}
      >
        <Ionicons name="trophy-outline" size={18} color={colors.accent} />
        <Text style={styles.rankText}>Refine Rankings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.lg,
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
  infoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  rankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  rankText: {
    ...typography.label,
    color: colors.accent,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
