import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, FlatList, TextInput as RNTextInput } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useRoom } from '../hooks/useRoom';
import { OptimizedImage } from '../components/OptimizedImage';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { MovieScore, Movie } from '@reelrank/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

interface GroupResultsScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

export function GroupResultsScreen({ navigation, route }: GroupResultsScreenProps) {
  const { roomCode } = route.params as { roomCode: string };
  const { user, getIdToken } = useAuth();
  const { room } = useRoom(roomCode);
  const [scores, setScores] = useState<MovieScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [bonusActive, setBonusActive] = useState(false);
  const [bonusMovies, setBonusMovies] = useState<Movie[]>([]);
  const [bonusVoted, setBonusVoted] = useState(false);
  const [bonusWinner, setBonusWinner] = useState<Movie | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    loadResults();
  }, [roomCode]);

  useEffect(() => {
    if (room?.name) setRoomName(room.name);
  }, [room]);

  const handleSaveName = async () => {
    setEditingName(false);
    try {
      const token = await getIdToken();
      await api.rooms.rename(roomCode, roomName.trim(), token);
      setSnackbar({ visible: true, message: 'Group renamed!' });
    } catch {
      setSnackbar({ visible: true, message: 'Failed to rename group' });
    }
  };

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

  const groupPicks = scores.filter(
    (m) => m.rightSwipes === m.totalVoters && m.totalVoters > 0
  );
  const hasMultiplePicks = groupPicks.length > 1;
  const isHost = room?.hostId === user?.uid;
  const memberCount = (room?.members as any[])?.length ?? 1;
  const isSolo = memberCount <= 1;

  const handleStartBonusRound = async () => {
    try {
      const token = await getIdToken();
      const movieIds = groupPicks.map((m) => m.movieId);
      const res = await api.rooms.bonusRound(roomCode, { movieIds }, token);
      if (res.data && typeof res.data === 'object') {
        setBonusActive(true);
        if ((res.data as any).movies) setBonusMovies((res.data as any).movies);
      } else if (res.error) {
        setSnackbar({ visible: true, message: res.error as string });
      }
    } catch {
      setSnackbar({ visible: true, message: 'Failed to start bonus round' });
    }
  };

  const handleBonusVote = async (movieId: number) => {
    if (bonusVoted) return;
    setBonusVoted(true);
    try {
      const token = await getIdToken();
      const res = await api.rooms.bonusRound(roomCode, { movieId }, token);
      if (res.data && typeof res.data === 'object') {
        const data = res.data as any;
        if (data.status === 'completed' && data.movie) {
          setBonusWinner(data.movie);
          setBonusActive(false);
          setSnackbar({ visible: true, message: `Bonus round winner: ${data.movie.title}` });
        }
      } else if (res.error) {
        setSnackbar({ visible: true, message: res.error as string });
        setBonusVoted(false);
      }
    } catch {
      setSnackbar({ visible: true, message: 'Failed to vote' });
      setBonusVoted(false);
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Editable Group Name */}
      <View style={styles.nameRow}>
        {editingName ? (
          <View style={styles.nameEditRow}>
            <RNTextInput
              style={styles.nameInput}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Name this group..."
              placeholderTextColor={colors.textTertiary}
              maxLength={100}
              autoFocus
              onSubmitEditing={handleSaveName}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={handleSaveName}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameEditRow}>
            <Text style={styles.nameText}>
              {roomName || `Group ${roomCode}`}
            </Text>
            <Ionicons name="pencil" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Bonus Round Winner */}
      {bonusWinner && (
        <View style={styles.bonusWinnerCard}>
          <Text style={styles.bonusWinnerLabel}>Bonus Round Winner</Text>
          <Text style={styles.bonusWinnerTitle}>{bonusWinner.title}</Text>
        </View>
      )}

      {/* Bonus Round Voting */}
      {bonusActive && bonusMovies.length > 0 && (
        <View style={styles.bonusSection}>
          <Text style={styles.bonusLabel}>Bonus Round</Text>
          <Text style={styles.bonusHint}>Pick your favorite from the group picks</Text>
          <View style={styles.bonusGrid}>
            {bonusMovies.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.bonusCard, bonusVoted && styles.bonusCardDisabled]}
                onPress={() => handleBonusVote(m.id)}
                disabled={bonusVoted}
                activeOpacity={0.7}
              >
                <OptimizedImage
                  uri={getPosterUrl(m.posterPath, 'medium')}
                  style={styles.bonusPoster}
                />
                <Text style={styles.bonusMovieTitle} numberOfLines={1}>{m.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {bonusVoted && (
            <Text style={styles.bonusWaiting}>Waiting for others...</Text>
          )}
        </View>
      )}

      {/* Group Picks (Unanimous) */}
      {hasMultiplePicks && !bonusActive && !bonusWinner && (
        <View style={styles.groupPicksSection}>
          <Text style={styles.groupPicksLabel}>Group Picks (unanimous)</Text>
          <FlatList
            horizontal
            data={groupPicks}
            keyExtractor={(item) => String(item.movieId)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupPicksRow}
            renderItem={({ item }) => (
              <View style={styles.groupPickCard}>
                <OptimizedImage
                  uri={getPosterUrl(item.movie.posterPath, 'small')}
                  style={styles.groupPickPoster}
                />
                <Text style={styles.groupPickTitle} numberOfLines={1}>{item.movie.title}</Text>
              </View>
            )}
          />
          {isHost && !isSolo && (
            <TouchableOpacity onPress={handleStartBonusRound} style={styles.bonusStartButton}>
              <Text style={styles.bonusStartText}>Start bonus round to pick one</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Winner */}
      {winner && (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerLabel}>{isSolo ? 'Top Pick' : 'Winner'}</Text>
          <OptimizedImage
            uri={getPosterUrl(winner.movie.posterPath, 'large')}
            style={styles.winnerPoster}
          />
          <Text style={styles.winnerTitle}>{winner.movie.title}</Text>
          <Text style={styles.winnerScore}>
            {winner.rightSwipes}/{winner.totalVoters} voted yes · {Math.round(winner.finalScore)}%
          </Text>
        </View>
      )}

      {/* Runners Up */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  nameRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
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
  bonusWinnerCard: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  bonusWinnerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  bonusWinnerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  bonusSection: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  bonusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  bonusHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  bonusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  bonusCard: {
    width: '46%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bonusCardDisabled: {
    opacity: 0.5,
  },
  bonusPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: borderRadius.sm,
  },
  bonusMovieTitle: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  bonusWaiting: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  groupPicksSection: {
    paddingVertical: spacing.md,
  },
  groupPicksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  groupPicksRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  groupPickCard: {
    width: 80,
  },
  groupPickPoster: {
    width: 80,
    height: 120,
    borderRadius: borderRadius.sm,
  },
  groupPickTitle: {
    fontSize: 10,
    color: colors.text,
    marginTop: 4,
  },
  bonusStartButton: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  bonusStartText: {
    fontSize: 13,
    color: colors.accent,
    textDecorationLine: 'underline',
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
