import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface FeedItem {
  id: string;
  userId: string;
  movieId: number;
  rating: number | null;
  friend: { displayName: string; photoUrl: string | null };
  movie: { id: number; title: string; posterPath: string };
}

interface FriendActivityScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export function FriendActivityScreen({ navigation }: FriendActivityScreenProps) {
  const { getIdToken } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await api.social.feed(token);
      if (res.data && Array.isArray(res.data)) setFeed(res.data as FeedItem[]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (feed.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyText}>
          No activity yet. Add some friends to see what they're watching!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={feed}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      renderItem={({ item }) => {
        const poster = getPosterUrl(item.movie.posterPath, 'small');
        const initial = (item.friend.displayName ?? '?')[0]?.toUpperCase();
        return (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('MovieDetail', { movieId: item.movie.id })}
            activeOpacity={0.75}
          >
            {/* Friend avatar */}
            <View style={styles.avatar}>
              {item.friend.photoUrl ? (
                <OptimizedImage uri={item.friend.photoUrl} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>

            {/* Poster */}
            {poster && <OptimizedImage uri={poster} style={styles.poster} />}

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.friendName} numberOfLines={1}>
                {item.friend.displayName}
              </Text>
              <Text style={styles.movieTitle} numberOfLines={1}>
                watched {item.movie.title}
              </Text>
              {item.rating != null && (
                <Text style={styles.rating}>{item.rating}/10</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 32,
    height: 32,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.xs,
  },
  info: {
    flex: 1,
  },
  friendName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  movieTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rating: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
});
