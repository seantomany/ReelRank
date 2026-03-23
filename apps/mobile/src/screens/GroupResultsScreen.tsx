import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { MovieScore } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

interface GroupResultsScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

export function GroupResultsScreen({ navigation, route }: GroupResultsScreenProps) {
  const { roomCode } = route.params as { roomCode: string };
  const { getIdToken } = useAuth();
  const [scores, setScores] = useState<MovieScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadResults();
  }, [roomCode]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await api.rooms.results(roomCode, token);
      if (res.data && typeof res.data === 'object' && 'rankedMovies' in res.data) {
        setScores((res.data as any).rankedMovies);
      } else if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      setSnackbar({ visible: true, message: 'Failed to load results' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Computing results...</Text>
      </View>
    );
  }

  const winner = scores[0];
  const runnersUp = scores.slice(1);

  return (
    <View style={styles.container}>
      {winner && (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerLabel}>The Group Picks</Text>
          <OptimizedImage
            uri={getPosterUrl(winner.movie.posterPath, 'large')}
            style={styles.winnerPoster}
          />
          <Text style={styles.winnerTitle}>{winner.movie.title}</Text>
          <Text style={styles.winnerScore}>
            {winner.rightSwipes}/{winner.rightSwipes + winner.leftSwipes} votes
          </Text>
        </View>
      )}

      {runnersUp.length > 0 && (
        <View style={styles.runnersUpSection}>
          <Text style={styles.runnersUpTitle}>Runners Up</Text>
          <ScoreBreakdown scores={runnersUp} />
        </View>
      )}

      <View style={styles.bottomSection}>
        <Button
          mode="contained"
          onPress={() => navigation.popToTop()}
          style={styles.homeButton}
        >
          Back to Home
        </Button>
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
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  winnerSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  winnerLabel: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  winnerPoster: {
    width: 180,
    height: 270,
    borderRadius: borderRadius.lg,
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  winnerScore: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  runnersUpSection: {
    flex: 1,
    marginTop: spacing.lg,
  },
  runnersUpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  bottomSection: {
    padding: spacing.lg,
  },
  homeButton: {
    backgroundColor: colors.primary,
  },
});
