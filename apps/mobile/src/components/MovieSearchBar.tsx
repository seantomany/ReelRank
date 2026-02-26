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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie } from '@reelrank/shared';
import { api } from '../utils/api';
import { colors, spacing, borderRadius, typography } from '../theme';

interface MovieSearchBarProps {
  onSelect: (movie: Movie) => void;
  placeholder?: string;
}

export default function MovieSearchBar({ onSelect, placeholder = 'Search movies...' }: MovieSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.movies.search(text.trim());
      setResults(data.movies.slice(0, 8));
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
      debounceTimer.current = setTimeout(() => search(text), 400);
    },
    [search],
  );

  const handleSelect = useCallback(
    (movie: Movie) => {
      onSelect(movie);
      setQuery('');
      setResults([]);
    },
    [onSelect],
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          style={styles.results}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const posterUri = item.posterPath
              ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${item.posterPath}`
              : null;

            return (
              <TouchableOpacity style={styles.result} onPress={() => handleSelect(item)}>
                {posterUri ? (
                  <Image source={{ uri: posterUri }} style={styles.resultPoster} />
                ) : (
                  <View style={[styles.resultPoster, styles.noPoster]}>
                    <Ionicons name="film-outline" size={14} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.resultYear}>
                    {item.releaseDate?.slice(0, 4)} · ★ {item.voteAverage.toFixed(1)}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  results: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    maxHeight: 320,
    borderWidth: 1,
    borderColor: colors.border,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultPoster: {
    width: 36,
    height: 54,
    borderRadius: 4,
  },
  noPoster: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  resultYear: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
