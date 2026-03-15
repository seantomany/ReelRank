import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { MainTabScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

interface RoomHistoryItem {
  id: string;
  code: string;
  hostId: string;
  status: string;
  memberCount: number;
  createdAt: string;
}

export default function GroupScreen({ navigation }: MainTabScreenProps<'Group'>) {
  const { getIdToken } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [history, setHistory] = useState<RoomHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const token = await getIdToken();
          if (!token) return;
          const data = await api.rooms.history(token);
          setHistory(data);
        } catch {}
      })();
    }, [getIdToken]),
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const room = await api.rooms.create(token);
      navigation.navigate('Lobby', { roomCode: room.code });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Room codes are 6 characters');
      return;
    }
    setJoining(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const room = await api.rooms.join(code, token);
      navigation.navigate('Lobby', { roomCode: room.code });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Group Watch</Text>
        <Text style={styles.subtitle}>Decide what to watch together</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.createCard} activeOpacity={0.85} onPress={handleCreate} disabled={creating}>
          <LinearGradient
            colors={['#7B2FF7', '#5B1FD7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createGradient}
          >
            {creating ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <Ionicons name="add" size={28} color="#fff" />
                </View>
                <Text style={styles.createTitle}>Create a Room</Text>
                <Text style={styles.createDesc}>
                  Start a new session and invite friends to vote on movies together
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.joinCard}>
          <Text style={styles.joinLabel}>Join with code</Text>
          <View style={styles.joinRow}>
            <TextInput
              style={styles.joinInput}
              placeholder="ABCDEF"
              placeholderTextColor={colors.textSecondary}
              value={roomCode}
              onChangeText={(t) => setRoomCode(t.toUpperCase().slice(0, 6))}
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.joinButton, roomCode.length < 6 && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={roomCode.length < 6 || joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent Rooms</Text>
            {history.slice(0, 5).map((room) => {
              const statusColors: Record<string, string> = {
                lobby: colors.accent,
                submitting: colors.primary,
                swiping: '#7B2FF7',
                results: colors.success,
              };
              return (
                <TouchableOpacity
                  key={room.id}
                  style={styles.historyRow}
                  onPress={() => {
                    if (room.status === 'results') {
                      navigation.navigate('GroupResults', { roomCode: room.code });
                    } else {
                      navigation.navigate('Lobby', { roomCode: room.code });
                    }
                  }}
                >
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyCode}>{room.code}</Text>
                    <Text style={styles.historyMeta}>
                      {room.memberCount} members · {new Date(room.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColors[room.status] ?? colors.textSecondary}20` }]}>
                    <Text style={[styles.statusText, { color: statusColors[room.status] ?? colors.textSecondary }]}>
                      {room.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.hero,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  createCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  createGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createTitle: {
    ...typography.h1,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  createDesc: {
    ...typography.body,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  joinCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.md,
  },
  joinRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.h3,
    color: colors.text,
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.4,
  },
  historySection: {
    marginTop: spacing.xl,
  },
  historyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyInfo: {
    flex: 1,
  },
  historyCode: {
    ...typography.label,
    color: colors.text,
    letterSpacing: 2,
  },
  historyMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
