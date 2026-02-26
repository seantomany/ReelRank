import React from 'react';
import { View, Text, Image, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { MovieScore } from '@reelrank/shared';
import { colors, spacing, borderRadius, typography } from '../theme';

interface ScoreBreakdownProps {
  rankedMovies: MovieScore[];
  maxDisplay?: number;
}

function getMedalColor(rank: number): string | null {
  if (rank === 0) return '#FFD700';
  if (rank === 1) return '#C0C0C0';
  if (rank === 2) return '#CD7F32';
  return null;
}

export default function ScoreBreakdown({ rankedMovies, maxDisplay = 10 }: ScoreBreakdownProps) {
  const displayMovies = rankedMovies.slice(0, maxDisplay);

  return (
    <FlatList
      data={displayMovies}
      keyExtractor={(item) => String(item.movieId)}
      renderItem={({ item, index }) => {
        const medalColor = getMedalColor(index);
        const posterUri = item.movie.posterPath
          ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${item.movie.posterPath}`
          : null;
        const pct = Math.round(
          (item.rightSwipes / Math.max(item.totalVoters, 1)) * 100,
        );

        return (
          <View style={styles.row}>
            <View style={[styles.rank, medalColor ? { backgroundColor: `${medalColor}22` } : null]}>
              <Text style={[styles.rankText, medalColor ? { color: medalColor } : null]}>
                {index + 1}
              </Text>
            </View>

            {posterUri ? (
              <Image source={{ uri: posterUri }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.noPoster]}>
                <Ionicons name="film-outline" size={18} color={colors.textSecondary} />
              </View>
            )}

            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {item.movie.title}
              </Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>
                  {(item.finalScore * 100).toFixed(0)}pts
                </Text>
                <Text style={styles.voteSplit}>
                  {pct}% liked · {item.rightSwipes}↑ {item.leftSwipes}↓
                </Text>
              </View>
            </View>
          </View>
        );
      }}
      contentContainerStyle={styles.list}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  rankText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  poster: {
    width: 44,
    height: 66,
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
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreValue: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  voteSplit: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
