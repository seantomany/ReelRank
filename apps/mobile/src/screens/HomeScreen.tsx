import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie } from '@reelrank/shared';
import { api } from '../utils/api';
import type { MainTabScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.movies.trending(1)
      .then((data) => setTrending(data.movies.slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const renderTrendingItem = useCallback(({ item }: { item: Movie }) => {
    const posterUri = item.posterPath
      ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.medium}${item.posterPath}`
      : null;
    return (
      <TouchableOpacity
        style={styles.trendingCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
      >
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.trendingPoster} />
        ) : (
          <View style={[styles.trendingPoster, styles.noPoster]}>
            <Ionicons name="film-outline" size={24} color={colors.textSecondary} />
          </View>
        )}
        <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.trendingMeta}>★ {item.voteAverage.toFixed(1)}</Text>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ReelRank</Text>
          <Text style={styles.subtitle}>What are we watching?</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: 'rgba(233,69,96,0.12)' }]}
          onPress={() => navigation.navigate('Solo' as any)}
        >
          <Ionicons name="film" size={24} color={colors.primary} />
          <Text style={styles.actionLabel}>Discover</Text>
          <Text style={styles.actionDesc}>Swipe & rank movies</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: 'rgba(123,47,247,0.12)' }]}
          onPress={() => navigation.navigate('Group' as any)}
        >
          <Ionicons name="people" size={24} color="#7B2FF7" />
          <Text style={styles.actionLabel}>Group</Text>
          <Text style={styles.actionDesc}>Watch together</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: 'rgba(0,212,170,0.12)' }]}
          onPress={() => navigation.navigate('ThisOrThat')}
        >
          <Ionicons name="trophy" size={24} color={colors.success} />
          <Text style={styles.actionLabel}>Rank</Text>
          <Text style={styles.actionDesc}>This or That</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending This Week</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={trending}
          renderItem={renderTrendingItem}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingList}
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
  title: {
    ...typography.hero,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionLabel: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  actionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  trendingList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  trendingCard: {
    width: 140,
    gap: spacing.xs,
  },
  trendingPoster: {
    width: 140,
    height: 210,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  noPoster: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  trendingMeta: {
    ...typography.caption,
    color: colors.accent,
  },
});
