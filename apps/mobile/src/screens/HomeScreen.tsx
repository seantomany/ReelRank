import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { registerForPushNotifications, scheduleDailyRecNotification, scheduleWeekendGroupReminder } from '../utils/notifications';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, getIdToken } = useAuth();
  const [stats, setStats] = useState({ totalSwipes: 0, moviesWatched: 0, winRate: 0 });
  const [trending, setTrending] = useState<Movie[]>([]);
  const [dailyRec, setDailyRec] = useState<{ movie: any; reason: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    try {
      const pushToken = await registerForPushNotifications();
      if (pushToken) {
        const authToken = await getIdToken();
        await api.users.savePushToken(pushToken, authToken);
        await scheduleDailyRecNotification();
        await scheduleWeekendGroupReminder();
      }
    } catch (err) {
      console.log('Notification setup skipped:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadData = async () => {
    try {
      const token = await getIdToken();
      const [statsRes, trendingRes, recRes, suggestionsRes, watchlistRes] = await Promise.all([
        api.solo.stats(token),
        api.movies.trending(),
        api.solo.dailyRec(token),
        api.solo.suggestions(token),
        api.solo.lists('want', token),
      ]);

      if (statsRes.data) setStats(statsRes.data as any);
      if (trendingRes.data && typeof trendingRes.data === 'object' && 'movies' in trendingRes.data) {
        setTrending((trendingRes.data as any).movies.slice(0, 10));
      }
      if (recRes.data) setDailyRec(recRes.data as any);
      if (suggestionsRes.data && Array.isArray(suggestionsRes.data)) {
        setSuggestions((suggestionsRes.data as Movie[]).slice(0, 10));
      }
      if (watchlistRes.data && Array.isArray(watchlistRes.data)) {
        setWatchlistCount(watchlistRes.data.length);
      }
    } catch (error) {
      console.error('Failed to load home data:', error);
      setSnackbar({ visible: true, message: 'Failed to load data. Pull to refresh.' });
    }
  };

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Movie Fan';
  const initials = displayName.charAt(0).toUpperCase();
  const uniqueRanked = (stats as any).uniqueRanked ?? 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          {user?.photoURL ? (
            <OptimizedImage uri={user.photoURL} style={styles.heroAvatar} />
          ) : (
            <View style={styles.heroAvatarFallback}>
              <Text style={styles.heroInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.heroText}>
            <Text style={styles.greeting}>Hey, {displayName}</Text>
            <Text style={styles.subtitle}>What are we watching?</Text>
          </View>
        </View>
        <View style={styles.heroAccent} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{uniqueRanked}</Text>
          <Text style={styles.statLabel}>Ranked</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{stats.moviesWatched}</Text>
          <Text style={styles.statLabel}>Watched</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{stats.winRate}%</Text>
          <Text style={styles.statLabel}>Like Rate</Text>
        </View>
      </View>

      {/* Contextual CTA */}
      <TouchableOpacity
        style={styles.ctaCard}
        activeOpacity={0.8}
        onPress={() => {
          if (watchlistCount >= 2) {
            navigation.navigate('ThisOrThat', { source: 'watchlist' });
          } else {
            navigation.navigate('Discover');
          }
        }}
      >
        <View style={styles.ctaLeft}>
          <Ionicons
            name={watchlistCount >= 2 ? 'swap-horizontal' : 'compass'}
            size={22}
            color={colors.primary}
          />
          <View>
            <Text style={styles.ctaTitle}>
              {watchlistCount >= 2
                ? `Rank your ${watchlistCount} watchlist movies`
                : 'Discover new movies'}
            </Text>
            <Text style={styles.ctaSubtitle}>
              {watchlistCount >= 2
                ? 'Use This or That to find your favorites'
                : 'Swipe to build your collection'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Quick Actions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('Discover')}>
          <Ionicons name="compass-outline" size={16} color={colors.primary} />
          <Text style={styles.pillLabel}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('AI')}>
          <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
          <Text style={styles.pillLabel}>AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('ThisOrThat')}>
          <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
          <Text style={styles.pillLabel}>This or That</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('CreateRoom')}>
          <Ionicons name="people-outline" size={16} color={colors.primary} />
          <Text style={styles.pillLabel}>Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search-outline" size={16} color={colors.primary} />
          <Text style={styles.pillLabel}>Search</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Today's Pick — prominent */}
      {dailyRec && dailyRec.movie && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Pick</Text>
          <TouchableOpacity
            style={styles.dailyCard}
            onPress={() => navigation.navigate('MovieDetail', { movieId: dailyRec.movie.id })}
            activeOpacity={0.85}
          >
            <OptimizedImage
              uri={getPosterUrl(dailyRec.movie.posterPath, 'large')}
              style={styles.dailyPoster}
            />
            <View style={styles.dailyOverlay}>
              <Text style={styles.dailyTitle} numberOfLines={2}>{dailyRec.movie.title}</Text>
              <Text style={styles.dailyReason} numberOfLines={2}>{dailyRec.reason}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Trending */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={trending}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.movieCard}
              onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
              activeOpacity={0.85}
            >
              <OptimizedImage
                uri={getPosterUrl(item.posterPath, 'medium')}
                style={styles.moviePoster}
              />
              <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={10} color={colors.warning} />
                <Text style={styles.ratingText}>{item.voteAverage.toFixed(1)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Suggested */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested For You</Text>
          <FlatList
            horizontal
            data={suggestions}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.movieCard}
                onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
                activeOpacity={0.85}
              >
                <OptimizedImage
                  uri={getPosterUrl(item.posterPath, 'medium')}
                  style={styles.moviePoster}
                />
                <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={10} color={colors.warning} />
                  <Text style={styles.ratingText}>{item.voteAverage.toFixed(1)}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={{ height: spacing.xxl + spacing.lg }} />

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

const POSTER_W = 140;
const POSTER_H = 210;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  heroAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  heroText: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 1,
  },
  heroAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ctaSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  pillRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAll: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  dailyCard: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    height: 200,
  },
  dailyPoster: {
    width: '100%',
    height: '100%',
  },
  dailyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dailyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  dailyReason: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  movieCard: {
    width: POSTER_W,
  },
  moviePoster: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  movieTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
