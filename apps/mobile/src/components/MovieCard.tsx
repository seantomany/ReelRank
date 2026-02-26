import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie } from '@reelrank/shared';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface MovieCardProps {
  movie: Movie;
  showOverlay?: 'left' | 'right' | null;
}

function formatYear(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 4);
}

function getPopularityLabel(popularity: number): string | null {
  if (popularity > 100) return 'Trending Now';
  if (popularity > 50) return 'Popular';
  return null;
}

export default function MovieCard({ movie, showOverlay }: MovieCardProps) {
  const posterUri = movie.posterPath
    ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.large}${movie.posterPath}`
    : null;

  const popularityLabel = getPopularityLabel(movie.popularity);

  return (
    <View style={styles.card}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.noPoster]}>
          <Ionicons name="film-outline" size={64} color={colors.textSecondary} />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      <View style={styles.info}>
        {popularityLabel && (
          <View style={styles.trendingBadge}>
            <Ionicons name="trending-up" size={12} color={colors.accent} />
            <Text style={styles.trendingText}>{popularityLabel}</Text>
          </View>
        )}

        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>

        <Text style={styles.year}>{formatYear(movie.releaseDate)}</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="star" size={14} color={colors.accent} />
            <Text style={styles.statText}>
              {movie.voteAverage.toFixed(1)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statTextSecondary}>
              {movie.voteCount.toLocaleString()} votes
            </Text>
          </View>
        </View>
      </View>

      {showOverlay === 'right' && (
        <View style={[styles.overlayBadge, styles.likeBadge]}>
          <Text style={[styles.overlayText, { color: colors.success }]}>LIKE</Text>
        </View>
      )}

      {showOverlay === 'left' && (
        <View style={[styles.overlayBadge, styles.skipBadge]}>
          <Text style={[styles.overlayText, { color: colors.danger }]}>SKIP</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: 4,
  },
  trendingText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 2,
  },
  year: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '700',
  },
  statTextSecondary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  overlayBadge: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 3,
  },
  likeBadge: {
    left: 20,
    borderColor: colors.success,
    transform: [{ rotate: '-15deg' }],
  },
  skipBadge: {
    right: 20,
    borderColor: colors.danger,
    transform: [{ rotate: '15deg' }],
  },
  overlayText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
});

export { CARD_WIDTH, CARD_HEIGHT };
