import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Chip, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { SwipeDeck, SwipeDeckRef } from '../components/SwipeDeck';
import { SkeletonCard } from '../components/SkeletonCard';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie, SwipeDirection } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

interface SoloSwipeScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

const seenMovieIds = new Set<number>();

export function SoloSwipeScreen({ navigation, route }: SoloSwipeScreenProps) {
  const { getIdToken } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(
    (route.params as any)?.genreId ?? null
  );
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const deckRef = useRef<SwipeDeckRef>(null);

  useEffect(() => {
    loadGenres();
  }, []);

  useEffect(() => {
    setPage(1);
    loadMovies(1);
  }, [selectedGenre]);

  const loadGenres = async () => {
    const res = await api.movies.genres();
    if (res.data) setGenres(res.data as any);
  };

  const loadMovies = async (p = page) => {
    setLoading(true);
    try {
      let res;
      if (selectedGenre) {
        res = await api.movies.discover(selectedGenre, p);
      } else {
        res = await api.movies.trending(p);
      }
      if (res.data && typeof res.data === 'object' && 'movies' in res.data) {
        const fresh = ((res.data as any).movies as Movie[]).filter(
          (m) => !seenMovieIds.has(m.id)
        );
        setMovies(fresh);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Failed to load movies:', error);
      setSnackbar({ visible: true, message: 'Failed to load movies' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadMovies(next);
  };

  const handleSwipe = useCallback(async (movie: Movie, direction: SwipeDirection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    seenMovieIds.add(movie.id);
    setCurrentIndex((prev) => prev + 1);
    try {
      const token = await getIdToken();
      await api.solo.swipe(movie.id, direction, token);
    } catch (error) {
      console.error('Failed to record swipe:', error);
      setSnackbar({ visible: true, message: 'Failed to save swipe. Please try again.' });
    }
  }, [getIdToken]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreBar}
      >
        <Chip
          selected={!selectedGenre}
          onPress={() => setSelectedGenre(null)}
          style={[styles.genreChip, !selectedGenre && styles.genreChipSelected]}
          textStyle={[styles.chipText, !selectedGenre && styles.chipTextSelected]}
        >
          Trending
        </Chip>
        {genres.map((g) => (
          <Chip
            key={g.id}
            selected={selectedGenre === g.id}
            onPress={() => setSelectedGenre(g.id)}
            style={[styles.genreChip, selectedGenre === g.id && styles.genreChipSelected]}
            textStyle={[styles.chipText, selectedGenre === g.id && styles.chipTextSelected]}
          >
            {g.name}
          </Chip>
        ))}
      </ScrollView>

      <View style={styles.deckContainer}>
        {loading ? (
          <SkeletonCard />
        ) : currentIndex >= movies.length ? (
          <View style={styles.emptyState}>
            <Ionicons name="film-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No more movies!</Text>
            <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SwipeDeck
            ref={deckRef}
            movies={movies}
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
            onCardPress={(movie) => navigation.navigate('MovieDetail', { movieId: movie.id })}
          />
        )}
      </View>

      {!loading && currentIndex < movies.length && (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.circleBtn, styles.passBtnStyle]}
            onPress={() => deckRef.current?.swipeLeft()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={colors.pass} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.circleBtn, styles.watchedBtnStyle]}
            onPress={() => {
              const m = movies[currentIndex];
              if (m) navigation.navigate('LogWatched', { movieId: m.id });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={24} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.circleBtn, styles.wantBtnStyle]}
            onPress={() => deckRef.current?.swipeRight()}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={26} color={colors.want} />
          </TouchableOpacity>
        </View>
      )}

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

const CIRCLE_SIZE = 56;
const CIRCLE_SIZE_SM = 46;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  genreBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  genreChip: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: 'transparent',
    height: 32,
  },
  genreChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextSelected: {
    color: colors.onPrimary,
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  loadMoreBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
  loadMoreText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  circleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.round,
  },
  passBtnStyle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderColor: colors.pass + '60',
    backgroundColor: colors.pass + '10',
  },
  watchedBtnStyle: {
    width: CIRCLE_SIZE_SM,
    height: CIRCLE_SIZE_SM,
    borderColor: colors.success + '60',
    backgroundColor: colors.success + '10',
  },
  wantBtnStyle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderColor: colors.want + '60',
    backgroundColor: colors.want + '10',
  },
});
