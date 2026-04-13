import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { MovieScore } from '@reelrank/shared';

interface ScoreBreakdownProps {
  scores: MovieScore[];
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const maxScore = scores.length > 0 ? scores[0].finalScore : 1;

  return (
    <FlatList
      data={scores}
      keyExtractor={(item) => String(item.movieId)}
      renderItem={({ item, index }) => {
        const barWidth = maxScore > 0 ? (item.finalScore / maxScore) * 100 : 0;

        return (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <OptimizedImage
              uri={getPosterUrl(item.movie.posterPath, 'small')}
              style={styles.poster}
            />
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {item.movie.title}
              </Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${Math.max(barWidth, 2)}%` }]} />
              </View>
              <Text style={styles.score}>
                {item.rightSwipes}/{item.totalVoters} voted yes
                {' · '}{Math.round(item.finalScore)}%
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: 'bold',
    width: 36,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  barContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginVertical: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  score: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
