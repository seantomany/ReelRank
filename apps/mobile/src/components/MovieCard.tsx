import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { OptimizedImage } from './OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, borderRadius, spacing } from '../theme';
import type { Movie } from '@reelrank/shared';

export function getCardDimensions(screenWidth: number, screenHeight: number, availableHeight?: number) {
  const cardWidth = screenWidth - 24;
  const maxHeight = availableHeight ? availableHeight - 8 : screenHeight - 280;
  const cardHeight = Math.min(cardWidth * 1.5, maxHeight);
  return { cardWidth, cardHeight };
}

interface MovieCardProps {
  movie: Movie;
  availableHeight?: number;
  flipped?: boolean;
}

export function MovieCard({ movie, availableHeight, flipped = false }: MovieCardProps) {
  const { width, height } = useWindowDimensions();
  const { cardWidth, cardHeight } = getCardDimensions(width, height, availableHeight);
  const year = movie.releaseDate?.split('-')[0] ?? '';
  const rating = movie.voteAverage > 0 ? movie.voteAverage.toFixed(1) : null;

  const flipProgress = useSharedValue(flipped ? 1 : 0);
  useEffect(() => {
    flipProgress.value = withTiming(flipped ? 1 : 0, { duration: 260 });
  }, [flipped, flipProgress]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: flipProgress.value,
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: 1 - flipProgress.value * 0.9,
  }));

  return (
    <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
      <OptimizedImage
        uri={getPosterUrl(movie.posterPath, 'large')}
        style={styles.poster}
      />
      <Animated.View style={[styles.bottomGradient, frontStyle]} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        <Text style={styles.year}>{year}</Text>
      </Animated.View>
      <Animated.View
        style={[styles.backOverlay, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
      >
        <Text style={styles.backTitle}>{movie.title}</Text>
        <View style={styles.backMetaRow}>
          {!!year && <Text style={styles.backMeta}>{year}</Text>}
          {!!rating && <Text style={styles.backRating}>{rating} / 10</Text>}
        </View>
        <ScrollView
          style={styles.backScroll}
          contentContainerStyle={styles.backScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.backOverview}>
            {movie.overview || 'No description available.'}
          </Text>
        </ScrollView>
      </Animated.View>
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
  backOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.94)',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  backTitle: {
    color: '#e8e8e8',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  backMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  backMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  backRating: {
    color: colors.want,
    fontSize: 13,
    fontWeight: '600',
  },
  backScroll: {
    marginTop: 14,
    flex: 1,
  },
  backScrollContent: {
    paddingBottom: 48,
  },
  backOverview: {
    color: '#bbb',
    fontSize: 14,
    lineHeight: 21,
  },
});
