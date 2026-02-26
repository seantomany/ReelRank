import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function CreateRoomScreen({ navigation }: RootStackScreenProps<'CreateRoom'>) {
  const { getIdToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const room = await api.rooms.create(token);
      navigation.replace('Lobby', { roomCode: room.code });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.illustration}>
          <Ionicons name="people" size={80} color={colors.primary} />
        </View>

        <Text style={styles.title}>Start a Watch Party</Text>
        <Text style={styles.description}>
          Create a room and share the code with friends. Everyone swipes on movies, and we'll find
          the perfect pick for your group.
        </Text>

        <View style={styles.steps}>
          <Step number={1} text="Create room & share the join code" />
          <Step number={2} text="Everyone submits movie candidates" />
          <Step number={3} text="Swipe together as a group" />
          <Step number={4} text="See what everyone wants to watch!" />
        </View>
      </View>

      <Button
        mode="contained"
        onPress={handleCreate}
        loading={loading}
        disabled={loading}
        style={styles.button}
        labelStyle={styles.buttonLabel}
        buttonColor={colors.primary}
        icon="plus"
      >
        Create Room
      </Button>
    </View>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  illustration: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  steps: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...typography.label,
    color: '#fff',
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  buttonLabel: {
    ...typography.label,
    fontSize: 16,
  },
});
