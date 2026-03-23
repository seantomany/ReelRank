import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { ROOM_CODE_LENGTH } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface JoinRoomScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export function JoinRoomScreen({ navigation }: JoinRoomScreenProps) {
  const { getIdToken } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleCodeChange = (text: string) => {
    setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH));
  };

  const handleJoin = async () => {
    if (code.length !== ROOM_CODE_LENGTH) {
      setSnackbar({ visible: true, message: `Code must be ${ROOM_CODE_LENGTH} characters` });
      return;
    }

    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await api.rooms.join(code, token);
      if (res.data && typeof res.data === 'object' && 'code' in res.data) {
        navigation.replace('Lobby', { roomCode: (res.data as any).code });
      } else if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      setSnackbar({ visible: true, message: 'Failed to join room' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Join a Room</Text>
        <Text style={styles.subtitle}>
          Enter the {ROOM_CODE_LENGTH}-character room code shared by the host
        </Text>

        <TextInput
          mode="outlined"
          value={code}
          onChangeText={handleCodeChange}
          placeholder="ABC123"
          style={styles.input}
          textColor={colors.text}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoCorrect={false}
          textAlign="center"
          contentStyle={styles.inputContent}
        />

        <Button
          mode="contained"
          onPress={handleJoin}
          loading={loading}
          disabled={loading || code.length !== ROOM_CODE_LENGTH}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Join Room
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    fontSize: 28,
  },
  inputContent: {
    fontFamily: 'monospace',
    fontSize: 28,
    letterSpacing: 8,
  },
  button: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    width: '100%',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
