import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { SoloRanking } from '@reelrank/shared';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;
const SESSION_LIMIT = 5;

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function ThisOrThatScreen() {
  const { getIdToken } = useAuth();
  const [rankings, setRankings] = useState<SoloRanking[]>([]);
  const [pairA, setPairA] = useState<SoloRanking | null>(null);
  const [pairB, setPairB] = useState<SoloRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [choiceCount, setChoiceCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const seenPairsRef = useRef(new Set<string>());

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await api.solo.ranking(token);
      if (res.data && Array.isArray(res.data) && res.data.length >= 2) {
        const data = res.data as SoloRanking[];
        setRankings(data);
        pickPair(data);
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

    const totalPossible = (pool.length * (pool.length - 1)) / 2;
    if (seenPairsRef.current.size >= totalPossible) {
      seenPairsRef.current.clear();
    }

    const sorted = [...pool].sort((a, b) => a.rank - b.rank);

    for (let attempt = 0; attempt < 40; attempt++) {
      const idx = Math.floor(Math.random() * (sorted.length - 1));
      const a = sorted[idx];
      const b = sorted[idx + 1];
      const key = pairKey(a.movieId, b.movieId);
      if (!seenPairsRef.current.has(key)) {
        seenPairsRef.current.add(key);
        if (Math.random() > 0.5) { setPairA(a); setPairB(b); }
        else { setPairA(b); setPairB(a); }
        return;
      }
    }

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = pairKey(sorted[i].movieId, sorted[j].movieId);
        if (!seenPairsRef.current.has(key)) {
          seenPairsRef.current.add(key);
          setPairA(sorted[i]);
          setPairB(sorted[j]);
          return;
        }
      }
    }

    seenPairsRef.current.clear();
    setPairA(sorted[0]);
    setPairB(sorted[1]);
    seenPairsRef.current.add(pairKey(sorted[0].movieId, sorted[1].movieId));
  };

  const handleChoice = useCallback(async (chosen: SoloRanking, other: SoloRanking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newCount = choiceCount + 1;
    setChoiceCount(newCount);

    if (newCount >= SESSION_LIMIT) {
      setSessionDone(true);
    }

    try {
      const token = await getIdToken();
      const res = await api.solo.pairwise(
        chosen.movieId,
        other.movieId,
        chosen.movieId,
        token
      );

      if (res.data && typeof res.data === 'object' && 'rankings' in res.data) {
        const updated = (res.data as any).rankings as SoloRanking[];
        setRankings(updated);
        if (newCount < SESSION_LIMIT) pickPair(updated);
      } else if (newCount % 5 === 0) {
        await fetchRankings();
      } else {
        if (newCount < SESSION_LIMIT) pickPair(rankings);
      }
    } catch (error) {
      console.error('Failed to record choice:', error);
      setSnackbar({ visible: true, message: 'Failed to save choice' });
      if (newCount < SESSION_LIMIT) pickPair(rankings);
    }
  }, [choiceCount, rankings, getIdToken]);

  const handleRestart = () => {
    setChoiceCount(0);
    setSessionDone(false);
    seenPairsRef.current.clear();
    pickPair(rankings);
  };

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

  if (sessionDone) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.doneTitle}>{SESSION_LIMIT}/{SESSION_LIMIT}</Text>
        <Text style={styles.doneSubtitle}>Session complete — rankings refined</Text>
        <Button mode="contained" onPress={handleRestart} style={{ marginTop: spacing.lg }}>
          Go Again
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Which would you rather watch?</Text>
      <Text style={styles.counter}>{choiceCount}/{SESSION_LIMIT}</Text>

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
    fontSize: 14,
  },
  doneTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  doneSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
