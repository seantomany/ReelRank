import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import { api } from '../utils/api';
import { MemberList } from '../components/MemberList';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useState } from 'react';

interface LobbyScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
}

export function LobbyScreen({ navigation, route }: LobbyScreenProps) {
  const { roomCode } = route.params as { roomCode: string };
  const { user: authUser, getIdToken } = useAuth();
  const { room, loading, error } = useRoom(roomCode);
  const [starting, setStarting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    if (room?.status === 'submitting') {
      navigation.replace('SubmitMovies', { roomCode });
    } else if (room?.status === 'swiping') {
      navigation.replace('GroupSwipe', { roomCode });
    } else if (room?.status === 'results') {
      navigation.replace('GroupResults', { roomCode });
    }
  }, [room?.status, navigation, roomCode]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      const token = await getIdToken();
      const res = await api.rooms.start(roomCode, 'submitting', token);
      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      }
    } catch (error) {
      console.error('Failed to start room:', error);
      setSnackbar({ visible: true, message: 'Failed to start room' });
    } finally {
      setStarting(false);
    }
  }, [roomCode, getIdToken]);

  const handleLeave = useCallback(async () => {
    try {
      const token = await getIdToken();
      await api.rooms.leave(roomCode, token);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to leave room:', error);
      setSnackbar({ visible: true, message: 'Failed to leave room' });
    }
  }, [roomCode, getIdToken, navigation]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !room) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error ?? 'Room not found'}</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  const isHost = room.hostId === authUser?.uid;
  const members = (room.members ?? []) as any[];

  return (
    <View style={styles.container}>
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Room Code</Text>
        <Text style={styles.code}>{room.code}</Text>
        <Text style={styles.codeHint}>Share this code with friends</Text>
      </View>

      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>
          Members ({members.length})
        </Text>
        <MemberList members={members} hostId={room.hostId} />
      </View>

      <View style={styles.bottomSection}>
        {isHost ? (
          <Button
            mode="contained"
            onPress={handleStart}
            loading={starting}
            disabled={starting || members.length < 1}
            style={styles.startButton}
            labelStyle={styles.startLabel}
          >
            Start Submitting Movies
          </Button>
        ) : (
          <View style={styles.waitingContainer}>
            <Ionicons name="time-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.waitingText}>Waiting for host to start...</Text>
          </View>
        )}
        <Button mode="text" onPress={handleLeave} textColor={colors.error}>
          Leave Room
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
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  codeSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  codeLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  code: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.accent,
    fontFamily: 'monospace',
    letterSpacing: 8,
    marginVertical: spacing.sm,
  },
  codeHint: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  membersSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  bottomSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
  },
  startLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  waitingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
