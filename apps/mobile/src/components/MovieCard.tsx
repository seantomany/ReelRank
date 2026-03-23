import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

interface MovieCardProps {
  movie: Movie;
  onPress?: () => void;
}

export function MovieCard({ movie }: MovieCardProps) {
  const year = movie.releaseDate?.split('-')[0] ?? '';

  return (
    <View style={styles.card}>
      <OptimizedImage
        uri={getPosterUrl(movie.posterPath, 'large')}
        style={styles.poster}
      />
      <View style={styles.overlay}>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>
            {movie.voteAverage.toFixed(1)}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
          {year ? <Text style={styles.year}>{year}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export { CARD_WIDTH, CARD_HEIGHT };

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.round,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    color: colors.onAccent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  info: {
    padding: 16,
    backgroundColor: colors.overlayLight,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  year: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 4,
  },
});
