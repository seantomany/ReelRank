import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie, MovieUserStatus } from '@reelrank/shared';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MovieDetailScreen({ route, navigation }: RootStackScreenProps<'MovieDetail'>) {
  const { movieId } = route.params;
  const { getIdToken } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [userStatus, setUserStatus] = useState<MovieUserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const movieData = await api.movies.getById(movieId);
        setMovie(movieData);
        const token = await getIdToken();
        if (token) {
          const status = await api.solo.movieStatus(movieId, token);
          setUserStatus(status);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [movieId, getIdToken]);

  const handleSaveToWatchlist = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      await api.solo.swipe(movieId, 'right', token);
      setUserStatus((prev) => ({ ...prev, swipeDirection: 'right' }));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

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

  const isOnWatchlist = userStatus?.swipeDirection === 'right';
  const isWatched = !!userStatus?.watched;

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

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isOnWatchlist && styles.actionBtnActive]}
            onPress={handleSaveToWatchlist}
          >
            <Ionicons
              name={isOnWatchlist ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isOnWatchlist ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.actionBtnText, isOnWatchlist && styles.actionBtnTextActive]}>
              {isOnWatchlist ? 'Saved' : 'Watchlist'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isWatched && styles.actionBtnWatched]}
            onPress={() => navigation.navigate('LogWatched', { movieId: movie.id, movieTitle: movie.title })}
          >
            <Ionicons
              name={isWatched ? 'eye' : 'eye-outline'}
              size={18}
              color={isWatched ? colors.success : colors.textSecondary}
            />
            <Text style={[styles.actionBtnText, isWatched && styles.actionBtnTextWatched]}>
              {isWatched ? 'Watched' : 'Log It'}
            </Text>
          </TouchableOpacity>
        </View>

        {isWatched && userStatus?.watched && (
          <View style={styles.watchedCard}>
            <View style={styles.watchedHeader}>
              <Ionicons name="eye" size={16} color={colors.success} />
              <Text style={styles.watchedTitle}>Your Log</Text>
            </View>
            <View style={styles.watchedDetails}>
              <View style={styles.watchedDetail}>
                <Text style={styles.watchedLabel}>Rating</Text>
                <Text style={styles.watchedValue}>{userStatus.watched.rating}/10</Text>
              </View>
              <View style={styles.watchedDetail}>
                <Text style={styles.watchedLabel}>Venue</Text>
                <Text style={styles.watchedValue}>{userStatus.watched.venue}</Text>
              </View>
              <View style={styles.watchedDetail}>
                <Text style={styles.watchedLabel}>Date</Text>
                <Text style={styles.watchedValue}>{userStatus.watched.watchedAt?.slice(0, 10)}</Text>
              </View>
            </View>
            {userStatus.watched.notes ? (
              <Text style={styles.watchedNotes}>{userStatus.watched.notes}</Text>
            ) : null}
          </View>
        )}

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
            <View style={{ flex: 1 }}>
              <Text style={styles.trendingTitle}>Why it's trending</Text>
              <Text style={styles.trendingDesc}>
                High engagement — {movie.voteCount.toLocaleString()} people have
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
    marginBottom: spacing.md,
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  actionBtnWatched: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  actionBtnText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  actionBtnTextActive: {
    color: colors.primary,
  },
  actionBtnTextWatched: {
    color: colors.success,
  },
  watchedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  watchedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  watchedTitle: {
    ...typography.label,
    color: colors.success,
  },
  watchedDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  watchedDetail: {
    gap: 2,
  },
  watchedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  watchedValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  watchedNotes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
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
