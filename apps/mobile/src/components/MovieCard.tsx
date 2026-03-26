import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';

export function getCardDimensions(screenWidth: number, screenHeight: number) {
  const cardWidth = screenWidth - 24;
  const maxHeight = screenHeight - 230;
  const cardHeight = Math.min(cardWidth * 1.4, maxHeight);
  return { cardWidth, cardHeight };
}

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const { width, height } = useWindowDimensions();
  const { cardWidth, cardHeight } = getCardDimensions(width, height);

  return (
    <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
      <OptimizedImage
        uri={getPosterUrl(movie.posterPath, 'large')}
        style={styles.poster}
      />
      <View style={styles.bottomGradient}>
        <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        <Text style={styles.year}>{movie.releaseDate?.split('-')[0] ?? ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 40,
    backgroundColor: 'transparent',
    backgroundImage: undefined,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  year: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
