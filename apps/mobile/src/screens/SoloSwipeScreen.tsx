import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { SwipeDeck, type SwipeDeckRef } from '../components/SwipeDeck';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import type { Movie } from '@reelrank/shared';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SoloSwipeScreen() {
  const navigation = useNavigation<Nav>();
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
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Discover</Text>
          <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <SkeletonCard />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Discover</Text>
        <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search" size={20} color={colors.text} />
        </TouchableOpacity>
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
          <Ionicons name="close" size={28} color={colors.danger} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.infoButton]}
          onPress={() => {
            const movie = movies[cardIndex];
            if (movie) navigation.navigate('MovieDetail', { movieId: movie.id });
          }}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => deckRef.current?.swipeRight()}
        >
          <Ionicons name="bookmark" size={24} color={colors.success} />
        </TouchableOpacity>
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>
          <Ionicons name="arrow-back" size={12} color={colors.textSecondary} /> Skip
        </Text>
        <Text style={styles.legendText}>
          Want to Watch <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} />
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topBarTitle: {
    ...typography.h2,
    color: colors.text,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: colors.danger,
    backgroundColor: `${colors.danger}15`,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
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
