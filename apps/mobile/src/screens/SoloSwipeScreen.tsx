import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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

const GENRE_BAR_HEIGHT = 40;
const ACTION_BAR_HEIGHT = 72;
const LOW_DECK_THRESHOLD = 3;
const MAX_SKIP_PAGES = 5;

export function SoloSwipeScreen({ navigation, route }: SoloSwipeScreenProps) {
  const { getIdToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const deckAvailableHeight = screenHeight - insets.top - GENRE_BAR_HEIGHT - ACTION_BAR_HEIGHT - insets.bottom - 48;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(
    (route.params as any)?.genreId ?? null
  );
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const deckRef = useRef<SwipeDeckRef>(null);
  const seenMovieIds = useRef(new Set<number>());
  const [swipedIdsReady, setSwipedIdsReady] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    loadGenres();
    loadSwipedIds();
  }, []);

  const loadSwipedIds = async () => {
    try {
      const token = await getIdToken();
      const res = await api.solo.swipedIds(token);
      if (res.data && Array.isArray(res.data)) {
        for (const id of res.data) seenMovieIds.current.add(id as number);
      }
    } catch {
      // non-critical — proceed with empty filter
    }
    setSwipedIdsReady(true);
  };

  const loadGenres = async () => {
    const res = await api.movies.genres();
    if (res.data) setGenres(res.data as any);
  };

  // Fetch a single page and append (or replace) unswiped movies into the deck.
  const fetchPage = useCallback(
    async (
      pageNum: number,
      genre: number | null,
      { replace = false }: { replace?: boolean } = {},
    ): Promise<number> => {
      if (fetchingRef.current) return 0;
      fetchingRef.current = true;
      try {
        const res = genre
          ? await api.movies.discover(genre, pageNum)
          : await api.movies.trending(pageNum);
        if (!res.data || typeof res.data !== 'object' || !('movies' in res.data)) {
          return 0;
        }
        const data = res.data as { movies: Movie[]; totalPages?: number };
        if (typeof data.totalPages === 'number') setTotalPages(data.totalPages);
        const fresh = data.movies.filter((m) => !seenMovieIds.current.has(m.id));
        if (replace) {
          setMovies(fresh);
          setCurrentIndex(0);
        } else if (fresh.length > 0) {
          setMovies((prev) => [...prev, ...fresh]);
        }
        return fresh.length;
      } catch {
        setSnackbar({ visible: true, message: 'Failed to load movies' });
        return 0;
      } finally {
        fetchingRef.current = false;
      }
    },
    [],
  );

  // Reload the deck when genre changes, walking pages forward until we get
  // at least one unswiped movie (capped at MAX_SKIP_PAGES).
  const loadInitialDeck = useCallback(
    async (genre: number | null) => {
      setLoading(true);
      setMovies([]);
      setCurrentIndex(0);
      let startPage = 1;
      let skipped = 0;
      while (skipped < MAX_SKIP_PAGES) {
        const count = await fetchPage(startPage, genre, { replace: true });
        if (count > 0) break;
        skipped++;
        startPage++;
      }
      setPage(startPage);
      setLoading(false);
    },
    [fetchPage],
  );

  useEffect(() => {
    if (!swipedIdsReady) return;
    loadInitialDeck(selectedGenre);
  }, [selectedGenre, swipedIdsReady, loadInitialDeck]);

  // Auto pre-fetch the next page when the deck gets low.
  useEffect(() => {
    const remaining = movies.length - currentIndex;
    if (
      !loading &&
      remaining > 0 &&
      remaining <= LOW_DECK_THRESHOLD &&
      page < totalPages &&
      !fetchingRef.current
    ) {
      const next = page + 1;
      setPage(next);
      fetchPage(next, selectedGenre);
    }
  }, [movies.length, currentIndex, page, totalPages, selectedGenre, loading, fetchPage]);

  // When user navigates back to this screen, re-filter the deck
  useFocusEffect(
    useCallback(() => {
      if (movies.length > 0) {
        const filtered = movies.filter((m) => !seenMovieIds.current.has(m.id));
        if (filtered.length !== movies.length) {
          setMovies(filtered);
          setCurrentIndex(0);
        }
      }
    }, [movies])
  );

  const handleSwipe = useCallback(async (movie: Movie, direction: SwipeDirection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    seenMovieIds.current.add(movie.id);
    setCurrentIndex((prev) => prev + 1);
    try {
      const token = await getIdToken();
      await api.solo.swipe(movie.id, direction, token);
    } catch {
      setSnackbar({ visible: true, message: 'Failed to save swipe.' });
    }
  }, [getIdToken]);

  return (
    <View style={styles.container}>
      {/* Thin genre bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.genreBarOuter}
        contentContainerStyle={styles.genreBar}
      >
        <TouchableOpacity
          style={[styles.pill, !selectedGenre && styles.pillActive]}
          onPress={() => setSelectedGenre(null)}
        >
          <Text style={[styles.pillText, !selectedGenre && styles.pillTextActive]}>Trending</Text>
        </TouchableOpacity>
        {genres.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.pill, selectedGenre === g.id && styles.pillActive]}
            onPress={() => setSelectedGenre(g.id)}
          >
            <Text style={[styles.pillText, selectedGenre === g.id && styles.pillTextActive]}>{g.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Card area */}
      <View style={styles.deckArea}>
        {loading ? (
          <SkeletonCard />
        ) : currentIndex >= movies.length ? (
          <View style={styles.emptyState}>
            <Ionicons name="film-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No more movies</Text>
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => {
                const next = page + 1;
                setPage(next);
                fetchPage(next, selectedGenre);
              }}
            >
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
            availableHeight={deckAvailableHeight}
          />
        )}
      </View>

      {/* Action buttons */}
      {!loading && currentIndex < movies.length && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.pass + '50', backgroundColor: colors.pass + '10' }]}
            onPress={() => deckRef.current?.swipeLeft()}
          >
            <Ionicons name="close" size={28} color={colors.pass} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSm, { borderColor: colors.success + '50', backgroundColor: colors.success + '10' }]}
            onPress={() => {
              const m = movies[currentIndex];
              if (m) {
                seenMovieIds.current.add(m.id);
                navigation.navigate('LogWatched', { movieId: m.id });
              }
            }}
          >
            <Ionicons name="eye" size={20} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.want + '50', backgroundColor: colors.want + '10' }]}
            onPress={() => deckRef.current?.swipeRight()}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  genreBarOuter: {
    maxHeight: GENRE_BAR_HEIGHT,
    flexGrow: 0,
  },
  genreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: GENRE_BAR_HEIGHT,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
  deckArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  loadMoreBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
