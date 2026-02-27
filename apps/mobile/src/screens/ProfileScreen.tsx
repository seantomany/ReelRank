import React, { useState, useCallback } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie, SoloRanking, WatchedMovie } from '@reelrank/shared';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

type ListTab = 'ranking' | 'want' | 'watched';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut, getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<ListTab>('ranking');
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [wantList, setWantList] = useState<Array<{ movieId: number; movie: Movie }>>([]);
  const [watchedList, setWatchedList] = useState<WatchedMovie[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      if (activeTab === 'ranking') {
        const data = await api.solo.ranking(token);
        setRankings(data);
      } else if (activeTab === 'want') {
        const data = await api.solo.lists('want', token);
        setWantList(data);
      } else {
        const data = await api.solo.watchedList(token);
        setWatchedList(data);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, getIdToken]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const renderRankingRow = ({ item, index }: { item: SoloRanking; index: number }) => {
    const posterUri = item.movie?.posterPath
      ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${item.movie.posterPath}`
      : null;
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

    return (
      <TouchableOpacity
        style={styles.movieRow}
        onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId })}
      >
        <Text style={styles.rowIndex}>{medal ?? index + 1}</Text>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.rowPoster} />
        ) : (
          <View style={[styles.rowPoster, styles.noPoster]}>
            <Ionicons name="film-outline" size={16} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.movie?.title}</Text>
          <Text style={styles.rowMeta}>
            {item.movie?.releaseDate?.slice(0, 4)} · ★ {item.movie?.voteAverage?.toFixed(1)}
          </Text>
        </View>
        <Text style={styles.elo}>{Math.round(item.eloScore)}</Text>
      </TouchableOpacity>
    );
  };

  const renderWantRow = ({ item, index }: { item: { movieId: number; movie: Movie }; index: number }) => {
    const posterUri = item.movie?.posterPath
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
          <Text style={styles.rowTitle} numberOfLines={1}>{item.movie?.title}</Text>
          <Text style={styles.rowMeta}>
            {item.movie?.releaseDate?.slice(0, 4)} · ★ {item.movie?.voteAverage?.toFixed(1)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => navigation.navigate('LogWatched', { movieId: item.movie.id, movieTitle: item.movie.title })}
        >
          <Ionicons name="eye-outline" size={18} color={colors.success} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderWatchedRow = ({ item, index }: { item: WatchedMovie; index: number }) => {
    const posterUri = item.movie?.posterPath
      ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${item.movie.posterPath}`
      : null;

    return (
      <TouchableOpacity
        style={styles.movieRow}
        onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId })}
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
          <Text style={styles.rowTitle} numberOfLines={1}>{item.movie?.title}</Text>
          <Text style={styles.rowMeta}>
            {item.venue} · {item.watchedAt?.slice(0, 10)}
          </Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{item.rating}/10</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />;
    }

    if (activeTab === 'ranking') {
      return rankings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No rankings yet</Text>
          <Text style={styles.emptyHint}>Use "This or That" to rank your movies</Text>
        </View>
      ) : (
        <FlatList
          data={rankings}
          renderItem={renderRankingRow}
          keyExtractor={(item) => String(item.movieId)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (activeTab === 'want') {
      return wantList.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No movies saved yet</Text>
          <Text style={styles.emptyHint}>Swipe right on movies to add them here</Text>
        </View>
      ) : (
        <FlatList
          data={wantList}
          renderItem={renderWantRow}
          keyExtractor={(item) => String(item.movieId)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return watchedList.length === 0 ? (
      <View style={styles.empty}>
        <Ionicons name="eye-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No movies logged yet</Text>
        <Text style={styles.emptyHint}>Log movies you've watched with ratings</Text>
      </View>
    ) : (
      <FlatList
        data={watchedList}
        renderItem={renderWatchedRow}
        keyExtractor={(item) => String(item.movieId)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const TABS: { key: ListTab; label: string; icon: string }[] = [
    { key: 'ranking', label: 'Rankings', icon: 'trophy' },
    { key: 'want', label: 'Watchlist', icon: 'bookmark' },
    { key: 'watched', label: 'Watched', icon: 'eye' },
  ];

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
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any}
              size={16}
              color={activeTab === tab.key ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    gap: 6,
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
    width: 28,
    textAlign: 'center',
    fontSize: 16,
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
  logBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.success}15`,
  },
  ratingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.accent}20`,
  },
  ratingText: {
    ...typography.label,
    color: colors.accent,
    fontSize: 12,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
});
