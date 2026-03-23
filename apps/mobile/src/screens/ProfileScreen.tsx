import React, { useEffect, useState } from 'react';
import { View, ScrollView, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Avatar, Button, SegmentedButtons, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut, getIdToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState('rankings');
  const [tabData, setTabData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTabData();
  }, [tab]);

  const loadStats = async () => {
    try {
      const token = await getIdToken();
      const res = await api.solo.stats(token);
      if (res.data) setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setSnackbar({ visible: true, message: 'Failed to load profile stats' });
    }
  };

  const loadTabData = async () => {
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
  };

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {user?.photoURL ? (
            <Avatar.Image size={80} source={{ uri: user.photoURL }} />
          ) : (
            <Avatar.Text size={80} label={initials} />
          )}
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalSwipes}</Text>
              <Text style={styles.statLabel}>Swipes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.moviesWatched}</Text>
              <Text style={styles.statLabel}>Watched</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.pairwiseChoices}</Text>
              <Text style={styles.statLabel}>Compared</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.winRate}%</Text>
              <Text style={styles.statLabel}>Like Rate</Text>
            </View>
          </View>
        )}

        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'rankings', label: 'Rankings' },
            { value: 'watchlist', label: 'Watchlist' },
            { value: 'watched', label: 'Watched' },
          ]}
          style={styles.tabs}
        />

        {loading ? (
          <ActivityIndicator style={{ paddingVertical: spacing.xl }} color={colors.primary} />
        ) : (
          <FlatList
            data={tabData}
            scrollEnabled={false}
            keyExtractor={(item, index) => `${item.movieId ?? item.id ?? index}`}
            renderItem={({ item, index }) => {
              const movie = item.movie ?? item;
              return (
                <TouchableOpacity
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
                      <Text style={styles.listMeta}>ELO: {Math.round(item.eloScore)}</Text>
                    )}
                    {tab === 'watched' && item.rating && (
                      <Text style={styles.listMeta}>{item.rating}/10 · {item.venue}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {tab === 'rankings' ? 'Start swiping to build your rankings!' :
                  tab === 'watchlist' ? 'Swipe right on movies to add them here.' :
                    'Log movies you\'ve watched to track them here.'}
              </Text>
            }
          />
        )}

        <Button
          mode="outlined"
          onPress={signOut}
          style={styles.signOutButton}
          textColor={colors.error}
        >
          Sign Out
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
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  tabs: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  signOutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderColor: colors.error,
  },
});
