import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface CreateRoomScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export function CreateRoomScreen({ navigation }: CreateRoomScreenProps) {
  const { getIdToken } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [movieLimit, setMovieLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleCreate = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const limit = movieLimit ? parseInt(movieLimit, 10) : undefined;
      const body: any = {};
      if (roomName.trim()) body.name = roomName.trim();
      if (limit && limit >= 1 && limit <= 20) body.maxMoviesPerMember = limit;
      const res = await api.rooms.create(body, token);
      if (res.data && typeof res.data === 'object' && 'code' in res.data) {
        navigation.replace('Lobby', { roomCode: (res.data as any).code });
      } else if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      setSnackbar({ visible: true, message: 'Failed to create room' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="people-circle-outline" size={80} color={colors.primary} />
        <Text style={styles.title}>Create a Room</Text>
        <Text style={styles.description}>
          Start a movie night session! You'll get a unique code that your friends can use to join.
        </Text>

        <TextInput
          mode="outlined"
          label="Room Name (optional)"
          value={roomName}
          onChangeText={setRoomName}
          placeholder="e.g. Friday Movie Night"
          maxLength={50}
          style={styles.nameInput}
          textColor={colors.text}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
        />

        <TextInput
          mode="outlined"
          label="Movies per person (optional)"
          value={movieLimit}
          onChangeText={setMovieLimit}
          placeholder="No limit"
          keyboardType="number-pad"
          maxLength={2}
          style={styles.nameInput}
          textColor={colors.text}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
        />

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Create Room
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
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  nameInput: {
    width: '100%',
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    width: '100%',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
