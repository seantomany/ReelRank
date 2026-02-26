import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES } from '@reelrank/shared';
import type { MovieScore } from '@reelrank/shared';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import ScoreBreakdown from '../components/ScoreBreakdown';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function GroupResultsScreen({ navigation, route }: RootStackScreenProps<'GroupResults'>) {
  const { roomCode } = route.params;
  const { getIdToken } = useAuth();
  const [rankedMovies, setRankedMovies] = useState<MovieScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await api.rooms.results(roomCode, token);
        setRankedMovies(data.rankedMovies);
      } catch (err) {
        console.error('Failed to load results:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomCode, getIdToken]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Calculating results...</Text>
      </View>
    );
  }

  const winner = rankedMovies[0];
  const runnerUps = rankedMovies.slice(1, 3);

  const winnerPoster = winner?.movie?.posterPath
    ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.large}${winner.movie.posterPath}`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {winner && (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerLabel}>The Group Picks</Text>

          <View style={styles.winnerCard}>
            {winnerPoster ? (
              <Image source={{ uri: winnerPoster }} style={styles.winnerPoster} resizeMode="cover" />
            ) : (
              <View style={[styles.winnerPoster, styles.noPoster]}>
                <Ionicons name="trophy" size={48} color={colors.accent} />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.winnerGradient}
            />
            <View style={styles.winnerInfo}>
              <View style={styles.crownBadge}>
                <Ionicons name="trophy" size={16} color={colors.accent} />
                <Text style={styles.crownText}>#1 Pick</Text>
              </View>
              <Text style={styles.winnerTitle}>{winner.movie.title}</Text>
              <Text style={styles.winnerMeta}>
                {Math.round((winner.rightSwipes / Math.max(winner.totalVoters, 1)) * 100)}% liked
                · Score: {(winner.finalScore * 100).toFixed(0)}
              </Text>
            </View>
          </View>

          {runnerUps.length > 0 && (
            <View style={styles.runnerUps}>
              {runnerUps.map((movie, idx) => {
                const poster = movie.movie.posterPath
                  ? `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES.small}${movie.movie.posterPath}`
                  : null;
                return (
                  <View key={movie.movieId} style={styles.runnerUp}>
                    <View style={styles.runnerUpRank}>
                      <Text style={styles.runnerUpRankText}>#{idx + 2}</Text>
                    </View>
                    {poster ? (
                      <Image source={{ uri: poster }} style={styles.runnerUpPoster} />
                    ) : (
                      <View style={[styles.runnerUpPoster, styles.noPoster]}>
                        <Ionicons name="film-outline" size={18} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.runnerUpTitle} numberOfLines={2}>
                      {movie.movie.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Full Breakdown</Text>
        <ScoreBreakdown rankedMovies={rankedMovies} />
      </View>

      <Button
        mode="contained"
        onPress={() => navigation.popToTop()}
        buttonColor={colors.primary}
        style={styles.doneButton}
        labelStyle={styles.doneLabel}
        icon="home"
      >
        Back to Home
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  winnerSection: {
    marginBottom: spacing.xl,
  },
  winnerLabel: {
    ...typography.label,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  winnerCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    height: 400,
    marginBottom: spacing.md,
  },
  winnerPoster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  winnerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  crownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 6,
    marginBottom: spacing.sm,
  },
  crownText: {
    ...typography.label,
    color: colors.accent,
  },
  winnerTitle: {
    ...typography.h1,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  winnerMeta: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
  },
  runnerUps: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  runnerUp: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  runnerUpRank: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  runnerUpRankText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '700',
  },
  runnerUpPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  runnerUpTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  breakdownSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  doneButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
  },
  doneLabel: {
    ...typography.label,
    fontSize: 16,
  },
});
