import React from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';

export function getCardDimensions(screenWidth: number, screenHeight: number) {
  const cardWidth = screenWidth * 0.72;
  const maxHeight = screenHeight - 340;
  const cardHeight = Math.min(cardWidth * 1.4, maxHeight);
  return { cardWidth, cardHeight };
}

interface MovieCardProps {
  movie: Movie;
  onPress?: () => void;
}

export function MovieCard({ movie, onPress }: MovieCardProps) {
  const { width, height } = useWindowDimensions();
  const { cardWidth, cardHeight } = getCardDimensions(width, height);
  const year = movie.releaseDate?.split('-')[0] ?? '';

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth, height: cardHeight }]}
      onPress={onPress}
      activeOpacity={0.95}
    >
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    color: colors.onAccent,
    fontWeight: 'bold',
    fontSize: 13,
  },
  info: {
    padding: 14,
    backgroundColor: colors.overlayLight,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  year: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
});
