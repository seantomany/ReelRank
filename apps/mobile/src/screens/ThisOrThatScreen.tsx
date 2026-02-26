import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { Movie, SoloRanking } from '@reelrank/shared';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { RootStackScreenProps } from '../navigation/types';

export default function ThisOrThatScreen({ navigation }: RootStackScreenProps<'ThisOrThat'>) {
  const { getIdToken } = useAuth();
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [pair, setPair] = useState<[Movie, Movie] | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparisons, setComparisons] = useState(0);

  const loadRankings = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const data = await api.solo.ranking(token);
      setRankings(data);
    } catch (err) {
      console.error('Failed to load rankings:', err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  const pickNextPair = useCallback(() => {
    if (rankings.length < 2) {
      setPair(null);
      return;
    }

    const shuffled = [...rankings].sort(() => Math.random() - 0.5);
    setPair([shuffled[0].movie, shuffled[1].movie]);
  }, [rankings]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  useEffect(() => {
    pickNextPair();
  }, [rankings, pickNextPair]);

  const handleChoice = useCallback(
    async (chosenId: number) => {
      if (!pair) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const token = await getIdToken();
        if (!token) return;
        await api.solo.pairwise(pair[0].id, pair[1].id, chosenId, token);
        setComparisons((c) => c + 1);
        pickNextPair();
      } catch (err) {
        console.error('Choice failed:', err);
      }
    },
    [pair, getIdToken, pickNextPair],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (rankings.length < 2) {
    return (
      <View style={styles.centered}>
        <Ionicons name="swap-horizontal" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>Not enough movies yet</Text>
        <Text style={styles.emptySubtitle}>
          Swipe right on at least 2 movies to start ranking
        </Text>
        <TouchableOpacity
          style={styles.goSwipeButton}
          onPress={() => navigation.navigate('SoloSwipe')}
        >
          <Text style={styles.goSwipeText}>Go Swipe</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!pair) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Which would you rather watch?</Text>
        <Text style={styles.counter}>{comparisons} comparisons made</Text>
      </View>

      <View style={styles.versus}>
        <MovieOption movie={pair[0]} onPress={() => handleChoice(pair[0].id)} />

        <View style={styles.vsCircle}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <MovieOption movie={pair[1]} onPress={() => handleChoice(pair[1].id)} />
      </View>

      <TouchableOpacity style={styles.skipPair} onPress={pickNextPair}>
        <Text style={styles.skipText}>Skip this pair</Text>
      </TouchableOpacity>
    </View>
  );
}

function MovieOption({ movie, onPress }: { movie: Movie; onPress: () => void }) {
  const posterUri = movie.posterPath
    ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.medium}${movie.posterPath}`
    : null;

  return (
    <TouchableOpacity style={styles.option} activeOpacity={0.8} onPress={onPress}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.optionPoster} resizeMode="cover" />
      ) : (
        <View style={[styles.optionPoster, styles.noPoster]}>
          <Ionicons name="film-outline" size={40} color={colors.textSecondary} />
        </View>
      )}
      <Text style={styles.optionTitle} numberOfLines={2}>{movie.title}</Text>
      <View style={styles.optionMeta}>
        <Ionicons name="star" size={12} color={colors.accent} />
        <Text style={styles.optionRating}>{movie.voteAverage.toFixed(1)}</Text>
        <Text style={styles.optionYear}>{movie.releaseDate?.slice(0, 4)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  counter: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  versus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  option: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  optionPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  noPoster: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  optionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  optionRating: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  optionYear: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  vsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -22,
    zIndex: 10,
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  vsText: {
    ...typography.label,
    color: '#fff',
    fontSize: 13,
  },
  skipPair: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  goSwipeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  goSwipeText: {
    ...typography.label,
    color: '#fff',
    fontSize: 16,
  },
});
