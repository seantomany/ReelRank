import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Linking, TouchableOpacity } from 'react-native';
import { Text, Button, Chip, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getBackdropUrl, getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie, MovieUserStatus } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const TMDB_IMG = 'https://image.tmdb.org/t/p/w92';

interface Provider {
  id: number;
  name: string;
  logoPath: string;
}

interface ProvidersData {
  link: string | null;
  stream: Provider[];
  rent: Provider[];
  buy: Provider[];
  free: Provider[];
}

interface MovieDetailScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

export function MovieDetailScreen({ navigation, route }: MovieDetailScreenProps) {
  const { movieId } = route.params as { movieId: number };
  const { getIdToken } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [status, setStatus] = useState<MovieUserStatus | null>(null);
  const [providers, setProviders] = useState<ProvidersData | null>(null);
  const [friendRatings, setFriendRatings] = useState<
    { userId: string; displayName: string; photoUrl: string | null; rating: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadData();
  }, [movieId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const [movieRes, statusRes, provRes, friendsRes] = await Promise.all([
        api.movies.getMovie(movieId),
        api.solo.status(movieId, token),
        api.movies.getProviders(movieId),
        api.social.movieFriends(movieId, token),
      ]);
      if (movieRes.data) setMovie(movieRes.data as Movie);
      if (statusRes.data) setStatus(statusRes.data as MovieUserStatus);
      if (provRes.data) setProviders(provRes.data as ProvidersData);
      if (friendsRes.data && Array.isArray(friendsRes.data)) setFriendRatings(friendsRes.data as any);
    } catch (error) {
      console.error('Failed to load movie:', error);
      setSnackbar({ visible: true, message: 'Failed to load movie details' });
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchlist = async () => {
    if (!movie) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const token = await getIdToken();
      const direction = status?.swipeDirection === 'right' ? 'left' : 'right';
      await api.solo.swipe(movie.id, direction, token);
      setStatus((prev) => ({ ...prev, swipeDirection: direction }));
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
      setSnackbar({ visible: true, message: 'Failed to update watchlist' });
    }
  };

  if (loading || !movie) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isWanted = status?.swipeDirection === 'right';
  const isWatched = !!status?.watched;

  const hasProviders = providers && (
    providers.stream.length > 0 ||
    providers.rent.length > 0 ||
    providers.buy.length > 0 ||
    providers.free.length > 0
  );

  return (
    <ScrollView style={styles.container}>
      <OptimizedImage
        uri={getBackdropUrl(movie.backdropPath, 'large')}
        style={styles.backdrop}
      />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <OptimizedImage
            uri={getPosterUrl(movie.posterPath, 'medium')}
            style={styles.poster}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.meta}>
              {movie.releaseDate?.split('-')[0]} · {movie.voteAverage.toFixed(1)} / 10
            </Text>
            {isWatched && status?.watched && (
              <Chip icon="check" style={styles.watchedChip} textStyle={styles.watchedChipText}>
                Watched · {status.watched.rating}/10
              </Chip>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            mode={isWanted ? 'contained' : 'outlined'}
            onPress={toggleWatchlist}
            style={styles.actionButton}
            icon={() => <Ionicons name={isWanted ? 'heart' : 'heart-outline'} size={18} color={isWanted ? colors.onPrimary : colors.want} />}
          >
            {isWanted ? 'In Watchlist' : 'Add to Watchlist'}
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('LogWatched', { movieId: movie.id })}
            style={styles.actionButton}
            icon={() => <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />}
          >
            Log Watched
          </Button>
        </View>

        {hasProviders && (
          <View style={styles.providersSection}>
            <Text style={styles.sectionTitle}>Where to Watch</Text>
            {providers!.stream.length > 0 && (
              <ProviderRow label="Stream" items={providers!.stream} />
            )}
            {providers!.free.length > 0 && (
              <ProviderRow label="Free" items={providers!.free} />
            )}
            {providers!.rent.length > 0 && (
              <ProviderRow label="Rent" items={providers!.rent} />
            )}
            {providers!.buy.length > 0 && (
              <ProviderRow label="Buy" items={providers!.buy} />
            )}
            {providers!.link && (
              <TouchableOpacity
                onPress={() => Linking.openURL(providers!.link!)}
                style={styles.tmdbLink}
              >
                <Text style={styles.tmdbLinkText}>View all options on TMDB</Text>
                <Ionicons name="open-outline" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {friendRatings.length > 0 && (
          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Friends Who Watched</Text>
            {friendRatings.map((fr) => (
              <View key={fr.userId} style={styles.friendRow}>
                <View style={styles.friendAvatar}>
                  {fr.photoUrl ? (
                    <OptimizedImage uri={fr.photoUrl} style={styles.friendAvatarImg} />
                  ) : (
                    <Text style={styles.friendAvatarText}>{fr.displayName.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <Text style={styles.friendName}>{fr.displayName}</Text>
                {fr.rating != null && (
                  <Text style={styles.friendRating}>{fr.rating}/10</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.overview}>{movie.overview}</Text>
      </View>

      <View style={{ height: spacing.xxl }} />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

function ProviderRow({ label, items }: { label: string; items: Provider[] }) {
  return (
    <View style={styles.providerRow}>
      <Text style={styles.providerLabel}>{label}</Text>
      <View style={styles.providerLogos}>
        {items.slice(0, 6).map((p) => (
          <View key={p.id} style={styles.providerItem}>
            <OptimizedImage
              uri={`${TMDB_IMG}${p.logoPath}`}
              style={styles.providerLogo}
            />
            <Text style={styles.providerName} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    width,
    height: width * 0.56,
  },
  content: {
    padding: spacing.lg,
    marginTop: -spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.md,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  watchedChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.success,
  },
  watchedChipText: {
    color: colors.onPrimary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  overview: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  providersSection: {
    marginTop: spacing.md,
  },
  providerRow: {
    marginBottom: spacing.md,
  },
  providerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerLogos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  providerItem: {
    alignItems: 'center',
    width: 56,
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
  },
  providerName: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  tmdbLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tmdbLinkText: {
    fontSize: 13,
    color: colors.primary,
  },
  friendsSection: {
    marginTop: spacing.md,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  friendAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  friendAvatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  friendName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  friendRating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
