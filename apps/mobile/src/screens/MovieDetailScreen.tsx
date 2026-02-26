import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie } from '@reelrank/shared';
import { api } from '../utils/api';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MovieDetailScreen({ route }: RootStackScreenProps<'MovieDetail'>) {
  const { movieId } = route.params;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.movies
      .getById(movieId)
      .then(setMovie)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading || !movie) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const backdropUri = movie.backdropPath
    ? `${TMDB_IMAGE_BASE_URL}/original${movie.backdropPath}`
    : null;
  const posterUri = movie.posterPath
    ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.large}${movie.posterPath}`
    : null;

  const popularityTier =
    movie.popularity > 100 ? 'Trending' : movie.popularity > 50 ? 'Popular' : 'Niche';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.backdrop}>
        {backdropUri ? (
          <Image source={{ uri: backdropUri }} style={styles.backdropImage} resizeMode="cover" />
        ) : posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.backdropImage} resizeMode="cover" />
        ) : (
          <View style={[styles.backdropImage, { backgroundColor: colors.card }]} />
        )}
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.backdropGradient}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          {posterUri && (
            <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
          )}
          <View style={styles.titleInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.year}>{movie.releaseDate?.slice(0, 4)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBadge
            icon="star"
            iconColor={colors.accent}
            value={movie.voteAverage.toFixed(1)}
            label={`${movie.voteCount.toLocaleString()} votes`}
          />
          <StatBadge
            icon="trending-up"
            iconColor={colors.primary}
            value={Math.round(movie.popularity).toString()}
            label={popularityTier}
          />
        </View>

        {movie.popularity > 80 && (
          <View style={styles.trendingCard}>
            <Ionicons name="flame" size={18} color={colors.accent} />
            <View>
              <Text style={styles.trendingTitle}>Why it's trending</Text>
              <Text style={styles.trendingDesc}>
                High search volume and engagement — {movie.voteCount.toLocaleString()} people have
                rated this movie with a {movie.voteAverage.toFixed(1)} average score.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.overview}>{movie.overview || 'No overview available.'}</Text>
      </View>
    </ScrollView>
  );
}

function StatBadge({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statBadge}>
      <Ionicons name={icon as any} size={18} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  backdrop: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  content: {
    padding: spacing.lg,
    marginTop: -spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.md,
  },
  titleInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  year: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  trendingCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,215,0,0.08)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  trendingTitle: {
    ...typography.label,
    color: colors.accent,
    marginBottom: 4,
  },
  trendingDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  overview: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
});
