import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Text, Card, Chip, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { registerForPushNotifications, scheduleDailyRecNotification, scheduleWeekendGroupReminder } from '../utils/notifications';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, getIdToken } = useAuth();
  const [stats, setStats] = useState({ totalSwipes: 0, moviesWatched: 0, winRate: 0 });
  const [trending, setTrending] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [dailyRec, setDailyRec] = useState<{ movie: any; reason: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
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
      const [statsRes, trendingRes, genresRes, recRes, suggestionsRes] = await Promise.all([
        api.solo.stats(token),
        api.movies.trending(),
        api.movies.genres(),
        api.solo.dailyRec(token),
        api.solo.suggestions(token),
      ]);

      if (statsRes.data) setStats(statsRes.data as any);
      if (trendingRes.data && typeof trendingRes.data === 'object' && 'movies' in trendingRes.data) {
        setTrending((trendingRes.data as any).movies.slice(0, 10));
      }
      if (genresRes.data) setGenres((genresRes.data as any).slice(0, 8));
      if (recRes.data) setDailyRec(recRes.data as any);
      if (suggestionsRes.data && Array.isArray(suggestionsRes.data)) {
        setSuggestions((suggestionsRes.data as Movie[]).slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load home data:', error);
      setSnackbar({ visible: true, message: 'Failed to load data. Pull to refresh.' });
    }
  };

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Movie Fan';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey, {displayName}!</Text>
        <Text style={styles.subtitle}>What are we watching today?</Text>
      </View>

      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{(stats as any).uniqueRanked ?? 0}</Text>
          <Text style={styles.statLabel}>Ranked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.moviesWatched}</Text>
          <Text style={styles.statLabel}>Watched</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.winRate}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('SoloSwipe')}>
          <Ionicons name="swap-horizontal" size={28} color={colors.primary} />
          <Text style={styles.actionTitle}>Discover</Text>
          <Text style={styles.actionDesc}>Swipe to rank movies</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AI')}>
          <Ionicons name="sparkles" size={28} color={colors.accent} />
          <Text style={styles.actionTitle}>AI</Text>
          <Text style={styles.actionDesc}>Get recommendations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('CreateRoom')}>
          <Ionicons name="people" size={28} color={colors.primaryLight} />
          <Text style={styles.actionTitle}>Group</Text>
          <Text style={styles.actionDesc}>Decide with friends</Text>
        </TouchableOpacity>
      </View>

      {dailyRec && dailyRec.movie && (
        <TouchableOpacity
          style={styles.dailyRecCard}
          onPress={() => navigation.navigate('MovieDetail', { movieId: dailyRec.movie.id })}
          activeOpacity={0.8}
        >
          <OptimizedImage
            uri={getPosterUrl(dailyRec.movie.posterPath, 'medium')}
            style={styles.dailyRecPoster}
          />
          <View style={styles.dailyRecInfo}>
            <Text style={styles.dailyRecLabel}>Today's Pick</Text>
            <Text style={styles.dailyRecTitle} numberOfLines={2}>{dailyRec.movie.title}</Text>
            <Text style={styles.dailyRecReason} numberOfLines={2}>{dailyRec.reason}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAll}>Search All</Text>
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
              style={styles.trendingCard}
              onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
            >
              <OptimizedImage
                uri={getPosterUrl(item.posterPath, 'medium')}
                style={styles.trendingPoster}
              />
              <Text style={styles.trendingTitle} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

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
                style={styles.trendingCard}
                onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
              >
                <OptimizedImage
                  uri={getPosterUrl(item.posterPath, 'medium')}
                  style={styles.trendingPoster}
                />
                <Text style={styles.trendingTitle} numberOfLines={1}>{item.title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Genre</Text>
        <View style={styles.genreChips}>
          {genres.map((g) => (
            <Chip
              key={g.id}
              style={styles.genreChip}
              textStyle={styles.genreChipText}
              onPress={() => navigation.navigate('SoloSwipe', { genreId: g.id, genreName: g.name })}
            >
              {g.name}
            </Chip>
          ))}
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actionDesc: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
  },
  dailyRecCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  dailyRecPoster: {
    width: 80,
    height: 120,
  },
  dailyRecInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  dailyRecLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dailyRecTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.xs,
  },
  dailyRecReason: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAll: {
    color: colors.primary,
    fontSize: 14,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  trendingCard: {
    width: 120,
  },
  trendingPoster: {
    width: 120,
    height: 180,
    borderRadius: borderRadius.md,
  },
  trendingTitle: {
    color: colors.text,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  genreChip: {
    backgroundColor: colors.surfaceVariant,
  },
  genreChipText: {
    color: colors.text,
  },
});
