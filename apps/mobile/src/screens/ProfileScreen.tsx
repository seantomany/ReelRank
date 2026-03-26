import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Text, Avatar, Button, SegmentedButtons, Snackbar, ActivityIndicator, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

type WatchlistSort = 'recent' | 'alpha' | 'genre';
type WatchedSort = 'recent' | 'rating' | 'alpha';

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, getIdToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [tab, setTab] = useState('rankings');
  const [tabData, setTabData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [watchlistSort, setWatchlistSort] = useState<WatchlistSort>('recent');
  const [watchedSort, setWatchedSort] = useState<WatchedSort>('recent');

  const loadStats = useCallback(async () => {
    try {
      const token = await getIdToken();
      const [statsRes, insightsRes] = await Promise.all([
        api.solo.stats(token),
        api.solo.insights(token),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (insightsRes.data) setInsights(insightsRes.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [getIdToken]);

  const loadTabData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      let res;
      switch (tab) {
        case 'rankings':
          res = await api.solo.ranking(token);
          break;
        case 'watchlist':
          res = await api.solo.lists('want', token);
          break;
        case 'watched':
          res = await api.solo.getWatched(token);
          break;
      }
      if (res?.data) {
        setTabData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('Failed to load tab data:', error);
      setSnackbar({ visible: true, message: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, [tab, getIdToken]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadTabData();
    }, [loadStats, loadTabData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadTabData()]);
    setRefreshing(false);
  }, [loadStats, loadTabData]);

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.charAt(0).toUpperCase();

  const topGenres = insights?.genreBreakdown?.slice(0, 3) ?? [];
  const personality = insights?.moviePersonality;

  const getSortedData = () => {
    const data = tabData.filter(Boolean);
    if (tab === 'watchlist') {
      return [...data].sort((a, b) => {
        if (watchlistSort === 'alpha') {
          return ((a.movie ?? a).title ?? '').localeCompare((b.movie ?? b).title ?? '');
        }
        if (watchlistSort === 'genre') {
          const ga = (a.movie ?? a).genreIds?.[0] ?? 999;
          const gb = (b.movie ?? b).genreIds?.[0] ?? 999;
          return ga - gb;
        }
        return 0;
      });
    }
    if (tab === 'watched') {
      return [...data].sort((a, b) => {
        if (watchedSort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (watchedSort === 'alpha') {
          return ((a.movie ?? a).title ?? '').localeCompare((b.movie ?? b).title ?? '');
        }
        return 0;
      });
    }
    return data;
  };

  const sortedData = getSortedData();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.settingsGear}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          {user?.photoURL ? (
            <Avatar.Image size={80} source={{ uri: user.photoURL }} />
          ) : (
            <Avatar.Text size={80} label={initials} />
          )}
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {topGenres.length > 0 && (
            <View style={styles.genreTags}>
              {topGenres.map((g: any) => (
                <View key={g.genreId} style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{g.genreName}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.friendsButton}
            onPress={() => navigation.navigate('Friends')}
          >
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.friendsButtonText}>Friends</Text>
          </TouchableOpacity>
        </View>

        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalSwipes ?? 0}</Text>
              <Text style={styles.statLabel}>Swipes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.moviesWatched ?? 0}</Text>
              <Text style={styles.statLabel}>Watched</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.pairwiseChoices ?? 0}</Text>
              <Text style={styles.statLabel}>Compared</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.winRate ?? 0}%</Text>
              <Text style={styles.statLabel}>Like Rate</Text>
            </View>
          </View>
        )}

        {/* View Stats Link */}
        <TouchableOpacity
          style={styles.statsLink}
          onPress={() => navigation.navigate('Stats')}
          activeOpacity={0.7}
        >
          <View style={styles.statsLinkLeft}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.accent} />
            <View>
              <Text style={styles.statsLinkTitle}>Your Stats</Text>
              <Text style={styles.statsLinkSubtitle}>
                {personality?.title
                  ? `${personality.title} — view full breakdown`
                  : 'Genre taste, watch habits, and more'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <SegmentedButtons
          value={tab}
          onValueChange={(v) => { setTab(v); }}
          buttons={[
            { value: 'rankings', label: 'Rankings' },
            { value: 'watchlist', label: 'Watchlist' },
            { value: 'watched', label: 'Watched' },
          ]}
          style={styles.tabs}
        />

        {/* Sort options */}
        {tab === 'watchlist' && tabData.length > 0 && (
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort</Text>
            {(['recent', 'alpha', 'genre'] as WatchlistSort[]).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setWatchlistSort(s)}
                style={[styles.sortPill, watchlistSort === s && styles.sortPillActive]}
              >
                <Text style={[styles.sortPillText, watchlistSort === s && styles.sortPillTextActive]}>
                  {s === 'recent' ? 'Recent' : s === 'alpha' ? 'A–Z' : 'Genre'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {tab === 'watched' && tabData.length > 0 && (
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort</Text>
            {(['recent', 'rating', 'alpha'] as WatchedSort[]).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setWatchedSort(s)}
                style={[styles.sortPill, watchedSort === s && styles.sortPillActive]}
              >
                <Text style={[styles.sortPillText, watchedSort === s && styles.sortPillTextActive]}>
                  {s === 'recent' ? 'Recent' : s === 'rating' ? 'Rating' : 'A–Z'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={{ paddingVertical: spacing.xl }} color={colors.primary} />
        ) : sortedData.length === 0 ? (
          <Text style={styles.emptyText}>
            {tab === 'rankings' ? 'Start swiping to build your rankings!' :
              tab === 'watchlist' ? 'Swipe right on movies to add them here.' :
                'Log movies you\'ve watched to track them here.'}
          </Text>
        ) : (
          sortedData.map((item, index) => {
            const movie = item?.movie ?? item;
            return (
              <TouchableOpacity
                key={`${item.movieId ?? item.id ?? index}`}
                style={styles.listRow}
                onPress={() => navigation.navigate('MovieDetail', { movieId: movie.id ?? item.movieId })}
              >
                {tab === 'rankings' && (
                  <Text style={styles.rank}>#{index + 1}</Text>
                )}
                <OptimizedImage
                  uri={getPosterUrl(movie.posterPath, 'small')}
                  style={styles.poster}
                />
                <View style={styles.listInfo}>
                  <Text style={styles.movieTitle} numberOfLines={1}>{movie.title}</Text>
                  {tab === 'rankings' && item.eloScore && (
                    <Text style={styles.listMeta}>Score: {Math.round(item.eloScore)}</Text>
                  )}
                  {tab === 'watched' && item.rating && (
                    <Text style={styles.listMeta}>{item.rating}/10 · {item.venue}</Text>
                  )}
                </View>
                {tab === 'watchlist' && (
                  <View style={styles.reorderButtons}>
                    {index > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          const newData = [...tabData];
                          [newData[index - 1], newData[index]] = [newData[index], newData[index - 1]];
                          setTabData(newData);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    {index < tabData.length - 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          const newData = [...tabData];
                          [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
                          setTabData(newData);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {tab === 'rankings' && sortedData.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('ThisOrThat')}
            style={styles.refineLink}
          >
            <Text style={styles.refineLinkText}>Refine your rankings</Text>
          </TouchableOpacity>
        )}

        <Button
          mode="text"
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
          icon={() => <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />}
          textColor={colors.textSecondary}
        >
          Settings
        </Button>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  genreTags: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  genreTag: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  genreTagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statsLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statsLinkTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  statsLinkSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tabs: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sortLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sortPill: {
    borderRadius: 20,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  sortPillActive: {
    backgroundColor: colors.surface,
  },
  sortPillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sortPillTextActive: {
    color: colors.text,
    fontWeight: '500',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
    width: 36,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  listInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  movieTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  listMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  reorderButtons: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginLeft: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  friendsButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  settingsGear: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    padding: spacing.sm,
    zIndex: 10,
  },
  settingsButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  refineLink: {
    alignItems: 'center',
    padding: spacing.md,
  },
  refineLinkText: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
