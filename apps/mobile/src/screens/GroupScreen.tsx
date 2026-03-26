import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { ROOM_CODE_LENGTH } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

interface GroupScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

const STATUS_COLORS: Record<string, string> = {
  lobby: colors.accent,
  submitting: colors.info,
  swiping: colors.primary,
  results: colors.success,
};

export function GroupScreen({ navigation }: GroupScreenProps) {
  const { getIdToken } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const loadHistory = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await api.rooms.history(token);
      if (res.data && Array.isArray(res.data)) {
        setHistory(res.data);
      }
    } catch (error) {
      console.error('Failed to load room history:', error);
      setSnackbar({ visible: true, message: 'Failed to load room history' });
    }
  }, [getIdToken]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Group Watch</Text>
        <Text style={styles.subtitle}>
          Create a room and decide what to watch with friends
        </Text>
      </View>

      <View style={styles.buttons}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('CreateRoom')}
          style={styles.button}
          contentStyle={{ paddingVertical: 4 }}
          icon={() => <Ionicons name="add-circle" size={20} color={colors.onPrimary} />}
        >
          Create
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('JoinRoom')}
          style={styles.button}
          contentStyle={{ paddingVertical: 4 }}
          icon={() => <Ionicons name="enter" size={20} color={colors.primary} />}
        >
          Join
        </Button>
      </View>

      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Rooms</Text>
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.historyRow}
                onPress={() => {
                  if (item.status === 'results') {
                    navigation.navigate('GroupResults', { roomCode: item.code });
                  } else {
                    navigation.navigate('Lobby', { roomCode: item.code });
                  }
                }}
              >
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? colors.textTertiary }]} />
                <View style={styles.historyInfo}>
                  <Text style={styles.roomCode}>{item.code}</Text>
                  <Text style={styles.historyMeta}>
                    {item.memberCount} members · {item.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
  historySection: {
    marginTop: spacing.xl,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  roomCode: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  historyMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
