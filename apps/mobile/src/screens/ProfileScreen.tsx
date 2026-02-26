import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie, SoloRanking } from '@reelrank/shared';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { MainTabScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

type ListTab = 'ranking' | 'want' | 'seen';

export default function ProfileScreen({ navigation }: MainTabScreenProps<'Profile'>) {
  const { user, signOut, getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<ListTab>('ranking');
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [wantList, setWantList] = useState<Array<{ movieId: number; movie: Movie }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      if (activeTab === 'ranking') {
        const data = await api.solo.ranking(token);
        setRankings(data);
      } else {
        const data = await api.solo.lists(activeTab, token);
        setWantList(data);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, getIdToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderMovieRow = ({ item, index }: { item: { movie: Movie; rank?: number }; index: number }) => {
    const posterUri = item.movie.posterPath
      ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${item.movie.posterPath}`
      : null;

    return (
      <TouchableOpacity
        style={styles.movieRow}
        onPress={() => navigation.navigate('MovieDetail', { movieId: item.movie.id })}
      >
        <Text style={styles.rowIndex}>{index + 1}</Text>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.rowPoster} />
        ) : (
          <View style={[styles.rowPoster, styles.noPoster]}>
            <Ionicons name="film-outline" size={16} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.movie.title}</Text>
          <Text style={styles.rowMeta}>
            {item.movie.releaseDate?.slice(0, 4)} · ★ {item.movie.voteAverage.toFixed(1)}
          </Text>
        </View>
        {activeTab === 'ranking' && (item as SoloRanking).eloScore !== undefined && (
          <Text style={styles.elo}>{Math.round((item as SoloRanking).eloScore)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const data =
    activeTab === 'ranking'
      ? rankings.map((r) => ({ movie: r.movie, rank: r.rank, eloScore: r.eloScore }))
      : wantList;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{user?.displayName ?? 'Movie Fan'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOut}>
          <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['ranking', 'want', 'seen'] as ListTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'ranking' ? 'Rankings' : tab === 'want' ? 'Want to Watch' : 'All Swiped'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No movies yet. Start swiping!</Text>
        </View>
      ) : (
        <FlatList
          data={data as any}
          renderItem={renderMovieRow}
          keyExtractor={(item: any) => String(item.movie?.id ?? item.movieId)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOut: {
    padding: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  rowIndex: {
    ...typography.label,
    color: colors.textSecondary,
    width: 24,
    textAlign: 'center',
  },
  rowPoster: {
    width: 40,
    height: 60,
    borderRadius: 4,
  },
  noPoster: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  elo: {
    ...typography.label,
    color: colors.accent,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
