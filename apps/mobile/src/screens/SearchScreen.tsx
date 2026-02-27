import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie } from '@reelrank/shared';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function SearchScreen({ navigation }: RootStackScreenProps<'Search'>) {
  const { getIdToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.movies.search(text.trim());
      setResults(data.movies);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => search(text), 350);
    },
    [search],
  );

  const handleSave = useCallback(
    async (movie: Movie) => {
      try {
        const token = await getIdToken();
        if (token) {
          await api.solo.swipe(movie.id, 'right', token);
        }
      } catch {}
    },
    [getIdToken],
  );

  const renderItem = ({ item }: { item: Movie }) => {
    const posterUri = item.posterPath
      ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.medium}${item.posterPath}`
      : null;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
      >
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.noPoster]}>
            <Ionicons name="film-outline" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.movieTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.releaseDate?.slice(0, 4)} · ★ {item.voteAverage.toFixed(1)}
          </Text>
          {item.overview ? (
            <Text style={styles.overview} numberOfLines={2}>{item.overview}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(item)}>
          <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          placeholder="Search for any movie..."
          placeholderTextColor={colors.textSecondary}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => { Keyboard.dismiss(); search(query); }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : results.length === 0 && searched ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No movies found</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Search for movies by title</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
  },
  poster: {
    width: 56,
    height: 84,
    borderRadius: borderRadius.sm,
  },
  noPoster: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  movieTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overview: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  saveBtn: {
    padding: spacing.sm,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
