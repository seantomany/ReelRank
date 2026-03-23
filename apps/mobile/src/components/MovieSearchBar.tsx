import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { api } from '../utils/api';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, borderRadius, spacing } from '../theme';
import type { Movie } from '@reelrank/shared';

interface MovieSearchBarProps {
  onSelect: (movie: Movie) => void;
  placeholder?: string;
}

export function MovieSearchBar({ onSelect, placeholder = 'Search movies...' }: MovieSearchBarProps) {
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
      onSelect(movie);
      setQuery('');
      setResults([]);
    },
    [onSelect]
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelect(item)}
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
            </TouchableOpacity>
          )}
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
});
