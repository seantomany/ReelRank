import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Share, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRoom } from '../hooks/useRoom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import MemberList from '../components/MemberList';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function LobbyScreen({ navigation, route }: RootStackScreenProps<'Lobby'>) {
  const { roomCode } = route.params;
  const { user, getIdToken } = useAuth();
  const { room, loading } = useRoom(roomCode);

  useEffect(() => {
    if (room?.status === 'submitting') {
      navigation.replace('SubmitMovies', { roomCode });
    } else if (room?.status === 'swiping') {
      navigation.replace('GroupSwipe', { roomCode });
    } else if (room?.status === 'results') {
      navigation.replace('GroupResults', { roomCode });
    }
  }, [room?.status, roomCode, navigation]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my ReelRank room! Code: ${roomCode}`,
      });
    } catch {}
  };

  const handleStart = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      await api.rooms.start(roomCode, 'submitting', token);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Room Code</Text>
        <View style={styles.codeRow}>
          {roomCode.split('').map((char, i) => (
            <View key={i} style={styles.codeBox}>
              <Text style={styles.codeChar}>{char}</Text>
            </View>
          ))}
        </View>
        <Button
          mode="outlined"
          onPress={handleShare}
          icon="share-variant"
          textColor={colors.primary}
          style={styles.shareButton}
        >
          Share Code
        </Button>
      </View>

      <View style={styles.membersSection}>
        <Text style={styles.membersTitle}>
          Players ({room?.members?.length ?? 0})
        </Text>
        {room?.members && (
          <MemberList members={room.members} hostId={room.hostId} />
        )}
      </View>

      <View style={styles.footer}>
        {room && room.hostId && (
          <Button
            mode="contained"
            onPress={handleStart}
            buttonColor={colors.primary}
            style={styles.startButton}
            labelStyle={styles.startLabel}
            icon="play"
            disabled={(room.members?.length ?? 0) < 1}
          >
            Start Submissions
          </Button>
        )}
        <Text style={styles.waitingText}>
          Waiting for everyone to join...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  codeSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  codeLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  codeBox: {
    width: 48,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeChar: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '800',
  },
  shareButton: {
    borderColor: colors.primary,
  },
  membersSection: {
    flex: 1,
    marginTop: spacing.lg,
  },
  membersTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  startButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
  },
  startLabel: {
    ...typography.label,
    fontSize: 16,
  },
  waitingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
