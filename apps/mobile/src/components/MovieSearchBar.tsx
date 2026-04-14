import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, borderRadius, spacing } from '../theme';
import type { Movie } from '@reelrank/shared';

interface MovieSearchBarProps {
  onSelect: (movie: Movie) => void;
  placeholder?: string;
  /** Set of movie IDs that have already been added — used to show an "Added" state in results. */
  addedIds?: Set<number>;
  /** If true, selected results remain in the list after selection (so user can see what they added). */
  keepResultsAfterSelect?: boolean;
}

export function MovieSearchBar({
  onSelect,
  placeholder = 'Search movies...',
  addedIds,
  keepResultsAfterSelect = false,
}: MovieSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await api.movies.search(query);
      if (res.data && typeof res.data === 'object' && 'movies' in res.data) {
        setResults((res.data as { movies: Movie[] }).movies.slice(0, 10));
      }
      setLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (movie: Movie) => {
      if (addedIds?.has(movie.id)) return;
      onSelect(movie);
      if (!keepResultsAfterSelect) {
        setQuery('');
        setResults([]);
      }
    },
    [onSelect, addedIds, keepResultsAfterSelect]
  );

  return (
    <View>
      <Searchbar
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
        loading={loading}
        style={styles.searchbar}
        inputStyle={styles.input}
      />
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          style={styles.resultsList}
          renderItem={({ item }) => {
            const isAdded = addedIds?.has(item.id) ?? false;
            return (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
                disabled={isAdded}
                activeOpacity={0.7}
              >
                <OptimizedImage
                  uri={getPosterUrl(item.posterPath, 'small')}
                  style={styles.poster}
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultYear}>
                    {item.releaseDate?.split('-')[0] ?? ''}
                  </Text>
                </View>
                {isAdded ? (
                  <View style={[styles.addButton, styles.addButtonAdded]}>
                    <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                    <Text style={styles.addedLabel}>Added</Text>
                  </View>
                ) : (
                  <View style={styles.addButton}>
                    <Ionicons name="add" size={20} color={colors.onAccent} />
                    <Text style={styles.addLabel}>Add</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchbar: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
  },
  input: {
    color: colors.text,
  },
  resultsList: {
    maxHeight: 300,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  resultItem: {
    flexDirection: 'row',
    padding: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  resultInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  resultYear: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
    gap: 2,
  },
  addButtonAdded: {
    backgroundColor: colors.success ?? colors.accent,
    opacity: 0.85,
  },
  addLabel: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: '600',
  },
  addedLabel: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
});
