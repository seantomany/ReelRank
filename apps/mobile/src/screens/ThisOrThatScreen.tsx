import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Text, Snackbar, ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { SoloRanking } from '@reelrank/shared';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

export function ThisOrThatScreen() {
  const { getIdToken } = useAuth();
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [pairA, setPairA] = useState<SoloRanking | null>(null);
  const [pairB, setPairB] = useState<SoloRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [choiceCount, setChoiceCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await api.solo.ranking(token);
      if (res.data && Array.isArray(res.data) && res.data.length >= 2) {
        setRankings(res.data as SoloRanking[]);
        pickPair(res.data as SoloRanking[]);
      }
    } catch (error) {
      console.error('Failed to load rankings:', error);
      setSnackbar({ visible: true, message: 'Failed to load movies' });
    } finally {
      setLoading(false);
    }
  };

  const pickPair = (pool: SoloRanking[]) => {
    if (pool.length < 2) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setPairA(shuffled[0]);
    setPairB(shuffled[1]);
  };

  const handleChoice = useCallback(async (chosen: SoloRanking, other: SoloRanking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newCount = choiceCount + 1;
    setChoiceCount(newCount);

    try {
      const token = await getIdToken();
      const res = await api.solo.pairwise(
        chosen.movieId,
        other.movieId,
        chosen.movieId,
        token
      );

      if (res.data && typeof res.data === 'object' && 'rankings' in res.data) {
        setRankings((res.data as any).rankings);
        pickPair((res.data as any).rankings);
      } else if (newCount % 5 === 0) {
        await fetchRankings();
      } else {
        pickPair(rankings);
      }
    } catch (error) {
      console.error('Failed to record choice:', error);
      setSnackbar({ visible: true, message: 'Failed to save choice' });
      pickPair(rankings);
    }
  }, [choiceCount, rankings, getIdToken]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (rankings.length < 2) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          Swipe on at least 2 movies in Discover first!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Which would you rather watch?</Text>
      <Text style={styles.counter}>Comparisons: {choiceCount}</Text>

      <View style={styles.pairContainer}>
        {pairA && pairB && (
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleChoice(pairA, pairB)}
              activeOpacity={0.8}
            >
              <OptimizedImage
                uri={getPosterUrl(pairA.movie.posterPath, 'medium')}
                style={styles.poster}
              />
              <Text style={styles.movieTitle} numberOfLines={2}>{pairA.movie.title}</Text>
            </TouchableOpacity>

            <View style={styles.vsContainer}>
              <Text style={styles.vs}>VS</Text>
            </View>

            <TouchableOpacity
              style={styles.card}
              onPress={() => handleChoice(pairB, pairA)}
              activeOpacity={0.8}
            >
              <OptimizedImage
                uri={getPosterUrl(pairB.movie.posterPath, 'medium')}
                style={styles.poster}
              />
              <Text style={styles.movieTitle} numberOfLines={2}>{pairB.movie.title}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

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
    paddingTop: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  counter: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pairContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
  },
  movieTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    padding: spacing.sm,
    textAlign: 'center',
  },
  vsContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vs: {
    color: colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});
