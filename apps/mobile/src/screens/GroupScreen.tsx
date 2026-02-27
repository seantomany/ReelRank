import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { MainTabScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function GroupScreen({ navigation }: MainTabScreenProps<'Group'>) {
  const { getIdToken } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

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
});
