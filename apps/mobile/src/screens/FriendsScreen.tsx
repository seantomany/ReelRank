import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, Avatar, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Friend {
  friendshipId: string;
  userId: string;
  displayName: string;
  username: string | null;
  photoUrl: string | null;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromPhotoUrl: string | null;
  createdAt: string;
}

interface SearchResult {
  id: string;
  displayName: string;
  username: string | null;
  photoUrl: string | null;
  email: string;
}

interface FriendsScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export function FriendsScreen({ navigation }: FriendsScreenProps) {
  const { getIdToken } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const loadData = useCallback(async () => {
    try {
      const token = await getIdToken();
      const [friendsRes, requestsRes] = await Promise.all([
        api.social.getFriends(token),
        api.social.getRequests(token),
      ]);
      if (friendsRes.data) setFriends(friendsRes.data as Friend[]);
      if (requestsRes.data) setRequests(requestsRes.data as FriendRequest[]);
    } catch (err) {
      console.error('Failed to load social data:', err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const token = await getIdToken();
        const res = await api.social.searchUsers(searchQuery, token);
        if (res.data) setSearchResults(res.data as SearchResult[]);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, getIdToken]);

  const handleSendRequest = async (userId: string) => {
    try {
      const token = await getIdToken();
      const res = await api.social.sendRequest(userId, token);
      if (res.error) {
        setSnackbar({ visible: true, message: res.error });
      } else if ((res.data as any)?.accepted) {
        setSnackbar({ visible: true, message: 'You are now friends!' });
        loadData();
      } else {
        setSnackbar({ visible: true, message: 'Friend request sent!' });
      }
      setSearchQuery('');
      setSearchResults([]);
    } catch {
      setSnackbar({ visible: true, message: 'Failed to send request' });
    }
  };

  const handleRequest = async (id: string, action: 'accept' | 'reject') => {
    try {
      const token = await getIdToken();
      await api.social.handleRequest(id, action, token);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (action === 'accept') {
        setSnackbar({ visible: true, message: 'Friend added!' });
        loadData();
      }
    } catch {
      setSnackbar({ visible: true, message: 'Failed to handle request' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Search by email or username..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.map((u) => (
            <View key={u.id} style={styles.searchRow}>
              <Avatar.Text size={36} label={u.displayName.charAt(0).toUpperCase()} />
              <View style={styles.searchInfo}>
                <Text style={styles.searchName}>{u.displayName}</Text>
                <Text style={styles.searchEmail}>{u.email}</Text>
              </View>
              <Button
                mode="contained"
                compact
                onPress={() => handleSendRequest(u.id)}
                style={styles.addButton}
                labelStyle={styles.addButtonLabel}
              >
                Add
              </Button>
            </View>
          ))}
        </View>
      )}

      {searching && <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />}

      <FlatList
        data={[
          ...(requests.length > 0 ? [{ type: 'header', id: 'req-header' }] : []),
          ...requests.map((r) => ({ type: 'request' as const, ...r })),
          { type: 'header', id: 'friends-header' },
          ...friends.map((f) => ({ type: 'friend' as const, ...f })),
        ] as any[]}
        keyExtractor={(item) => item.id ?? item.friendshipId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            const title = item.id === 'req-header' ? `Requests (${requests.length})` : `Friends (${friends.length})`;
            return <Text style={styles.listHeader}>{title}</Text>;
          }
          if (item.type === 'request') {
            return (
              <View style={styles.friendRow}>
                <Avatar.Text size={40} label={item.fromDisplayName?.charAt(0)?.toUpperCase() ?? '?'} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{item.fromDisplayName}</Text>
                  <Text style={styles.friendSub}>Wants to be friends</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity onPress={() => handleRequest(item.id, 'accept')} style={styles.acceptBtn}>
                    <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRequest(item.id, 'reject')} style={styles.rejectBtn}>
                    <Ionicons name="close" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
          return (
            <TouchableOpacity
              style={styles.friendRow}
              onPress={() => navigation.navigate('FriendProfile', { userId: item.userId })}
            >
              {item.photoUrl ? (
                <Avatar.Image size={40} source={{ uri: item.photoUrl }} />
              ) : (
                <Avatar.Text size={40} label={item.displayName?.charAt(0)?.toUpperCase() ?? '?'} />
              )}
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.displayName}</Text>
                {item.username && <Text style={styles.friendSub}>@{item.username}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No friends yet. Search to add some!</Text>
            </View>
          )
        }
      />

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
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    padding: 0,
  },
  searchResults: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  searchInfo: { flex: 1 },
  searchName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  searchEmail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  addButton: { backgroundColor: colors.primary },
  addButtonLabel: { fontSize: 12 },
  list: { paddingBottom: spacing.xxl },
  listHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  friendInfo: { flex: 1 },
  friendName: { color: colors.text, fontSize: 16, fontWeight: '500' },
  friendSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  acceptBtn: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
