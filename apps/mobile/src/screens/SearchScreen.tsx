import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Searchbar, Text, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

interface SearchScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route?: RouteProp<any>;
}

export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const { getIdToken } = useAuth();
  const initialQuery = ((route?.params as any)?.query as string | undefined) ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      const res = await api.movies.search(query);
      if (!mountedRef.current) return;
      if (res.data && typeof res.data === 'object' && 'movies' in res.data) {
        setResults((res.data as any).movies);
      }
      setLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const saveToWatchlist = useCallback(async (movie: Movie) => {
    if (addedIds.has(movie.id)) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const token = await getIdToken();
      await api.solo.swipe(movie.id, 'right', token);
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.add(movie.id);
        return next;
      });
      setSnackbar({ visible: true, message: `${movie.title} added to watchlist!` });
    } catch (error) {
      console.error('Failed to save movie:', error);
      setSnackbar({ visible: true, message: 'Failed to save. Please try again.' });
    }
  }, [getIdToken, addedIds]);

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search movies..."
        value={query}
        onChangeText={setQuery}
        loading={loading}
        style={styles.searchbar}
        inputStyle={{ color: colors.text }}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
          >
            <OptimizedImage
              uri={getPosterUrl(item.posterPath, 'small')}
              style={styles.poster}
            />
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.releaseDate?.split('-')[0]} · {item.voteAverage.toFixed(1)}
              </Text>
              <Text style={styles.overview} numberOfLines={2}>{item.overview}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => saveToWatchlist(item)}
              disabled={addedIds.has(item.id)}
            >
              <Ionicons
                name={addedIds.has(item.id) ? 'checkmark-circle' : 'add-circle-outline'}
                size={28}
                color={addedIds.has(item.id) ? colors.success : colors.want}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.length >= 2 && !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No movies found</Text>
            </View>
          ) : null
        }
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={2000}
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
    paddingTop: spacing.md,
  },
  searchbar: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
  },
  list: {
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.sm,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  overview: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 4,
  },
  addButton: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
