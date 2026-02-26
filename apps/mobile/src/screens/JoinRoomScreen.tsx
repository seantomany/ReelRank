import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { ROOM_CODE_LENGTH } from '@reelrank/shared';
import type { RootStackScreenProps } from '../navigation/types';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function JoinRoomScreen({ navigation }: RootStackScreenProps<'JoinRoom'>) {
  const { getIdToken } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
    setCode(cleaned);
  };

  const handleJoin = async () => {
    if (code.length !== ROOM_CODE_LENGTH) {
      Alert.alert('Error', `Please enter a ${ROOM_CODE_LENGTH}-character room code`);
      return;
    }

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const room = await api.rooms.join(code, token);
      navigation.replace('Lobby', { roomCode: room.code });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.illustration}>
          <Ionicons name="enter-outline" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Join a Room</Text>
        <Text style={styles.description}>
          Enter the room code shared by your friend to join the watch party
        </Text>

        <TouchableOpacity style={styles.codeContainer} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: ROOM_CODE_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.codeBox, i < code.length && styles.codeBoxFilled]}>
              <Text style={styles.codeChar}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleCodeChange}
          style={styles.hiddenInput}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={ROOM_CODE_LENGTH}
          autoFocus
        />
      </View>

      <Button
        mode="contained"
        onPress={handleJoin}
        loading={loading}
        disabled={loading || code.length !== ROOM_CODE_LENGTH}
        style={styles.button}
        labelStyle={styles.buttonLabel}
        buttonColor={colors.primary}
        icon="login"
      >
        Join Room
      </Button>
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
    alignItems: 'center',
  },
  illustration: {
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
    marginBottom: spacing.xl,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeBox: {
    width: 48,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  codeChar: {
    ...typography.h1,
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
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
