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
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl, getBackdropUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { Movie } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

interface FeedItem {
  id: string;
  userId: string;
  movieId: number;
  rating: number | null;
  friend: { displayName: string; photoUrl: string | null };
  movie: { id: number; title: string; posterPath: string };
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, getIdToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadData = async () => {
    try {
      const token = await getIdToken();
      const [statsRes, trendingRes, suggestionsRes, feedRes, watchlistRes] = await Promise.all([
        api.solo.stats(token),
        api.movies.trending(),
        api.solo.suggestions(token),
        api.social.feed(token),
        api.solo.lists('want', token),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (Array.isArray(watchlistRes.data)) {
        setWatchlistCount(watchlistRes.data.length);
      }
      if (trendingRes.data && typeof trendingRes.data === 'object' && 'movies' in trendingRes.data) {
        setTrending((trendingRes.data as any).movies.slice(0, 12));
      }
      if (suggestionsRes.data && Array.isArray(suggestionsRes.data)) {
        setSuggestions((suggestionsRes.data as Movie[]).slice(0, 12));
      }
      if (feedRes.data && Array.isArray(feedRes.data)) {
        setFeed(feedRes.data as FeedItem[]);
      }
    } catch (error) {
      console.error('Failed to load home data:', error);
      setSnackbar({ visible: true, message: 'Failed to load data. Pull to refresh.' });
    }
  };

  const username = user?.displayName ?? user?.email?.split('@')[0] ?? '';
  const moviesWatched = stats?.moviesWatched ?? 0;
  const hero = trending[0];
  const heroBackdrop = hero ? getBackdropUrl(hero.backdropPath, 'large') : null;

  return (
    <View style={styles.container}>
      {/* Sticky header with search */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {username}</Text>
          {stats && (
            <Text style={styles.statsLine}>
              {moviesWatched} watched · {watchlistCount} on watchlist
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => navigation.navigate('Search')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="search" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
      {/* Hero */}
      {hero && heroBackdrop && (
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => navigation.navigate('MovieDetail', { movieId: hero.id })}
          activeOpacity={0.9}
        >
          <OptimizedImage uri={heroBackdrop} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle} numberOfLines={1}>{hero.title}</Text>
            {hero.releaseDate && (
              <Text style={styles.heroYear}>{hero.releaseDate.split('-')[0]}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
          onPress={() => navigation.navigate('Discover')}
        >
          <Ionicons name="compass" size={20} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.primary }]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}
          onPress={() => navigation.navigate('ThisOrThat')}
        >
          <Ionicons name="swap-horizontal" size={20} color={colors.accent} />
          <Text style={[styles.quickActionText, { color: colors.accent }]}>Rank</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}
          onPress={() => navigation.navigate('Friends')}
        >
          <Ionicons name="people" size={20} color={colors.success} />
          <Text style={[styles.quickActionText, { color: colors.success }]}>Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Trending */}
      <Section title="Trending" onSeeAll={() => navigation.navigate('Search')}>
        <FlatList
          horizontal
          data={trending.slice(1)}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => (
            <PosterCard movie={item} onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })} />
          )}
        />
      </Section>

      {/* Suggested */}
      {suggestions.length > 0 && (
        <Section title="Suggested For You" onSeeAll={() => navigation.navigate('Discover')}>
          <FlatList
            horizontal
            data={suggestions}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            renderItem={({ item }) => (
              <PosterCard movie={item} onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })} />
            )}
          />
        </Section>
      )}

      {/* Friend Activity */}
      {feed.length > 0 && (
        <Section title="Friend Activity" onSeeAll={() => navigation.navigate('FriendActivity')}>
          <FlatList
            horizontal
            data={feed.slice(0, 10)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            renderItem={({ item }) => {
              const poster = getPosterUrl(item.movie.posterPath, 'medium');
              return (
                <TouchableOpacity
                  style={styles.feedCard}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: item.movie.id })}
                  activeOpacity={0.85}
                >
                  {poster && <OptimizedImage uri={poster} style={styles.feedPoster} />}
                  <View style={styles.feedInfo}>
                    <Text style={styles.feedFriend} numberOfLines={1}>
                      {item.friend.displayName.split(' ')[0]}
                    </Text>
                    <Text style={styles.feedMovie} numberOfLines={1}>{item.movie.title}</Text>
                    {item.rating != null && (
                      <Text style={styles.feedRating}>{item.rating}/10</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Section>
      )}

      <View style={{ height: spacing.xxl }} />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
      </ScrollView>
    </View>
  );
}

function Section({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function PosterCard({ movie, onPress }: { movie: Movie; onPress: () => void }) {
  const poster = getPosterUrl(movie.posterPath, 'medium');
  return (
    <TouchableOpacity style={styles.posterCard} onPress={onPress} activeOpacity={0.85}>
      {poster && <OptimizedImage uri={poster} style={styles.posterImg} />}
      <Text style={styles.posterTitle} numberOfLines={1}>{movie.title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statsLine: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    height: 180,
    marginBottom: spacing.sm,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingTop: 48,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroYear: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  carousel: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    gap: 8,
  },
  posterCard: {
    width: 110,
  },
  posterImg: {
    width: 110,
    height: 165,
    borderRadius: borderRadius.sm,
  },
  posterTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    width: 110,
  },
  feedCard: {
    width: 130,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  feedPoster: {
    width: 130,
    height: 80,
  },
  feedInfo: {
    padding: 8,
  },
  feedFriend: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  feedMovie: {
    fontSize: 11,
    color: colors.text,
    marginTop: 2,
  },
  feedRating: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
